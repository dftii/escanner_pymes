import { checkServerIdentity, type PeerCertificate } from 'node:tls';
import { fixFor } from '../data/remediation';
import { LOCALE_TAGS, type Locale } from '../i18n';
import { errorFinding } from '../findings';
import { organizationalDomain } from '../net/domain';
import { isScanError } from '../net/errors';
import { safeFetch } from '../net/safeFetch';
import type { Finding } from '../types';
import { SSL_MSG } from './ssl.messages';
import { probeTls, TlsProbeError, type TlsProbe } from './tlsProbe';

export type SslDeps = {
  probe?: (host: string) => Promise<TlsProbe>;
  fetch?: typeof safeFetch;
  now?: () => Date;
  locale?: Locale;
};

const DAY_MS = 86_400_000;
/** Por debajo de estos días se avisa (Let's Encrypt renueva a los ~30). */
export const EXPIRY_FAIL_DAYS = 7;
export const EXPIRY_WARN_DAYS = 21;

const SELF_SIGNED = new Set(['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN']);
const INCOMPLETE_CHAIN = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

const base = { category: 'ssl' } as const;

/**
 * Certificado SSL/TLS: confianza, caducidad, nombre (con y sin www),
 * versión de TLS y redirección de http a https.
 */
export async function checkSsl(domain: string, deps: SslDeps = {}): Promise<Finding[]> {
  const probe = deps.probe ?? ((host: string) => probeTls(host));
  const now = deps.now?.() ?? new Date();
  const locale = deps.locale ?? 'es';
  // La variante con o sin www solo tiene sentido en el dominio principal:
  // en `tienda.minegocio.es` nadie escribe `www.tienda.minegocio.es`.
  const apex = domain.replace(/^www\./, '');
  const variant =
    organizationalDomain(apex) !== apex ? null : domain.startsWith('www.') ? apex : `www.${domain}`;

  const [main, alt, redirect] = await Promise.allSettled([
    probe(domain),
    variant ? probe(variant) : Promise.reject(new Error('sin variante')),
    checkHttpRedirect(domain, deps.fetch ?? safeFetch, locale),
  ]);

  if (main.status === 'rejected') {
    const reason: unknown = main.reason;
    if (
      reason instanceof TlsProbeError &&
      (reason.kind === 'refused' || reason.kind === 'handshake')
    ) {
      return [noHttps(domain, reason.code, locale)];
    }
    return [errorFinding('ssl.certificate', 'ssl', reason, locale), ...settled(redirect, locale)];
  }

  const { cert, authorized, authorizationError, protocol } = main.value;
  if (!cert) return [noHttps(domain, 'NO_CERT', locale)];

  const findings: Finding[] = [];
  const trust = trustFinding(authorized, authorizationError, cert, locale);
  if (trust) findings.push(trust);
  findings.push(expiryFinding(cert, now, locale));
  findings.push(hostnameFinding(domain, cert, locale));
  const www = variant ? wwwFinding(variant, alt, locale) : null;
  if (www) findings.push(www);
  findings.push(protocolFinding(protocol, locale));
  findings.push(...settled(redirect, locale));
  return findings;
}

function settled(result: PromiseSettledResult<Finding>, locale: Locale): Finding[] {
  return [
    result.status === 'fulfilled'
      ? result.value
      : errorFinding('ssl.redirect', 'ssl', result.reason, locale),
  ];
}

function noHttps(domain: string, code: string | undefined, locale: Locale): Finding {
  const m = SSL_MSG[locale];
  return {
    ...base,
    id: 'ssl.no_https',
    status: 'fail',
    title: m.noHttpsTitle,
    detail: m.noHttpsDetail(domain),
    risk: m.noHttpsRisk,
    fix: fixFor('ssl.no_https', locale),
    evidence: { code },
  };
}

