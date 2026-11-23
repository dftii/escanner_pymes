import type { MxRecord } from 'node:dns';
import { fixFor } from '../data/remediation';
import { errorFinding } from '../findings';
import { createDnsClient, mxRecords, txtRecords, type DnsClient } from '../net/dnsClient';
import { organizationalDomain } from '../net/domain';
import type { Finding } from '../types';

const base = { category: 'email' } as const;

/** Selectores DKIM habituales (Google, Microsoft 365, cPanel, Mailchimp, Zoho…). */
export const DKIM_SELECTORS = [
  'default',
  'google',
  'selector1',
  'selector2',
  'k1',
  'k2',
  'mail',
  'dkim',
  's1',
  's2',
  'zoho',
  'smtp',
  'mxvault',
] as const;

/** Límite del estándar SPF (RFC 7208 §4.6.4). */
export const SPF_MAX_LOOKUPS = 10;

/** El dominio del correo suele ser el principal, sin `www.`. */
export const emailDomainOf = (domain: string) => domain.replace(/^www\./, '');

/**
 * Correo y suplantación: MX, SPF, DMARC y DKIM.
 * Cada parte va por separado: si una consulta DNS falla, el resto sigue.
 */
export async function checkEmailDns(
  domain: string,
  dns: DnsClient = createDnsClient(),
): Promise<Finding[]> {
  const name = emailDomainOf(domain);
  const mx = mxRecords(dns, name);
  const results = await Promise.allSettled([
    mx.then((records) => mxFinding(name, records)),
    checkSpf(name, dns, mx),
    checkDmarc(name, dns),
    checkDkim(name, dns),
  ]);
  const ids = ['email.mx', 'email.spf', 'email.dmarc', 'email.dkim'];
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : errorFinding(ids[i]!, 'email', r.reason),
  );
}

// ─── MX ──────────────────────────────────────────────────────────────────────

const PROVIDERS: ReadonlyArray<[RegExp, string]> = [
  [/(^|\.)(google|googlemail)\.com$/i, 'Google Workspace'],
  [/(^|\.)(outlook\.com|protection\.outlook\.com)$/i, 'Microsoft 365'],
  [/(^|\.)zoho\.(com|eu|in)$/i, 'Zoho Mail'],
  [/(^|\.)(ovh\.net|ovh\.com)$/i, 'OVHcloud'],
  [/(^|\.)(ionos\.(es|com|de)|1and1\.(es|com))$/i, 'IONOS'],
  [/(^|\.)hostinger\.com$/i, 'Hostinger'],
  [/(^|\.)(arsys\.es|servidoresdns\.net)$/i, 'Arsys'],
  [/(^|\.)dondominio\.com$/i, 'DonDominio'],
  [/(^|\.)(secureserver\.net)$/i, 'GoDaddy'],
  [/(^|\.)protonmail\.ch$/i, 'Proton Mail'],
];

export function mailProvider(records: MxRecord[]): string | null {
  for (const { exchange } of records) {
    const host = exchange.replace(/\.$/, '');
    for (const [re, name] of PROVIDERS) if (re.test(host)) return name;
  }
  return null;
}

/** MX nulo (RFC 7505): el dominio declara que no recibe correo. */
const isNullMx = (records: MxRecord[]) =>
  records.length === 1 && (records[0]!.exchange === '' || records[0]!.exchange === '.');

function mxFinding(domain: string, records: MxRecord[]): Finding {
  if (records.length === 0 || isNullMx(records)) {
    return {
      ...base,
      id: 'email.mx',
      status: 'info',
      title: 'Tu dominio no recibe correo',
      detail: `${domain} no tiene servidores de correo (MX). Si usas un email de Gmail u Outlook para el negocio, es normal.`,
      risk: 'Aunque no lo uses para correo, conviene publicar SPF y DMARC para que nadie lo suplante.',
      fix: [],
      evidence: { mx: records.map((r) => r.exchange) },
    };
  }
  const provider = mailProvider(records);
  return {
    ...base,
    id: 'email.mx',
    status: 'ok',
    title: provider ? `Recibes el correo en ${provider}` : 'Tu dominio tiene correo configurado',
    detail: `Servidores de correo: ${records.map((r) => r.exchange).join(', ')}.`,
    risk: 'Sin problemas.',
    fix: [],
    evidence: { mx: records.map((r) => `${r.priority} ${r.exchange}`), provider },
  };
}

