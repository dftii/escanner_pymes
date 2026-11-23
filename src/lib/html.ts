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