export function issuerName(cert: PeerCertificate, locale: Locale = 'es'): string {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return first(cert.issuer?.O) || first(cert.issuer?.CN) || SSL_MSG[locale].unknownIssuer;
}

function trustFinding(
  authorized: boolean,
  error: string | null,
  cert: PeerCertificate,
  locale: Locale,
): Finding | null {
  const m = SSL_MSG[locale];
  const issuer = issuerName(cert, locale);
  if (authorized) {
    return {
      ...base,
      id: 'ssl.trust',
      status: 'ok',
      title: m.trustOkTitle,
      detail: m.trustOkDetail(issuer),
      risk: m.trustOkRisk,
      fix: [],
      evidence: { issuer },
    };
  }
  // La caducidad tiene su propio hallazgo: no la contamos dos veces.
  if (error === 'CERT_HAS_EXPIRED') return null;

  if (error && INCOMPLETE_CHAIN.has(error)) {
    return {
      ...base,
      id: 'ssl.chain',
      status: 'fail',
      title: m.chainTitle,
      detail: m.chainDetail(issuer),
      risk: m.chainRisk,
      fix: fixFor('ssl.chain', locale),
      evidence: { code: error, issuer },
    };
  }
  const selfSigned = error !== null && SELF_SIGNED.has(error);
  return {
    ...base,
    id: 'ssl.untrusted',
    status: 'fail',
    title: selfSigned ? m.selfSignedTitle : m.untrustedTitle,
    detail: selfSigned ? m.selfSignedDetail : m.untrustedDetail(issuer),
    risk: m.untrustedRisk,
    fix: fixFor('ssl.untrusted', locale),
    evidence: { code: error, issuer },
  };
}

const dateFmt = (locale: Locale) =>
  new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  });

function expiryFinding(cert: PeerCertificate, now: Date, locale: Locale): Finding {
  const m = SSL_MSG[locale];
  const validTo = new Date(cert.valid_to);
  const days = Math.floor((validTo.getTime() - now.getTime()) / DAY_MS);
  const when = dateFmt(locale).format(validTo);
  const evidence = {
    validTo: validTo.toISOString(),
    daysLeft: days,
    issuer: issuerName(cert, locale),
  };

  if (days < 0) {
    return {
      ...base,
      id: 'ssl.expiry',
      status: 'fail',
      title: m.expiredTitle,
      detail: m.expiredDetail(when, -days),
      risk: m.expiredRisk,
      fix: fixFor('ssl.expiry', locale),
      evidence,
    };
  }
  if (days <= EXPIRY_WARN_DAYS) {
    return {
      ...base,
      id: 'ssl.expiry',
      status: days <= EXPIRY_FAIL_DAYS ? 'fail' : 'warning',
      title: m.expiringTitle(days),
      detail: m.expiringDetail(when),
      risk: m.expiringRisk,
      fix: fixFor('ssl.expiry', locale),
      evidence,
    };
  }
  return {
    ...base,
    id: 'ssl.expiry',
    status: 'ok',
    title: m.validTitle(days),
    detail: m.validDetail(when),
    risk: m.validRisk,
    fix: [],
    evidence,
  };
}

function hostnameFinding(domain: string, cert: PeerCertificate, locale: Locale): Finding {
  const m = SSL_MSG[locale];
  const mismatch = checkServerIdentity(domain, cert);
  const names = cert.subjectaltname ?? '';
  if (!mismatch) {
    return {
      ...base,
      id: 'ssl.hostname',
      status: 'ok',
      title: m.hostnameOkTitle,
      detail: m.hostnameOkDetail(domain),
      risk: m.hostnameOkRisk,
      fix: [],
      evidence: { subjectAltNames: names },
    };
  }
  return {
    ...base,
    id: 'ssl.hostname',
    status: 'fail',
    title: m.hostnameBadTitle,
    detail: m.hostnameBadDetail(domain, names.replace(/DNS:/g, '')),
    risk: m.hostnameBadRisk,
    fix: fixFor('ssl.hostname', locale),
    evidence: { subjectAltNames: names },
  };
}