// ─── SPF ─────────────────────────────────────────────────────────────────────

export type SpfInfo = {
  /** Calificador del `all` final, o `null` si no hay `all`. */
  all: '+' | '-' | '~' | '?' | null;
  includes: string[];
  redirect: string | null;
  /** Mecanismos que cuentan para el límite de 10 consultas, sin seguir includes. */
  directLookups: number;
  usesPtr: boolean;
};

export const isSpf = (record: string) => /^v=spf1(\s|$)/i.test(record.trim());

export function parseSpf(record: string): SpfInfo {
  const terms = record.trim().split(/\s+/).slice(1);
  const info: SpfInfo = {
    all: null,
    includes: [],
    redirect: null,
    directLookups: 0,
    usesPtr: false,
  };
  for (const term of terms) {
    const lower = term.toLowerCase();
    const qualifier = /^[+\-~?]/.test(lower) ? (lower[0] as SpfInfo['all']) : '+';
    const mech = lower.replace(/^[+\-~?]/, '');
    if (mech === 'all') info.all = qualifier;
    else if (mech.startsWith('include:')) {
      info.includes.push(mech.slice(8));
      info.directLookups++;
    } else if (mech.startsWith('redirect=')) {
      info.redirect = mech.slice(9);
      info.directLookups++;
    } else if (/^(a|mx|exists|ptr)([:/]|$)/.test(mech)) {
      info.directLookups++;
      if (mech.startsWith('ptr')) info.usesPtr = true;
    }
  }
  return info;
}

/**
 * Cuenta las consultas DNS que hace un SPF, siguiendo `include` y `redirect`.
 * Se corta al pasar del límite para no hacer cientos de consultas.
 */
export async function countSpfLookups(
  record: string,
  dns: DnsClient,
  seen = new Set<string>(),
): Promise<number> {
  const info = parseSpf(record);
  let total = info.directLookups;
  const targets = [...info.includes, ...(info.redirect ? [info.redirect] : [])];
  for (const target of targets) {
    if (total > SPF_MAX_LOOKUPS) break;
    if (seen.has(target) || target.includes('%')) continue; // macros: no se pueden resolver
    seen.add(target);
    const child = (await txtRecords(dns, target)).find(isSpf);
    if (child) total += await countSpfLookups(child, dns, seen);
  }
  return total;
}

