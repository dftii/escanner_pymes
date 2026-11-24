import * as cheerio from 'cheerio';
import { fixFor } from '../data/remediation';
import { messages, type Locale } from '../i18n';
import type { SafeResponse } from '../net/safeFetch';
import type { Finding } from '../types';

type Page = Pick<SafeResponse, 'url' | 'body' | 'headers'>;

/**
 * Recursos que se piden por `http://` dentro de una página `https://`.
 * - Activos (scripts, hojas de estilo, iframes…): el navegador los BLOQUEA,
 *   así que algo de la web deja de funcionar o se ve roto.
 * - Pasivos (imágenes, vídeo, audio): se cargan con aviso o se mejoran a https,
 *   y el candado deja de verse "seguro" en algunos navegadores.
 */
const ACTIVE: ReadonlyArray<[string, string]> = [
  ['script[src]', 'src'],
  ['link[rel~="stylesheet"][href]', 'href'],
  ['iframe[src]', 'src'],
  ['frame[src]', 'src'],
  ['object[data]', 'data'],
  ['embed[src]', 'src'],
];
const PASSIVE: ReadonlyArray<[string, string]> = [
  ['img[src]', 'src'],
  ['video[src]', 'src'],
  ['video[poster]', 'poster'],
  ['audio[src]', 'src'],
  ['source[src]', 'src'],
];
const SRCSET = ['img[srcset]', 'source[srcset]'];

const isHttp = (value: string | undefined) => !!value && /^\s*http:\/\//i.test(value);

/** `upgrade-insecure-requests` en la CSP (cabecera o meta): el navegador pide todo por https. */
function upgrades(page: Page, $: cheerio.CheerioAPI): boolean {
  const header = page.headers.get('content-security-policy') ?? '';
  const meta = $('meta[http-equiv="Content-Security-Policy" i]').attr('content') ?? '';
  return /upgrade-insecure-requests/i.test(`${header};${meta}`);
}

export type MixedContentScan = {
  active: string[];
  passive: string[];
  /** Páginas https revisadas. */
  pages: number;
  /** Alguna página pide al navegador que mejore las peticiones a https. */
  upgraded: boolean;
};

export function scanMixedContent(pages: readonly Page[]): MixedContentScan {
  const active = new Set<string>();
  const passive = new Set<string>();
  let count = 0;
  let upgraded = false;
  for (const page of pages) {
    if (!page.url.startsWith('https://')) continue;
    count++;
    const $ = cheerio.load(page.body);
    if (upgrades(page, $)) {
      upgraded = true;
      continue;
    }
    for (const [selector, attr] of ACTIVE) {
      $(selector).each((_, el) => {
        const v = $(el).attr(attr);
        if (isHttp(v)) active.add(v!.trim());
      });
    }
    for (const [selector, attr] of PASSIVE) {
      $(selector).each((_, el) => {
        const v = $(el).attr(attr);
        if (isHttp(v)) passive.add(v!.trim());
      });
    }
    for (const selector of SRCSET) {
      $(selector).each((_, el) => {
        for (const candidate of ($(el).attr('srcset') ?? '').split(',')) {
          const url = candidate.trim().split(/\s+/)[0];
          if (isHttp(url)) passive.add(url!);
        }
      });
    }
  }
  return { active: [...active], passive: [...passive], pages: count, upgraded };
}