function wwwFinding(
  variant: string,
  alt: PromiseSettledResult<TlsProbe>,
  locale: Locale,
): Finding | null {
  const m = SSL_MSG[locale];
  if (alt.status === 'rejected') {
    const reason: unknown = alt.reason;
    // La variante no existe o no responde a tiempo: nada que decir.
    if (isScanError(reason) || !(reason instanceof TlsProbeError) || reason.kind === 'timeout') {
      return null;
    }
    return wwwProblem(variant, m.wwwNoTls, locale);
  }
  const cert = alt.value.cert;
  if (cert && !checkServerIdentity(variant, cert)) {
    return {
      ...base,
      id: 'ssl.www',
      status: 'ok',
      title: m.wwwOkTitle(variant),
      detail: m.wwwOkDetail(variant),
      risk: m.noProblems,
      fix: [],
    };
  }
  return wwwProblem(variant, m.wwwNotCovered, locale);
}

function wwwProblem(variant: string, what: string, locale: Locale): Finding {
  const m = SSL_MSG[locale];
  return {
    ...base,
    id: 'ssl.www',
    status: 'warning',
    title: m.wwwBadTitle(variant),
    detail: m.wwwBadDetail(variant, what),
    risk: m.wwwBadRisk,
    fix: fixFor('ssl.www', locale),
    evidence: { host: variant },
  };
}

function protocolFinding(protocol: string | null, locale: Locale): Finding {
  const m = SSL_MSG[locale];
  if (protocol === 'TLSv1.3' || protocol === 'TLSv1.2') {
    return {
      ...base,
      id: 'ssl.protocol',
      status: 'ok',
      title: m.protoOkTitle(protocol.replace('v', ' ')),
      detail: m.protoOkDetail,
      risk: m.noProblems,
      fix: [],
      evidence: { protocol },
    };
  }
  return {
    ...base,
    id: 'ssl.protocol',
    status: 'fail',
    title: m.protoBadTitle,
    detail: m.protoBadDetail(protocol),
    risk: m.protoBadRisk,
    fix: fixFor('ssl.protocol', locale),
    evidence: { protocol },
  };
}

/**
 * Sigue a mano las redirecciones de `http://dominio/` (sin entrar en https)
 * y comprueba que acaban llevando a https.
 */
export async function checkHttpRedirect(
  domain: string,
  fetcher: typeof safeFetch = safeFetch,
  locale: Locale = 'es',
): Promise<Finding> {
  const m = SSL_MSG[locale];
  let url = new URL(`http://${domain}/`);
  for (let hop = 0; hop < 5; hop++) {
    let res;
    try {
      res = await fetcher(url.href, { followRedirects: false, maxBytes: 16 * 1024 });
    } catch (error) {
      if (hop === 0 && isScanError(error) && error.code === 'network') {
        return {
          ...base,
          id: 'ssl.redirect',
          status: 'ok',
          title: m.noHttpTitle,
          detail: m.noHttpDetail,
          risk: m.noHttpRisk,
          fix: [],
        };
      }
      throw error;
    }
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url);
      if (next.protocol === 'https:') {
        return {
          ...base,
          id: 'ssl.redirect',
          status: 'ok',
          title: m.redirOkTitle,
          detail: m.redirOkDetail(domain, next.origin),
          risk: m.noProblems,
          fix: [],
          evidence: { location: next.href, status: res.status },
        };
      }
      url = next;
      continue;
    }
    break;
  }
  return {
    ...base,
    id: 'ssl.redirect',
    status: 'fail',
    title: m.redirBadTitle,
    detail: m.redirBadDetail(domain),
    risk: m.redirBadRisk,
    fix: fixFor('ssl.redirect', locale),
    evidence: { finalUrl: url.href },
  };
}