async function checkSpf(domain: string, dns: DnsClient, mx: Promise<MxRecord[]>): Promise<Finding> {
  const records = (await txtRecords(dns, domain)).filter(isSpf);
  if (records.length === 0) {
    const noMail = (await mx.catch(() => [])).length === 0;
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: 'Falta el registro SPF',
      detail: noMail
        ? `${domain} no dice qué servidores pueden enviar correo en su nombre. Si no envías correo con él, publica "v=spf1 -all".`
        : `${domain} no dice qué servidores pueden enviar correo en su nombre.`,
      risk: 'Cualquiera puede enviar emails haciéndose pasar por tu negocio, y tus correos legítimos acaban más en spam.',
      fix: fixFor('email.spf'),
    };
  }
  if (records.length > 1) {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: 'Hay varios registros SPF y eso lo invalida',
      detail: `Solo puede haber uno; ahora hay ${records.length}. Los servidores de correo los ignoran todos.`,
      risk: 'Es como no tener SPF: tu dominio se puede suplantar.',
      fix: fixFor('email.spf_multiple'),
      evidence: { records },
    };
  }

  const record = records[0]!;
  const info = parseSpf(record);
  // Con `redirect=` y sin `all`, manda el `all` del registro de destino.
  if (info.all === null && info.redirect) {
    const target = (await txtRecords(dns, info.redirect)).find(isSpf);
    if (target) info.all = parseSpf(target).all;
  }
  const lookups = await countSpfLookups(record, dns, new Set([domain]));
  const evidence = { record, lookups, all: info.all };

  if (lookups > SPF_MAX_LOOKUPS) {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: 'El SPF hace demasiadas consultas y deja de funcionar',
      detail: `Necesita ${lookups} consultas DNS y el máximo es ${SPF_MAX_LOOKUPS}. Los servidores de correo lo dan por erróneo.`,
      risk: 'Tus emails pueden ir a spam y el dominio queda sin protección real.',
      fix: fixFor('email.spf_lookups'),
      evidence,
    };
  }
  if (info.all === '+' || info.all === '?') {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: `El SPF termina en "${info.all}all" y no protege nada`,
      detail:
        info.all === '+'
          ? 'Con "+all" autorizas a cualquier servidor del mundo a enviar correo como tú.'
          : 'Con "?all" no indicas qué hacer con los correos falsos.',
      risk: 'Tu dominio se puede suplantar igual que si no tuvieras SPF.',
      fix: fixFor('email.spf'),
      evidence,
    };
  }
  if (info.all === null && !info.redirect) {
    return {
      ...base,
      id: 'email.spf',
      status: 'warning',
      title: 'El SPF no termina en "-all" ni "~all"',
      detail: 'Falta la regla final que dice qué hacer con los servidores no autorizados.',
      risk: 'La protección contra suplantación es débil.',
      fix: fixFor('email.spf'),
      evidence,
    };
  }
  const notes: string[] = [`Usa ${lookups} de ${SPF_MAX_LOOKUPS} consultas DNS.`];
  if (info.usesPtr) notes.push('Incluye "ptr", un mecanismo obsoleto que conviene quitar.');
  if (info.all === '~') {
    return {
      ...base,
      id: 'email.spf',
      status: 'info',
      title: 'SPF configurado en modo flexible ("~all")',
      detail: `Los correos no autorizados se marcan como sospechosos, pero no se rechazan. ${notes.join(' ')}`,
      risk: 'Protege bien si además tienes DMARC en "quarantine" o "reject". Sin DMARC, mejor "-all".',
      fix: fixFor('email.spf_softfail'),
      evidence,
    };
  }
  return {
    ...base,
    id: 'email.spf',
    status: info.usesPtr ? 'warning' : 'ok',
    title: 'SPF configurado correctamente',
    detail: `Solo los servidores autorizados pueden enviar correo como ${domain}. ${notes.join(' ')}`,
    risk: info.usesPtr
      ? 'Funciona, pero "ptr" ralentiza y algunos servidores lo ignoran.'
      : 'Sin problemas.',
    fix: info.usesPtr ? fixFor('email.spf') : [],
    evidence,
  };
}

// ─── DMARC ───────────────────────────────────────────────────────────────────

export function parseDmarc(record: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const part of record.split(';')) {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) tags[key.trim().toLowerCase()] = rest.join('=').trim();
  }
  return tags;
}

const dmarcRecords = async (dns: DnsClient, name: string) =>
  (await txtRecords(dns, `_dmarc.${name}`)).filter((r) => /^v=DMARC1\s*(;|$)/i.test(r.trim()));

