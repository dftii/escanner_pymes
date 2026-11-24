import * as cheerio from 'cheerio';
import { fixFor } from '../data/remediation';
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

const list = (urls: string[], max = 3) =>
  urls.slice(0, max).join(', ') + (urls.length > max ? ` y ${urls.length - max} más` : '');

/** `null` si no hay páginas https que revisar (eso ya lo cubre `ssl.no_https`). */
export function mixedContentFinding(pages: readonly Page[]): Finding | null {
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
      title: 'Tu web carga scripts o estilos sin cifrar y el navegador los bloquea',
      detail: `Estas páginas seguras piden recursos por http://: ${list(scan.active)}. Chrome, Safari y Firefox los bloquean, así que parte de la web puede no funcionar o verse rota.`,
      risk: 'Además de romper la web, un script sin cifrar podría ser modificado por un tercero en una red wifi pública.',
      fix: fixFor('ssl.mixed_content'),
    };
  }
  if (scan.passive.length > 0) {
    return {
      ...base,
      status: 'warning',
      title: 'Tu web carga imágenes o vídeos sin cifrar',
      detail: `Recursos por http:// en páginas seguras: ${list(scan.passive)}. Algunos navegadores quitan el candado o no los muestran.`,
      risk: 'Los visitantes pueden ver la web como "no del todo segura", y esos archivos se pueden manipular por el camino.',
      fix: fixFor('ssl.mixed_content'),
    };
  }
  return {
    ...base,
    status: 'ok',
    title: 'Todo el contenido se carga de forma segura',
    detail: scan.upgraded
      ? `Hemos revisado ${scan.pages} ${scan.pages === 1 ? 'página' : 'páginas'}; la web pide al navegador que use siempre https ("upgrade-insecure-requests").`
      : `Hemos revisado ${scan.pages} ${scan.pages === 1 ? 'página' : 'páginas'} y no cargan nada por http://.`,
    risk: 'Sin problemas.',
    fix: [],
  };
}
