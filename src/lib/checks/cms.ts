import * as cheerio from 'cheerio';
import { fixFor } from '../data/remediation';
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

/** Función pura: decide el hallazgo con la versión detectada y la última conocida. */
export function cmsFinding(cms: CmsDetection, latest: string | null): Finding {
  const evidence = { ...cms, latest };
  const named = cms.version ? `${cms.name} ${cms.version}` : cms.name;

  if (cms.name === 'WordPress' && cms.version && latest) {
    const behind = wordpressBranchesBehind(cms.version, latest);
    if (behind >= 2) {
      return {
        ...base,
        status: 'fail',
        title: `Tu web usa ${named}, una versión antigua`,
        detail: `La última es la ${latest}. Las versiones antiguas tienen fallos de seguridad conocidos y públicos, y los robots los buscan automáticamente.`,
        risk: 'WordPress desactualizado es la causa más común de webs de pymes hackeadas: spam, redirecciones a otras webs o robo de datos.',
        fix: fixFor('headers.cms'),
        evidence,
      };
    }
    if (behind === 1 || (behind === 0 && comparePatch(cms.version, latest) > 0)) {
      return {
        ...base,
        status: 'warning',
        title: `Hay una actualización de WordPress pendiente (${cms.version} → ${latest})`,
        detail:
          behind === 1
            ? `Usas ${named} y ya existe la ${latest}.`
            : `Usas ${named}; la ${latest} trae correcciones, normalmente de seguridad.`,
        risk: 'Las actualizaciones menores suelen corregir fallos de seguridad: cuanto antes, mejor.',
        fix: fixFor('headers.cms'),
        evidence,
      };
    }
  }
  if (cms.name === 'Drupal' && cms.version && Number(cms.version) < DRUPAL_SUPPORTED_MAJOR) {
    return {
      ...base,
      status: 'fail',
      title: `Tu web usa ${named}, que ya no recibe parches de seguridad`,
      detail: `Drupal ${cms.version} está fuera de soporte. Las versiones con soporte son la ${DRUPAL_SUPPORTED_MAJOR} y posteriores.`,
      risk: 'Los fallos que se descubran a partir de ahora no se corregirán.',
      fix: fixFor('headers.cms'),
      evidence,
    };
  }
  return {
    ...base,
    status: 'info',
    title: cms.version ? `Tu web muestra que usa ${named}` : `Tu web usa ${named}`,
    detail: cms.version
      ? `${latest && cms.name === 'WordPress' ? 'Está al día, pero l' : 'L'}a versión se ve en el código de la página (${cms.source}).`
      : `No se ve qué versión usa, así que no podemos saber si está al día.`,
    risk: cms.version
      ? 'Mostrar la versión ayuda a los atacantes a saber qué fallos probar cuando quede desactualizada.'
      : 'Mantén el núcleo, los plugins y el tema siempre actualizados: es la principal vía de ataque.',
    fix: fixFor('headers.cms_info'),
    evidence,
  };
}

export type CmsDeps = { fetch?: typeof safeFetch };

/** `null` si la web no usa un gestor de contenidos reconocible. */
export async function checkCms(home: SafeResponse, deps: CmsDeps = {}): Promise<Finding | null> {
  const cms = detectCms(home);
  if (!cms) return null;
  let latest: string | null = null;
  if (cms.name === 'WordPress' && cms.version) {
    // Si la API no responde, se informa sin juzgar la versión.
    latest = await latestWordPress(deps.fetch).catch(() => null);
  }
  return cmsFinding(cms, latest);
}
