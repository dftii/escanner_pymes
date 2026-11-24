import { fixFor } from '../data/remediation';
import { LOCALE_TAGS, messages, type Locale } from '../i18n';
import { ScanError } from '../net/errors';
import { safeFetch } from '../net/safeFetch';
import type { Finding } from '../types';
import { emailDomainOf } from './emailDns';

/**
 * Filtraciones de datos conocidas de la propia web, según Have I Been Pwned.
 *
 * Usa el endpoint público `/breaches?domain=`, que no necesita clave ni
 * verificar el dominio: dice si el SITIO aparece como origen de una filtración
 * pública (p. ej. su base de datos de clientes), no qué emails concretos se
 * filtraron. Solo se envía el nombre del dominio.
 */
export const HIBP_BREACHES_URL = 'https://haveibeenpwned.com/api/v3/breaches';

/** Filtraciones de los últimos años: aún pueden estar usándose para fraudes. */
export const RECENT_YEARS = 3;

export type Breach = {
  name: string;
  title: string;
  /** Fecha de la filtración (AAAA-MM-DD). */
  breachDate: string;
  pwnCount: number;
  dataClasses: string[];
  isVerified: boolean;
};

/** Tipos de datos filtrados (HIBP los da en inglés). */
const DATA_LABELS: Record<string, { es: string; ca: string }> = {
  'Email addresses': { es: 'emails', ca: 'correus' },
  Passwords: { es: 'contraseñas', ca: 'contrasenyes' },
  Names: { es: 'nombres', ca: 'noms' },
  'Phone numbers': { es: 'teléfonos', ca: 'telèfons' },
  'Physical addresses': { es: 'direcciones', ca: 'adreces' },
  'Dates of birth': { es: 'fechas de nacimiento', ca: 'dates de naixement' },
  'IP addresses': { es: 'IPs', ca: 'IP' },
  Usernames: { es: 'nombres de usuario', ca: "noms d'usuari" },
  'Credit cards': { es: 'tarjetas', ca: 'targetes' },
  'Partial credit card data': {
    es: 'datos parciales de tarjetas',
    ca: 'dades parcials de targetes',
  },
  'Bank account numbers': { es: 'cuentas bancarias', ca: 'comptes bancaris' },
  'Government issued IDs': { es: 'documentos de identidad', ca: "documents d'identitat" },
  Genders: { es: 'género', ca: 'gènere' },
  Purchases: { es: 'compras', ca: 'compres' },
};

const dataLabel = (d: string, locale: Locale) =>
  locale === 'en' ? d.toLowerCase() : (DATA_LABELS[d]?.[locale] ?? d.toLowerCase());

export const MSG = messages({
  es: {
    unknownDate: 'fecha desconocida',
    accounts: (n: string) => `${n} cuentas`,
    okTitle: 'Tu web no aparece en filtraciones de datos conocidas',
    okDetail: (d: string) =>
      `Have I Been Pwned no tiene registrada ninguna filtración pública con origen en ${d}.`,
    okRisk:
      'Solo recoge filtraciones que se han hecho públicas: no garantiza que nunca haya habido una.',
    title: (n: number) =>
      n === 1
        ? 'Tu web aparece en una filtración de datos pública'
        : `Tu web aparece en ${n} filtraciones de datos públicas`,
    detail: (list: string) => `Según Have I Been Pwned: ${list}.`,
    passwords:
      'Se filtraron contraseñas: tus clientes pueden estar reutilizándolas en otros sitios. ',
    risk: 'Los datos filtrados se usan para enviar phishing creíble en nombre de tu negocio.',
  },
  ca: {
    unknownDate: 'data desconeguda',
    accounts: (n: string) => `${n} comptes`,
    okTitle: 'El teu web no apareix en filtracions de dades conegudes',
    okDetail: (d: string) =>
      `Have I Been Pwned no té registrada cap filtració pública originada a ${d}.`,
    okRisk:
      "Només recull filtracions que s'han fet públiques: no garanteix que no n'hi hagi hagut mai cap.",
    title: (n: number) =>
      n === 1
        ? 'El teu web apareix en una filtració de dades pública'
        : `El teu web apareix en ${n} filtracions de dades públiques`,
    detail: (list: string) => `Segons Have I Been Pwned: ${list}.`,
    passwords:
      'Es van filtrar contrasenyes: els teus clients poden estar reutilitzant-les en altres llocs. ',
    risk: 'Les dades filtrades es fan servir per enviar phishing creïble en nom del teu negoci.',
  },
  en: {
    unknownDate: 'unknown date',
    accounts: (n: string) => `${n} accounts`,
    okTitle: 'Your website does not appear in any known data breach',
    okDetail: (d: string) => `Have I Been Pwned has no public breach recorded for ${d}.`,
    okRisk:
      'It only covers breaches that have been made public: it does not guarantee there has never been one.',
    title: (n: number) =>
      n === 1
        ? 'Your website appears in a public data breach'
        : `Your website appears in ${n} public data breaches`,
    detail: (list: string) => `According to Have I Been Pwned: ${list}.`,
    passwords: 'Passwords were leaked: your customers may be reusing them on other sites. ',
    risk: 'Leaked data is used to send convincing phishing in your business’s name.',
  },
});

