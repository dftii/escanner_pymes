import type { MxRecord } from 'node:dns';
import { fixFor } from '../data/remediation';
import type { Locale } from '../i18n';
import { EMAIL_MSG } from './emailDns.messages';
import { suggestDmarc, suggestSpf } from '../dnsRecords';
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
  locale: Locale = 'es',
): Promise<Finding[]> {
  const name = emailDomainOf(domain);
  const mx = mxRecords(dns, name);
  const results = await Promise.allSettled([
    mx.then((records) => mxFinding(name, records, locale)),
    checkSpf(name, dns, mx, locale),
    checkDmarc(name, dns, mx, locale),
    checkDkim(name, dns, locale),
  ]);
  const ids = ['email.mx', 'email.spf', 'email.dmarc', 'email.dkim'];
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : errorFinding(ids[i]!, 'email', r.reason, locale),
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

function mxFinding(domain: string, records: MxRecord[], locale: Locale): Finding {
  const m = EMAIL_MSG[locale];
  if (records.length === 0 || isNullMx(records)) {
    return {
      ...base,
      id: 'email.mx',
      status: 'info',
      title: m.mxNoneTitle,
      detail: m.mxNoneDetail(domain),
      risk: m.mxNoneRisk,
      fix: [],
      evidence: { mx: records.map((r) => r.exchange) },
    };
  }
  const provider = mailProvider(records);
  return {
    ...base,
    id: 'email.mx',
    status: 'ok',
    title: provider ? m.mxProviderTitle(provider) : m.mxGenericTitle,
    detail: m.mxDetail(records.map((r) => r.exchange).join(', ')),
    risk: m.noProblems,
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

const realMx = (records: MxRecord[]) => (isNullMx(records) ? [] : records);

async function checkSpf(
  domain: string,
  dns: DnsClient,
  mx: Promise<MxRecord[]>,
  locale: Locale,
): Promise<Finding> {
  const m = EMAIL_MSG[locale];
  const records = (await txtRecords(dns, domain)).filter(isSpf);
  const mxList = realMx(await mx.catch(() => []));
  const noMail = mxList.length === 0;
  const suggest = (current: string[]) => {
    const r = suggestSpf({
      domain,
      current,
      provider: mailProvider(mxList),
      mxHosts: mxList.map((m) => m.exchange),
      noMail,
      locale,
    });
    return r ? { records: [r] } : {};
  };
  if (records.length === 0) {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: m.spfMissingTitle,
      detail: noMail ? m.spfMissingNoMail(domain) : m.spfMissingDetail(domain),
      risk: m.spfMissingRisk,
      fix: fixFor('email.spf', locale),
      ...suggest([]),
    };
  }
  if (records.length > 1) {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: m.spfMultiTitle,
      detail: m.spfMultiDetail(records.length),
      risk: m.spfMultiRisk,
      fix: fixFor('email.spf_multiple', locale),
      evidence: { records },
      ...suggest(records),
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
      title: m.spfLookupsTitle,
      detail: m.spfLookupsDetail(lookups, SPF_MAX_LOOKUPS),
      risk: m.spfLookupsRisk,
      fix: fixFor('email.spf_lookups', locale),
      evidence,
    };
  }
  if (info.all === '+' || info.all === '?') {
    return {
      ...base,
      id: 'email.spf',
      status: 'fail',
      title: m.spfOpenTitle(info.all),
      detail: info.all === '+' ? m.spfPlusDetail : m.spfQuestionDetail,
      risk: m.spfOpenRisk,
      fix: fixFor('email.spf', locale),
      evidence,
      ...suggest([record]),
    };
  }
  if (info.all === null && !info.redirect) {
    return {
      ...base,
      id: 'email.spf',
      status: 'warning',
      title: m.spfNoAllTitle,
      detail: m.spfNoAllDetail,
      risk: m.spfNoAllRisk,
      fix: fixFor('email.spf', locale),
      evidence,
      ...suggest([record]),
    };
  }
  const notes: string[] = [m.spfLookupsNote(lookups, SPF_MAX_LOOKUPS)];
  if (info.usesPtr) notes.push(m.spfPtrNote);
  if (info.all === '~') {
    return {
      ...base,
      id: 'email.spf',
      status: 'info',
      title: m.spfSoftTitle,
      detail: m.spfSoftDetail(notes.join(' ')),
      risk: m.spfSoftRisk,
      fix: fixFor('email.spf_softfail', locale),
      evidence,
    };
  }
  return {
    ...base,
    id: 'email.spf',
    status: info.usesPtr ? 'warning' : 'ok',
    title: m.spfOkTitle,
    detail: m.spfOkDetail(domain, notes.join(' ')),
    risk: info.usesPtr ? m.spfPtrRisk : m.noProblems,
    fix: info.usesPtr ? fixFor('email.spf', locale) : [],
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

async function checkDmarc(
  domain: string,
  dns: DnsClient,
  mx: Promise<MxRecord[]> = Promise.resolve([]),
  locale: Locale = 'es',
): Promise<Finding> {
  const m = EMAIL_MSG[locale];
  let records = await dmarcRecords(dns, domain);
  // RFC 7489 §6.6.3: un subdominio sin registro propio hereda el del dominio
  // principal, con su política para subdominios (sp=) si la tiene.
  const org = organizationalDomain(domain);
  const inherited = records.length === 0 && org !== domain;
  if (inherited) records = await dmarcRecords(dns, org);
  const noMail = realMx(await mx.catch(() => [])).length === 0;
  // Los registros se proponen donde hay que ponerlos: en el dominio principal si se hereda.
  const plan = (current: string | null) => ({
    records: suggestDmarc({ domain: inherited ? org : domain, current, noMail, locale }),
  });
  if (records.length === 0) {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'fail',
      title: m.dmarcMissingTitle,
      detail: m.dmarcMissingDetail(domain),
      risk: m.dmarcMissingRisk,
      fix: fixFor('email.dmarc', locale),
      ...plan(null),
    };
  }
  if (records.length > 1) {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'fail',
      title: m.dmarcMultiTitle,
      detail: m.dmarcMultiDetail(inherited ? org : domain, records.length),
      risk: m.dmarcMultiRisk,
      fix: fixFor('email.dmarc', locale),
      evidence: { records },
      ...plan(null),
    };
  }
  const record = records[0]!;
  const tags = parseDmarc(record);
  const policy = ((inherited ? (tags.sp ?? tags.p) : tags.p) ?? '').toLowerCase();
  const from = inherited ? m.dmarcInherited(org) : '';
  const pct = tags.pct ? Number(tags.pct) : 100;
  const reports = tags.rua ? m.dmarcReports(tags.rua.replace(/mailto:/gi, '')) : m.dmarcNoReports;
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
      title: partial ? m.dmarcPartialTitle(policy, from, pct) : m.dmarcActiveTitle(policy, from),
      detail: `${policy === 'reject' ? m.dmarcRejectDetail : m.dmarcQuarantineDetail} ${reports}`,
      risk: partial ? m.dmarcPartialRisk : m.noProblems,
      fix: partial ? fixFor('email.dmarc_none', locale) : [],
      evidence,
    };
  }
  if (policy === 'none') {
    return {
      ...base,
      id: 'email.dmarc',
      status: 'warning',
      title: m.dmarcNoneTitle(inherited && tags.sp ? 'sp' : 'p', from),
      detail: m.dmarcNoneDetail(reports),
      risk: m.dmarcNoneRisk,
      fix: fixFor('email.dmarc_none', locale),
      evidence,
      ...plan(record),
    };
  }
  return {
    ...base,
    id: 'email.dmarc',
    status: 'fail',
    title: m.dmarcInvalidTitle,
    detail: m.dmarcInvalidDetail(tags.p ?? ''),
    risk: m.dmarcInvalidRisk,
    fix: fixFor('email.dmarc', locale),
    evidence,
    ...plan(null),
  };
}

// ─── DKIM ────────────────────────────────────────────────────────────────────

async function checkDkim(domain: string, dns: DnsClient, locale: Locale): Promise<Finding> {
  const m = EMAIL_MSG[locale];
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
      title: m.dkimOkTitle,
      detail: m.dkimOkDetail(found.map((s) => `"${s}"`).join(', ')),
      risk: m.dkimOkRisk,
      fix: [],
      evidence: { selectors: found },
    };
  }
  return {
    ...base,
    id: 'email.dkim',
    status: 'info',
    title: m.dkimMissingTitle,
    detail: m.dkimMissingDetail(DKIM_SELECTORS.join(', ')),
    risk: m.dkimMissingRisk,
    fix: fixFor('email.dkim', locale),
    evidence: { tried: [...DKIM_SELECTORS] },
  };
}
