import * as cheerio from 'cheerio';
import { fixFor } from '../data/remediation';
import { messages, type Locale } from '../i18n';
import { ScanError } from '../net/errors';
import { safeFetch, type SafeResponse } from '../net/safeFetch';
import type { Finding } from '../types';

/**
 * Gestor de contenidos (WordPress, Joomla, Drupal) y su versión, a partir de
 * lo que la página de inicio ya muestra: la etiqueta `<meta name="generator">`,
 * la cabecera `X-Generator` y las rutas `?ver=` de los archivos de WordPress.
 * No se pide ninguna ruta extra a la web analizada.
 */

export type CmsName = 'WordPress' | 'Joomla' | 'Drupal';

export type CmsDetection = { name: CmsName; version: string | null; source: string };

type Page = Pick<SafeResponse, 'body' | 'headers'>;

const VERSION = /(\d+(?:\.\d+){0,2})/;

export function detectCms(page: Page): CmsDetection | null {
  const $ = cheerio.load(page.body);
  const generators = [
    ...$('meta[name="generator" i]')
      .map((_, el) => $(el).attr('content') ?? '')
      .get(),
    page.headers.get('x-generator') ?? '',
  ].filter(Boolean);

  for (const g of generators) {
    const wp = /^WordPress\s+(\d+(?:\.\d+){1,2})/i.exec(g);
    if (wp) return { name: 'WordPress', version: wp[1]!, source: `generator: ${g}` };
  }
  for (const g of generators) {
    if (/^WordPress\b/i.test(g))
      return { name: 'WordPress', version: null, source: `generator: ${g}` };
    const drupal = /^Drupal\s+(\d+)/i.exec(g);
    if (drupal) return { name: 'Drupal', version: drupal[1]!, source: `generator: ${g}` };
    if (/^Joomla!?/i.test(g)) {
      const v = VERSION.exec(g.replace(/^Joomla!?\s*-?\s*/i, ''));
      return { name: 'Joomla', version: v?.[1] ?? null, source: `generator: ${g}` };
    }
  }

  // WordPress sin meta generator: sus archivos llevan la versión en "?ver=".
  const coreVersions = new Map<string, number>();
  $('script[src*="/wp-includes/"], link[href*="/wp-includes/"]').each((_, el) => {
    const url = $(el).attr('src') ?? $(el).attr('href') ?? '';
    // jQuery y otras librerías llevan su propia versión, no la de WordPress.
    if (/\/(jquery|tinymce|codemirror)[/.-]/i.test(url)) return;
    const v = /[?&]ver=(\d+\.\d+(?:\.\d+)?)(?:&|$)/.exec(url)?.[1];
    if (v) coreVersions.set(v, (coreVersions.get(v) ?? 0) + 1);
  });
  if (coreVersions.size > 0) {
    // La más repetida: algunos archivos llevan la versión de una librería, no la de WordPress.
    const [version] = [...coreVersions.entries()].sort((a, b) => b[1] - a[1])[0]!;
    return { name: 'WordPress', version, source: 'rutas /wp-includes/ con ?ver=' };
  }
  if (/\/wp-content\/|\/wp-includes\//.test(page.body)) {
    return { name: 'WordPress', version: null, source: 'rutas /wp-content/' };
  }
  return null;
}

const parts = (v: string) => v.split('.').map((n) => Number(n) || 0);

/** WordPress numera las ramas X.Y (6.8, 6.9, 7.0): cuántas ramas van por detrás. */
export function wordpressBranchesBehind(version: string, latest: string): number {
  const [a = 0, b = 0] = parts(version);
  const [c = 0, d = 0] = parts(latest);
  return c * 10 + d - (a * 10 + b);
}

const comparePatch = (version: string, latest: string) => {
  const [, , p = 0] = parts(version);
  const [, , q = 0] = parts(latest);
  return q - p;
};

export const WORDPRESS_VERSION_API = 'https://api.wordpress.org/core/version-check/1.7/';
/** Versiones de Drupal con soporte de seguridad. */
export const DRUPAL_SUPPORTED_MAJOR = 10;

