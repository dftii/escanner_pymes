import { fixFor } from '../data/remediation';
import { messages, type Locale } from '../i18n';

export const MSG = messages({
  es: {
    protectedTitle: 'Tus direcciones de email están protegidas contra robots',
    noneTitle: 'No hay direcciones de email visibles en tu web',
    protectedDetail:
      'Las direcciones que muestras están ocultas para los robots que recogen emails.',
    noneDetail: (n: number) =>
      `Hemos revisado ${n} ${n === 1 ? 'página' : 'páginas'}. Recuerda que la LSSI obliga a mostrar un email de contacto en el aviso legal.`,
    noneRisk: 'Sin problemas de exposición.',
    personal: (list: string) =>
      `Parecen personales: ${list}. Son las preferidas para el phishing dirigido.`,
    free: (list: string, n: number) =>
      `${list} ${n === 1 ? 'es' : 'son'} de un proveedor gratuito: no puedes protegerlas con SPF/DMARC de tu dominio y transmiten menos confianza.`,
    title: (n: number) =>
      n === 1
        ? 'Hay 1 dirección de email visible para robots'
        : `Hay ${n} direcciones de email visibles para robots`,
    visible: (list: string) => `Se pueden leer en tu web: ${list}.`,
    lssi: 'La LSSI obliga a publicar un email de contacto: usa uno genérico (info@, contacto@) y ocúltalo a los robots.',
    risk: 'Los robots recogen estas direcciones para enviar spam y emails falsos que se hacen pasar por proveedores o bancos.',
  },
  ca: {
    protectedTitle: 'Les teves adreces de correu estan protegides contra robots',
    noneTitle: 'No hi ha adreces de correu visibles al teu web',
    protectedDetail: 'Les adreces que mostres estan amagades per als robots que recullen correus.',
    noneDetail: (n: number) =>
      `Hem revisat ${n} ${n === 1 ? 'pàgina' : 'pàgines'}. Recorda que la LSSI obliga a mostrar un correu de contacte a l'avís legal.`,
    noneRisk: "Cap problema d'exposició.",
    personal: (list: string) =>
      `Semblen personals: ${list}. Són les preferides per al phishing dirigit.`,
    free: (list: string, n: number) =>
      `${list} ${n === 1 ? 'és' : 'són'} d'un proveïdor gratuït: no les pots protegir amb l'SPF/DMARC del teu domini i transmeten menys confiança.`,
    title: (n: number) =>
      n === 1
        ? 'Hi ha 1 adreça de correu visible per als robots'
        : `Hi ha ${n} adreces de correu visibles per als robots`,
    visible: (list: string) => `Es poden llegir al teu web: ${list}.`,
    lssi: "La LSSI obliga a publicar un correu de contacte: fes-ne servir un de genèric (info@, contacte@) i amaga'l als robots.",
    risk: 'Els robots recullen aquestes adreces per enviar correu brossa i correus falsos que es fan passar per proveïdors o bancs.',
  },
  en: {
    protectedTitle: 'Your email addresses are protected from robots',
    noneTitle: 'There are no email addresses visible on your website',
    protectedDetail: 'The addresses you show are hidden from robots that harvest emails.',
    noneDetail: (n: number) =>
      `We checked ${n} ${n === 1 ? 'page' : 'pages'}. Remember that Spanish law (LSSI) requires a contact email in the legal notice.`,
    noneRisk: 'No exposure problems.',
    personal: (list: string) =>
      `These look personal: ${list}. They are the favourite targets for spear phishing.`,
    free: (list: string, n: number) =>
      `${list} ${n === 1 ? 'is' : 'are'} on a free provider: you cannot protect ${n === 1 ? 'it' : 'them'} with your domain's SPF/DMARC and ${n === 1 ? 'it looks' : 'they look'} less trustworthy.`,
    title: (n: number) =>
      n === 1
        ? '1 email address is visible to robots'
        : `${n} email addresses are visible to robots`,
    visible: (list: string) => `They can be read on your website: ${list}.`,
    lssi: 'Spanish law (LSSI) requires a published contact email: use a generic one (info@, contact@) and hide it from robots.',
    risk: 'Robots harvest these addresses to send spam and fake emails pretending to be suppliers or banks.',
  },
});
import { extractEmails, findContactPages, findInternalPages } from '../html';
import { safeFetch, type SafeResponse } from '../net/safeFetch';
import type { Finding } from '../types';

