import { fixFor } from '../data/remediation';
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

const DATA_LABELS: Record<string, string> = {
  'Email addresses': 'emails',
  Passwords: 'contraseñas',
  Names: 'nombres',
  'Phone numbers': 'teléfonos',
  'Physical addresses': 'direcciones',
  'Dates of birth': 'fechas de nacimiento',
  'IP addresses': 'IPs',
  Usernames: 'nombres de usuario',
  'Credit cards': 'tarjetas',
  'Partial credit card data': 'datos parciales de tarjetas',
  'Bank account numbers': 'cuentas bancarias',
  'Government issued IDs': 'documentos de identidad',
  Genders: 'género',
  Purchases: 'compras',
};

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

const fmt = new Intl.NumberFormat('es-ES');

function describeBreach(b: Breach): string {
  const year = b.breachDate.slice(0, 4) || 'fecha desconocida';
  const data = b.dataClasses.map((d) => DATA_LABELS[d] ?? d.toLowerCase()).slice(0, 5);
  return `${b.title} (${year}, ${fmt.format(b.pwnCount)} cuentas${data.length ? `: ${data.join(', ')}` : ''})`;
}

/** Función pura: convierte las filtraciones en un hallazgo. */
export function breachesFinding(domain: string, breaches: readonly Breach[], now: Date): Finding {
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
      title: 'Tu web no aparece en filtraciones de datos conocidas',
      detail: `Have I Been Pwned no tiene registrada ninguna filtración pública con origen en ${domain}.`,
      risk: 'Solo recoge filtraciones que se han hecho públicas: no garantiza que nunca haya habido una.',
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
    title:
      verified.length === 1
        ? 'Tu web aparece en una filtración de datos pública'
        : `Tu web aparece en ${verified.length} filtraciones de datos públicas`,
    detail: `Según Have I Been Pwned: ${verified.map(describeBreach).join('; ')}.`,
    risk: `${passwords ? 'Se filtraron contraseñas: tus clientes pueden estar reutilizándolas en otros sitios. ' : ''}Los datos filtrados se usan para enviar phishing creíble en nombre de tu negocio.`,
    fix: fixFor('privacy.breaches'),
  };
}

export type BreachDeps = { fetch?: typeof safeFetch; now?: () => Date };

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
  return breachesFinding(name, parseBreaches(json), deps.now?.() ?? new Date());
}
