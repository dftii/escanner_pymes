import * as cheerio from 'cheerio';

const EMAIL_RE =
  /[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}/gi;
/** Falsos positivos típicos: `logo@2x.png`, `bundle@1.2.3.js`… */
const FILE_TLD_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|map|woff2?|ttf|json)$/i;
const PLACEHOLDER_RE =
  /^(tu|your|nombre|name|usuario|user|email|correo)@|@(example|ejemplo|dominio|domain|email)\./i;

export type EmailScan = {
  /** Direcciones legibles en el texto o en enlaces `mailto:`. */
  emails: string[];
  /** Direcciones protegidas contra robots (p. ej. Cloudflare Email Protection). */
  protectedCount: number;
};

/** Busca direcciones de email visibles para un robot en el HTML. */
export function extractEmails(html: string): EmailScan {
  const $ = cheerio.load(html);
  const protectedCount = $('[data-cfemail], a[href*="/cdn-cgi/l/email-protection"]').length;
  $('script, style, noscript, template').remove();

  const found = new Set<string>();
  const add = (candidate: string) => {
    const email = decodeSafe(candidate).trim().toLowerCase();
    if (FILE_TLD_RE.test(email) || PLACEHOLDER_RE.test(email)) return;
    found.add(email);
  };

  $('a[href^="mailto:" i]').each((_, el) => {
    const address = ($(el).attr('href') ?? '').slice(7).split('?')[0] ?? '';
    for (const part of decodeSafe(address).split(',')) if (part.includes('@')) add(part);
  });
  // Cada nodo de texto por separado: `.text()` pegaría elementos contiguos
  // (`<a>Privacidad</a><p>info@…` → `privacidadinfo@…`).
  const texts: string[] = [];
  $.root()
    .find('*')
    .contents()
    .each((_, node) => {
      if (node.type === 'text') texts.push(node.data);
    });
  for (const match of texts.join(' ').matchAll(EMAIL_RE)) add(match[0]);

  return { emails: [...found].sort(), protectedCount };
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const INTERESTING_RE =
  /contact|contacto|aviso[-_ ]?legal|legal|privacidad|privacy|quienes[-_ ]?somos|sobre[-_ ]?nosotros|about|cookies/i;

/**
 * Enlaces internos que suelen contener datos de contacto (contacto, aviso
 * legal, privacidad…), del mismo sitio y sin repetir. Como mucho `max`.
 */
export function findContactPages(html: string, pageUrl: string, max = 3): string[] {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const site = base.hostname.replace(/^www\./, '');
  const pages = new Set<string>();

  $('a[href]').each((_, el) => {
    if (pages.size >= max) return false;
    const href = $(el).attr('href') ?? '';
    const text = $(el).text();
    if (!INTERESTING_RE.test(href) && !INTERESTING_RE.test(text)) return;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.hostname.replace(/^www\./, '') !== site) return;
    url.hash = '';
    if (url.href === base.href) return;
    pages.add(url.href);
  });
  return [...pages];
}

/** Enlaces que no son páginas de contenido: ficheros, zonas privadas o acciones. */
const SKIP_PATH_RE =
  /\.(pdf|jpe?g|png|gif|webp|svg|zip|rar|docx?|xlsx?|pptx?|mp[34]|mov|avi|xml|json|txt|css|js)$|\/(wp-admin|wp-login|admin|login|logout|signin|sign-in|register|registro|mi-cuenta|my-account|account|cuenta|cart|carrito|checkout|finalizar-compra|feed|wp-json|cdn-cgi)(\/|$)/i;

/**
 * Otras páginas internas de contenido (menú, servicios, tienda…) para revisar
 * scripts, cookies y formularios más allá de la home. Prioriza los enlaces de
 * `<nav>` y `<header>`, del mismo sitio, sin parámetros ni repetidos, y sin las
 * que ya estén en `exclude`. Como mucho `max`.
 */
export function findInternalPages(
  html: string,
  pageUrl: string,
  max = 4,
  exclude: readonly string[] = [],
): string[] {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const site = base.hostname.replace(/^www\./, '');
  const seen = new Set<string>([normalize(base), ...exclude.map((u) => normalize(new URL(u)))]);
  const pages: string[] = [];

  const links = [...$('nav a[href], header a[href]'), ...$('a[href]')];
  for (const el of links) {
    if (pages.length >= max) break;
    let url: URL;
    try {
      url = new URL($(el).attr('href') ?? '', base);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
    if (url.hostname.replace(/^www\./, '') !== site) continue;
    if (url.search || SKIP_PATH_RE.test(url.pathname)) continue;
    url.hash = '';
    const key = normalize(url);
    if (seen.has(key)) continue;
    seen.add(key);
    pages.push(url.href);
  }
  return pages;
}

/** Misma página aunque cambie `www.`, el esquema o la barra final. */
function normalize(url: URL): string {
  return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`;
}