/** Buzones genéricos: lo esperable en una web de empresa. */
const GENERIC_LOCAL = new Set([
  'info',
  'informacion',
  'contacto',
  'contact',
  'hola',
  'hello',
  'admin',
  'administracion',
  'reservas',
  'pedidos',
  'ventas',
  'comercial',
  'atencion',
  'atencionalcliente',
  'clientes',
  'soporte',
  'support',
  'oficina',
  'privacidad',
  'privacy',
  'rgpd',
  'dpo',
  'lopd',
  'legal',
  'facturacion',
  'empleo',
  'rrhh',
  'citas',
  'tienda',
  'shop',
  'web',
]);

const FREE_PROVIDERS =
  /@(gmail|googlemail|hotmail|outlook|live|yahoo|ymail|icloud|me|aol|gmx|protonmail|proton)\.[a-z.]+$/i;

export type ExposureDeps = { fetch?: typeof safeFetch };

/**
 * Emails que un robot puede leer en la home y en las páginas que devuelve
 * `fetchRelatedPages`.
 */
export async function checkEmailExposure(
  home: SafeResponse,
  deps: ExposureDeps = {},
): Promise<Finding> {
  return analyzeEmailExposure(await fetchRelatedPages(home, deps.fetch));
}

/** Páginas extra que se revisan además de la home. */
export const EXTRA_PAGES = { contact: 3, content: 4 } as const;

/**
 * La home, hasta 3 páginas de contacto, aviso legal o privacidad y hasta 4
 * páginas de contenido del menú (8 como mucho). Las que fallan se omiten.
 * Lo comparten los checks de correo y RGPD.
 */
export async function fetchRelatedPages(
  home: SafeResponse,
  fetcher: typeof safeFetch = safeFetch,
): Promise<SafeResponse[]> {
  const contact = findContactPages(home.body, home.url, EXTRA_PAGES.contact);
  const extra = [
    ...contact,
    ...findInternalPages(home.body, home.url, EXTRA_PAGES.content, contact),
  ];
  const pages = await Promise.allSettled(
    extra.map((url) => fetcher(url, { acceptInvalidCert: true, maxBytes: 1024 * 1024 })),
  );
  return [home, ...pages.flatMap((p) => (p.status === 'fulfilled' ? [p.value] : []))];
}

/** Emails visibles en las páginas ya descargadas. Función pura. */
export function analyzeEmailExposure(
  scanned: readonly SafeResponse[],
  locale: Locale = 'es',
): Finding {
  const m = MSG[locale];
  const emails = new Set<string>();
  const where: Record<string, string[]> = {};
  let protectedCount = 0;
  for (const page of scanned) {
    const result = extractEmails(page.body);
    protectedCount += result.protectedCount;
    for (const email of result.emails) {
      emails.add(email);
      (where[email] ??= []).push(new URL(page.url).pathname);
    }
  }

  const list = [...emails].sort();
  const evidence = { emails: where, pagesScanned: scanned.map((p) => p.url), protectedCount };

  if (list.length === 0) {
    return {
      id: 'email.exposed',
      category: 'email',
      status: protectedCount > 0 ? 'ok' : 'info',
      title: protectedCount > 0 ? m.protectedTitle : m.noneTitle,
      detail: protectedCount > 0 ? m.protectedDetail : m.noneDetail(scanned.length),
      risk: m.noneRisk,
      fix: [],
      evidence,
    };
  }

  const personal = list.filter((e) => !GENERIC_LOCAL.has(e.split('@')[0]!.replace(/[._-]/g, '')));
  const free = list.filter((e) => FREE_PROVIDERS.test(e));
  const worrying = personal.length > 0 || free.length > 0;

  const notes: string[] = [];
  if (personal.length > 0) {
    notes.push(m.personal(personal.join(', ')));
  }
  if (free.length > 0) {
    notes.push(m.free(free.join(', '), free.length));
  }

  return {
    id: 'email.exposed',
    category: 'email',
    status: worrying ? 'warning' : 'info',
    title: m.title(list.length),
    detail: [m.visible(list.join(', ')), ...notes, m.lssi].join(' '),
    risk: m.risk,
    fix: fixFor('email.exposed', locale),
    evidence,
  };
}
