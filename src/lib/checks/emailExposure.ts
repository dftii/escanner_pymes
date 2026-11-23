import { fixFor } from '../data/remediation';
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
export function analyzeEmailExposure(scanned: readonly SafeResponse[]): Finding {
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
      title:
        protectedCount > 0
          ? 'Tus direcciones de email están protegidas contra robots'
          : 'No hay direcciones de email visibles en tu web',
      detail:
        protectedCount > 0
          ? 'Las direcciones que muestras están ocultas para los robots que recogen emails.'
          : `Hemos revisado ${scanned.length} ${scanned.length === 1 ? 'página' : 'páginas'}. Recuerda que la LSSI obliga a mostrar un email de contacto en el aviso legal.`,
      risk: 'Sin problemas de exposición.',
      fix: [],
      evidence,
    };
  }

  const personal = list.filter((e) => !GENERIC_LOCAL.has(e.split('@')[0]!.replace(/[._-]/g, '')));
  const free = list.filter((e) => FREE_PROVIDERS.test(e));
  const worrying = personal.length > 0 || free.length > 0;

  const notes: string[] = [];
  if (personal.length > 0) {
    notes.push(
      `Parecen personales: ${personal.join(', ')}. Son las preferidas para el phishing dirigido.`,
    );
  }
  if (free.length > 0) {
    notes.push(
      `${free.join(', ')} ${free.length === 1 ? 'es' : 'son'} de un proveedor gratuito: no puedes protegerlas con SPF/DMARC de tu dominio y transmiten menos confianza.`,
    );
  }

  return {
    id: 'email.exposed',
    category: 'email',
    status: worrying ? 'warning' : 'info',
    title:
      list.length === 1
        ? 'Hay 1 dirección de email visible para robots'
        : `Hay ${list.length} direcciones de email visibles para robots`,
    detail: [
      `Se pueden leer en tu web: ${list.join(', ')}.`,
      ...notes,
      'La LSSI obliga a publicar un email de contacto: usa uno genérico (info@, contacto@) y ocúltalo a los robots.',
    ].join(' '),
    risk: 'Los robots recogen estas direcciones para enviar spam y emails falsos que se hacen pasar por proveedores o bancos.',
    fix: fixFor('email.exposed'),
    evidence,
  };
}