async function checkDmarc(domain: string, dns: DnsClient): Promise<Finding> {
  let records = await dmarcRecords(dns, domain);
  // RFC 7489 §6.6.3: un subdominio sin registro propio hereda el del dominio
  // principal, con su política para subdominios (sp=) si la tiene.
  const org = organizationalDomain(domain);
  const inherited = records.length === 0 && org !== domain;
  if (inherited) records = await dmarcRecords(dns, org);
  if (records.length === 0) {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'fail',
      title: 'Falta la política DMARC',
      detail: `${domain} no indica a Gmail, Outlook y compañía qué hacer con los correos que se hacen pasar por ti.`,
      risk: 'Los emails falsos en tu nombre (facturas, cambios de cuenta bancaria) llegan a tus clientes. Gmail y Yahoo ya exigen DMARC.',
      fix: fixFor('email.dmarc'),
    };
  }
  if (records.length > 1) {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'fail',
      title: 'Hay varios registros DMARC y eso lo invalida',
      detail: `Solo puede haber uno en _dmarc.${inherited ? org : domain}; ahora hay ${records.length}.`,
      risk: 'Los servidores de correo ignoran la política: es como no tenerla.',
      fix: fixFor('email.dmarc'),
      evidence: { records },
    };
  }
  const record = records[0]!;
  const tags = parseDmarc(record);
  const policy = ((inherited ? (tags.sp ?? tags.p) : tags.p) ?? '').toLowerCase();
  const from = inherited ? ` (heredada de ${org})` : '';
  const pct = tags.pct ? Number(tags.pct) : 100;
  const reports = tags.rua
    ? 'Recibes informes en ' + tags.rua.replace(/mailto:/gi, '') + '.'
    : 'No pides informes (rua): no sabrás si alguien intenta suplantarte.';
  const evidence = {
    record,
    policy,
    pct,
    rua: tags.rua ?? null,
    ...(inherited ? { inheritedFrom: org } : {}),
  };

  if (policy === 'reject' || policy === 'quarantine') {
    const partial = pct < 100;
    return {
      ...base,
      id: 'email.dmarc',
      status: partial ? 'warning' : 'ok',
      title: partial
        ? `DMARC en "${policy}"${from}, pero solo para el ${pct} % de los correos`
        : `DMARC activo en modo "${policy}"${from}`,
      detail: `${
        policy === 'reject'
          ? 'Los correos falsos en tu nombre se rechazan.'
          : 'Los correos falsos en tu nombre van a la carpeta de spam.'
      } ${reports}`,
      risk: partial ? 'El resto de correos falsos sigue pasando.' : 'Sin problemas.',
      fix: partial ? fixFor('email.dmarc_none') : [],
      evidence,
    };
  }
  if (policy === 'none') {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'warning',
      title: `DMARC solo observa ("${inherited && tags.sp ? 'sp' : 'p'}=none")${from} y no bloquea nada`,
      detail: `La política está en modo de prueba: los correos falsos siguen llegando. ${reports}`,
      risk: 'Tu dominio se sigue pudiendo suplantar.',
      fix: fixFor('email.dmarc_none'),
      evidence,
    };
  }
  return {
    ...base,
    id: 'email.dmarc',
    status: 'fail',
    title: 'El registro DMARC no es válido',
    detail: `Falta la política "p=" o tiene un valor desconocido ("${tags.p ?? ''}").`,
    risk: 'Los servidores de correo lo ignoran.',
    fix: fixFor('email.dmarc'),
    evidence,
  };
}

// ─── DKIM ────────────────────────────────────────────────────────────────────

async function checkDkim(domain: string, dns: DnsClient): Promise<Finding> {
  const results = await Promise.allSettled(
    DKIM_SELECTORS.map(async (selector) => {
      const records = await txtRecords(dns, `${selector}._domainkey.${domain}`);
      const key = records.find((r) => /(^|;)\s*p=/i.test(r) || /v=DKIM1/i.test(r));
      // Una clave vacía ("p=") significa que se ha revocado.
      const active = key !== undefined && !/(^|;)\s*p=\s*(;|$)/i.test(key);
      return active ? selector : null;
    }),
  );
  const found = results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
  if (found.length === 0 && results.every((r) => r.status === 'rejected')) {
    throw (results[0] as PromiseRejectedResult).reason;
  }
  if (found.length > 0) {
    return {
      ...base,
      id: 'email.dkim',
      status: 'ok',
      title: 'Tus correos van firmados (DKIM)',
      detail: `Hemos encontrado firma DKIM con el selector ${found.map((s) => `"${s}"`).join(', ')}.`,
      risk: 'Sin problemas: los destinatarios pueden comprobar que el correo es tuyo y no se ha modificado.',
      fix: [],
      evidence: { selectors: found },
    };
  }
  return {
    ...base,
    id: 'email.dkim',
    status: 'info',
    title: 'No hemos encontrado firma DKIM',
    detail: `Hemos probado los selectores más comunes (${DKIM_SELECTORS.join(', ')}) sin éxito. Puede que la tengas con otro nombre: compruébalo en el panel de tu proveedor de correo.`,
    risk: 'Sin DKIM, tus correos tienen más probabilidades de ir a spam y DMARC protege menos.',
    fix: fixFor('email.dkim'),
    evidence: { tried: [...DKIM_SELECTORS] },
  };
}