export const MSG = messages({
  es: {
    more: (n: number) => ` y ${n} más`,
    activeTitle: 'Tu web carga scripts o estilos sin cifrar y el navegador los bloquea',
    activeDetail: (list: string) =>
      `Estas páginas seguras piden recursos por http://: ${list}. Chrome, Safari y Firefox los bloquean, así que parte de la web puede no funcionar o verse rota.`,
    activeRisk:
      'Además de romper la web, un script sin cifrar podría ser modificado por un tercero en una red wifi pública.',
    passiveTitle: 'Tu web carga imágenes o vídeos sin cifrar',
    passiveDetail: (list: string) =>
      `Recursos por http:// en páginas seguras: ${list}. Algunos navegadores quitan el candado o no los muestran.`,
    passiveRisk:
      'Los visitantes pueden ver la web como "no del todo segura", y esos archivos se pueden manipular por el camino.',
    okTitle: 'Todo el contenido se carga de forma segura',
    okUpgraded: (n: number) =>
      `Hemos revisado ${n} ${n === 1 ? 'página' : 'páginas'}; la web pide al navegador que use siempre https ("upgrade-insecure-requests").`,
    okDetail: (n: number) =>
      `Hemos revisado ${n} ${n === 1 ? 'página' : 'páginas'} y no cargan nada por http://.`,
    noProblems: 'Sin problemas.',
  },
  ca: {
    more: (n: number) => ` i ${n} més`,
    activeTitle: 'El teu web carrega scripts o estils sense xifrar i el navegador els bloqueja',
    activeDetail: (list: string) =>
      `Aquestes pàgines segures demanen recursos per http://: ${list}. Chrome, Safari i Firefox els bloquegen, així que una part del web pot no funcionar o veure's trencada.`,
    activeRisk:
      'A més de trencar el web, un script sense xifrar el podria modificar un tercer en una xarxa wifi pública.',
    passiveTitle: 'El teu web carrega imatges o vídeos sense xifrar',
    passiveDetail: (list: string) =>
      `Recursos per http:// en pàgines segures: ${list}. Alguns navegadors treuen el cadenat o no els mostren.`,
    passiveRisk:
      'Els visitants poden veure el web com a "no del tot segur", i aquests fitxers es poden manipular pel camí.',
    okTitle: 'Tot el contingut es carrega de manera segura',
    okUpgraded: (n: number) =>
      `Hem revisat ${n} ${n === 1 ? 'pàgina' : 'pàgines'}; el web demana al navegador que faci servir sempre https ("upgrade-insecure-requests").`,
    okDetail: (n: number) =>
      `Hem revisat ${n} ${n === 1 ? 'pàgina' : 'pàgines'} i no carreguen res per http://.`,
    noProblems: 'Cap problema.',
  },
  en: {
    more: (n: number) => ` and ${n} more`,
    activeTitle: 'Your website loads unencrypted scripts or styles and the browser blocks them',
    activeDetail: (list: string) =>
      `These secure pages request resources over http://: ${list}. Chrome, Safari and Firefox block them, so parts of the website may not work or look broken.`,
    activeRisk:
      'Besides breaking the website, an unencrypted script could be altered by a third party on public wifi.',
    passiveTitle: 'Your website loads unencrypted images or videos',
    passiveDetail: (list: string) =>
      `Resources over http:// on secure pages: ${list}. Some browsers remove the padlock or do not show them.`,
    passiveRisk:
      'Visitors may see the website as "not fully secure", and those files can be tampered with on the way.',
    okTitle: 'All content is loaded securely',
    okUpgraded: (n: number) =>
      `We checked ${n} ${n === 1 ? 'page' : 'pages'}; the website tells the browser to always use https ("upgrade-insecure-requests").`,
    okDetail: (n: number) =>
      `We checked ${n} ${n === 1 ? 'page' : 'pages'} and they load nothing over http://.`,
    noProblems: 'No problems.',
  },
});

const list = (urls: string[], more: (n: number) => string, max = 3) =>
  urls.slice(0, max).join(', ') + (urls.length > max ? more(urls.length - max) : '');

/** `null` si no hay páginas https que revisar (eso ya lo cubre `ssl.no_https`). */
export function mixedContentFinding(pages: readonly Page[], locale: Locale = 'es'): Finding | null {
  const m = MSG[locale];
  const scan = scanMixedContent(pages);
  if (scan.pages === 0) return null;
  const base = {
    id: 'ssl.mixed_content',
    category: 'ssl' as const,
    evidence: {
      active: scan.active.slice(0, 20),
      passive: scan.passive.slice(0, 20),
      pages: scan.pages,
    },
  };
  if (scan.active.length > 0) {
    return {
      ...base,
      status: 'fail',
      title: m.activeTitle,
      detail: m.activeDetail(list(scan.active, m.more)),
      risk: m.activeRisk,
      fix: fixFor('ssl.mixed_content', locale),
    };
  }
  if (scan.passive.length > 0) {
    return {
      ...base,
      status: 'warning',
      title: m.passiveTitle,
      detail: m.passiveDetail(list(scan.passive, m.more)),
      risk: m.passiveRisk,
      fix: fixFor('ssl.mixed_content', locale),
    };
  }
  return {
    ...base,
    status: 'ok',
    title: m.okTitle,
    detail: scan.upgraded ? m.okUpgraded(scan.pages) : m.okDetail(scan.pages),
    risk: m.noProblems,
    fix: [],
  };
}