export function parseBreaches(json: unknown): Breach[] {
  if (!Array.isArray(json))
    throw new ScanError('network', 'Respuesta inesperada de Have I Been Pwned.', 502);
  return json.flatMap((b: Record<string, unknown>) =>
    typeof b?.Name === 'string'
      ? [
          {
            name: b.Name,
            title: typeof b.Title === 'string' ? b.Title : b.Name,
            breachDate: typeof b.BreachDate === 'string' ? b.BreachDate : '',
            pwnCount: typeof b.PwnCount === 'number' ? b.PwnCount : 0,
            dataClasses: Array.isArray(b.DataClasses)
              ? b.DataClasses.filter((d): d is string => typeof d === 'string')
              : [],
            isVerified: b.IsVerified !== false,
          },
        ]
      : [],
  );
}

function describeBreach(b: Breach, locale: Locale): string {
  const m = MSG[locale];
  const year = b.breachDate.slice(0, 4) || m.unknownDate;
  const data = b.dataClasses.map((d) => dataLabel(d, locale)).slice(0, 5);
  const count = m.accounts(new Intl.NumberFormat(LOCALE_TAGS[locale]).format(b.pwnCount));
  return `${b.title} (${year}, ${count}${data.length ? `: ${data.join(', ')}` : ''})`;
}

/** Función pura: convierte las filtraciones en un hallazgo. */
export function breachesFinding(
  domain: string,
  breaches: readonly Breach[],
  now: Date,
  locale: Locale = 'es',
): Finding {
  const m = MSG[locale];
  const base = {
    id: 'privacy.breaches',
    category: 'privacy' as const,
    evidence: { domain, source: 'haveibeenpwned.com', breaches },
  };
  const verified = breaches.filter((b) => b.isVerified);
  if (verified.length === 0) {
    return {
      ...base,
      status: 'ok',
      title: m.okTitle,
      detail: m.okDetail(domain),
      risk: m.okRisk,
      fix: [],
    };
  }
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RECENT_YEARS);
  const recent = verified.some((b) => new Date(b.breachDate) >= cutoff);
  const passwords = verified.some((b) => b.dataClasses.includes('Passwords'));
  return {
    ...base,
    status: recent ? 'warning' : 'info',
    title: m.title(verified.length),
    detail: m.detail(verified.map((b) => describeBreach(b, locale)).join('; ')),
    risk: `${passwords ? m.passwords : ''}${m.risk}`,
    fix: fixFor('privacy.breaches', locale),
  };
}

export type BreachDeps = { fetch?: typeof safeFetch; now?: () => Date; locale?: Locale };

export async function checkBreaches(domain: string, deps: BreachDeps = {}): Promise<Finding> {
  const name = emailDomainOf(domain);
  const fetcher = deps.fetch ?? safeFetch;
  const res = await fetcher(`${HIBP_BREACHES_URL}?domain=${encodeURIComponent(name)}`, {
    headers: { accept: 'application/json' },
    maxBytes: 512 * 1024,
  });
  if (res.status !== 200) {
    throw new ScanError('network', `Have I Been Pwned no ha respondido (HTTP ${res.status}).`, 502);
  }
  let json: unknown;
  try {
    json = JSON.parse(res.body);
  } catch {
    throw new ScanError('network', 'Respuesta inesperada de Have I Been Pwned.', 502);
  }
  return breachesFinding(name, parseBreaches(json), deps.now?.() ?? new Date(), deps.locale);
}