let cache: { version: string; at: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

/** Última versión de WordPress según la API oficial (con caché de 6 horas). */
export async function latestWordPress(fetcher: typeof safeFetch = safeFetch, now = Date.now()) {
  if (cache && now - cache.at < CACHE_MS) return cache.version;
  const res = await fetcher(WORDPRESS_VERSION_API, { maxBytes: 256 * 1024 });
  if (res.status !== 200) {
    throw new ScanError(
      'network',
      `La API de WordPress no ha respondido (HTTP ${res.status}).`,
      502,
    );
  }
  const version = (JSON.parse(res.body) as { offers?: Array<{ current?: unknown }> }).offers?.[0]
    ?.current;
  if (typeof version !== 'string' || !/^\d+\.\d+/.test(version)) {
    throw new ScanError('network', 'Respuesta inesperada de la API de WordPress.', 502);
  }
  cache = { version, at: now };
  return version;
}

/** Solo para tests. */
export const resetWordPressCache = () => {
  cache = null;
};

const base = { id: 'headers.cms', category: 'headers' as const };

export const MSG = messages({
  es: {
    oldTitle: (n: string) => `Tu web usa ${n}, una versión antigua`,
    oldDetail: (latest: string) =>
      `La última es la ${latest}. Las versiones antiguas tienen fallos de seguridad conocidos y públicos, y los robots los buscan automáticamente.`,
    oldRisk:
      'WordPress desactualizado es la causa más común de webs de pymes hackeadas: spam, redirecciones a otras webs o robo de datos.',
    updateTitle: (v: string, latest: string) =>
      `Hay una actualización de WordPress pendiente (${v} → ${latest})`,
    branchDetail: (n: string, latest: string) => `Usas ${n} y ya existe la ${latest}.`,
    patchDetail: (n: string, latest: string) =>
      `Usas ${n}; la ${latest} trae correcciones, normalmente de seguridad.`,
    updateRisk:
      'Las actualizaciones menores suelen corregir fallos de seguridad: cuanto antes, mejor.',
    drupalTitle: (n: string) => `Tu web usa ${n}, que ya no recibe parches de seguridad`,
    drupalDetail: (v: string, min: number) =>
      `Drupal ${v} está fuera de soporte. Las versiones con soporte son la ${min} y posteriores.`,
    drupalRisk: 'Los fallos que se descubran a partir de ahora no se corregirán.',
    showsTitle: (n: string) => `Tu web muestra que usa ${n}`,
    usesTitle: (n: string) => `Tu web usa ${n}`,
    upToDateVisible: (source: string) =>
      `Está al día, pero la versión se ve en el código de la página (${source}).`,
    visible: (source: string) => `La versión se ve en el código de la página (${source}).`,
    hidden: 'No se ve qué versión usa, así que no podemos saber si está al día.',
    visibleRisk:
      'Mostrar la versión ayuda a los atacantes a saber qué fallos probar cuando quede desactualizada.',
    hiddenRisk:
      'Mantén el núcleo, los plugins y el tema siempre actualizados: es la principal vía de ataque.',
  },
  ca: {
    oldTitle: (n: string) => `El teu web fa servir ${n}, una versió antiga`,
    oldDetail: (latest: string) =>
      `L'última és la ${latest}. Les versions antigues tenen errors de seguretat coneguts i públics, i els robots els busquen automàticament.`,
    oldRisk:
      'Un WordPress desactualitzat és la causa més habitual de webs de pimes piratejats: correu brossa, redireccions a altres webs o robatori de dades.',
    updateTitle: (v: string, latest: string) =>
      `Hi ha una actualització de WordPress pendent (${v} → ${latest})`,
    branchDetail: (n: string, latest: string) => `Fas servir ${n} i ja existeix la ${latest}.`,
    patchDetail: (n: string, latest: string) =>
      `Fas servir ${n}; la ${latest} porta correccions, normalment de seguretat.`,
    updateRisk:
      'Les actualitzacions menors solen corregir errors de seguretat: com més aviat, millor.',
    drupalTitle: (n: string) => `El teu web fa servir ${n}, que ja no rep pedaços de seguretat`,
    drupalDetail: (v: string, min: number) =>
      `Drupal ${v} està fora de suport. Les versions amb suport són la ${min} i posteriors.`,
    drupalRisk: "Els errors que es descobreixin a partir d'ara no es corregiran.",
    showsTitle: (n: string) => `El teu web mostra que fa servir ${n}`,
    usesTitle: (n: string) => `El teu web fa servir ${n}`,
    upToDateVisible: (source: string) =>
      `Està al dia, però la versió es veu al codi de la pàgina (${source}).`,
    visible: (source: string) => `La versió es veu al codi de la pàgina (${source}).`,
    hidden: 'No es veu quina versió fa servir, així que no podem saber si està al dia.',
    visibleRisk:
      'Mostrar la versió ajuda els atacants a saber quins errors provar quan quedi desactualitzada.',
    hiddenRisk:
      "Mantén el nucli, els plugins i el tema sempre actualitzats: és la principal via d'atac.",
  },
  en: {
    oldTitle: (n: string) => `Your website uses ${n}, an old version`,
    oldDetail: (latest: string) =>
      `The latest is ${latest}. Old versions have known, public security flaws, and robots look for them automatically.`,
    oldRisk:
      'Outdated WordPress is the most common reason small business websites get hacked: spam, redirects to other sites or data theft.',
    updateTitle: (v: string, latest: string) => `A WordPress update is pending (${v} → ${latest})`,
    branchDetail: (n: string, latest: string) => `You use ${n} and ${latest} is already out.`,
    patchDetail: (n: string, latest: string) =>
      `You use ${n}; ${latest} brings fixes, usually security ones.`,
    updateRisk: 'Minor updates usually fix security flaws: the sooner, the better.',
    drupalTitle: (n: string) => `Your website uses ${n}, which no longer gets security patches`,
    drupalDetail: (v: string, min: number) =>
      `Drupal ${v} is out of support. Supported versions are ${min} and later.`,
    drupalRisk: 'Flaws discovered from now on will not be fixed.',
    showsTitle: (n: string) => `Your website shows that it uses ${n}`,
    usesTitle: (n: string) => `Your website uses ${n}`,
    upToDateVisible: (source: string) =>
      `It is up to date, but the version can be seen in the page code (${source}).`,
    visible: (source: string) => `The version can be seen in the page code (${source}).`,
    hidden: 'We cannot see which version it uses, so we cannot tell whether it is up to date.',
    visibleRisk:
      'Showing the version helps attackers know which flaws to try once it goes out of date.',
    hiddenRisk:
      'Keep the core, plugins and theme always up to date: they are the main way in for attackers.',
  },
});

/** Función pura: decide el hallazgo con la versión detectada y la última conocida. */
export function cmsFinding(
  cms: CmsDetection,
  latest: string | null,
  locale: Locale = 'es',
): Finding {
  const m = MSG[locale];
  const evidence = { ...cms, latest };
  const named = cms.version ? `${cms.name} ${cms.version}` : cms.name;

  if (cms.name === 'WordPress' && cms.version && latest) {
    const behind = wordpressBranchesBehind(cms.version, latest);
    if (behind >= 2) {
      return {
        ...base,
        status: 'fail',
        title: m.oldTitle(named),
        detail: m.oldDetail(latest),
        risk: m.oldRisk,
        fix: fixFor('headers.cms', locale),
        evidence,
      };
    }
    if (behind === 1 || (behind === 0 && comparePatch(cms.version, latest) > 0)) {
      return {
        ...base,
        status: 'warning',
        title: m.updateTitle(cms.version, latest),
        detail: behind === 1 ? m.branchDetail(named, latest) : m.patchDetail(named, latest),
        risk: m.updateRisk,
        fix: fixFor('headers.cms', locale),
        evidence,
      };
    }
  }
  if (cms.name === 'Drupal' && cms.version && Number(cms.version) < DRUPAL_SUPPORTED_MAJOR) {
    return {
      ...base,
      status: 'fail',
      title: m.drupalTitle(named),
      detail: m.drupalDetail(cms.version, DRUPAL_SUPPORTED_MAJOR),
      risk: m.drupalRisk,
      fix: fixFor('headers.cms', locale),
      evidence,
    };
  }
  return {
    ...base,
    status: 'info',
    title: cms.version ? m.showsTitle(named) : m.usesTitle(named),
    detail: cms.version
      ? latest && cms.name === 'WordPress'
        ? m.upToDateVisible(cms.source)
        : m.visible(cms.source)
      : m.hidden,
    risk: cms.version ? m.visibleRisk : m.hiddenRisk,
    fix: fixFor('headers.cms_info', locale),
    evidence,
  };
}

export type CmsDeps = { fetch?: typeof safeFetch; locale?: Locale };

/** `null` si la web no usa un gestor de contenidos reconocible. */
export async function checkCms(home: SafeResponse, deps: CmsDeps = {}): Promise<Finding | null> {
  const cms = detectCms(home);
  if (!cms) return null;
  let latest: string | null = null;
  if (cms.name === 'WordPress' && cms.version) {
    // Si la API no responde, se informa sin juzgar la versión.
    latest = await latestWordPress(deps.fetch).catch(() => null);
  }
  return cmsFinding(cms, latest, deps.locale);
}
