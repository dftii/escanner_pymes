import { checkServerIdentity, type PeerCertificate } from 'node:tls';
import { fixFor } from '../data/remediation';
import { errorFinding } from '../findings';
import { isScanError } from '../net/errors';
import { safeFetch } from '../net/safeFetch';
import type { Finding } from '../types';
import { probeTls, TlsProbeError, type TlsProbe } from './tlsProbe';

export type SslDeps = {
  probe?: (host: string) => Promise<TlsProbe>;
  fetch?: typeof safeFetch;
  now?: () => Date;
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
  const variant = domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`;

  const [main, alt, redirect] = await Promise.allSettled([
    probe(domain),
    probe(variant),
    checkHttpRedirect(domain, deps.fetch ?? safeFetch),
  ]);

  if (main.status === 'rejected') {
    const reason: unknown = main.reason;
    if (
      reason instanceof TlsProbeError &&
      (reason.kind === 'refused' || reason.kind === 'handshake')
    ) {
      return [noHttps(domain, reason.code)];
    }
    return [errorFinding('ssl.certificate', 'ssl', reason), ...settled(redirect)];
  }

  const { cert, authorized, authorizationError, protocol } = main.value;
  if (!cert) return [noHttps(domain, 'NO_CERT')];

  const findings: Finding[] = [];
  const trust = trustFinding(authorized, authorizationError, cert);
  if (trust) findings.push(trust);
  findings.push(expiryFinding(cert, now));
  findings.push(hostnameFinding(domain, cert));
  const www = wwwFinding(variant, alt);
  if (www) findings.push(www);
  findings.push(protocolFinding(protocol));
  findings.push(...settled(redirect));
  return findings;
}

function settled(result: PromiseSettledResult<Finding>): Finding[] {
  return [
    result.status === 'fulfilled'
      ? result.value
      : errorFinding('ssl.redirect', 'ssl', result.reason),
  ];
}

function noHttps(domain: string, code: string | undefined): Finding {
  return {
    ...base,
    id: 'ssl.no_https',
    status: 'fail',
    title: 'Tu web no tiene una conexión segura (HTTPS)',
    detail: `No hemos podido abrir una conexión segura con ${domain}. Los visitantes ven el aviso "No seguro" en el navegador.`,
    risk: 'Todo lo que se envía desde tu web (formularios, contraseñas) viaja sin cifrar y los clientes desconfían.',
    fix: fixFor('ssl.no_https'),
    evidence: { code },
  };
}

export function issuerName(cert: PeerCertificate): string {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return first(cert.issuer?.O) || first(cert.issuer?.CN) || 'un emisor desconocido';
}

function trustFinding(
  authorized: boolean,
  error: string | null,
  cert: PeerCertificate,
): Finding | null {
  const issuer = issuerName(cert);
  if (authorized) {
    return {
      ...base,
      id: 'ssl.trust',
      status: 'ok',
      title: 'El certificado es de confianza',
      detail: `Lo emite ${issuer}, una entidad que reconocen todos los navegadores.`,
      risk: 'Los visitantes ven el candado sin avisos.',
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
      title: 'El certificado está mal instalado (falta la cadena)',
      detail: `Tu servidor no envía el certificado intermedio de ${issuer}. Algunos navegadores y móviles mostrarán un error de seguridad.`,
      risk: 'Parte de tus visitantes verán una pantalla de "conexión no segura" y se irán.',
      fix: fixFor('ssl.chain'),
      evidence: { code: error, issuer },
    };
  }
  const selfSigned = error !== null && SELF_SIGNED.has(error);
  return {
    ...base,
    id: 'ssl.untrusted',
    status: 'fail',
    title: selfSigned
      ? 'El certificado es autofirmado y ningún navegador lo acepta'
      : 'El certificado no es de confianza',
    detail: selfSigned
      ? 'El certificado lo ha creado el propio servidor en lugar de una autoridad reconocida.'
      : `Los navegadores no reconocen el certificado emitido por ${issuer}.`,
    risk: 'Los visitantes ven una pantalla de aviso a pantalla completa antes de entrar en tu web.',
    fix: fixFor('ssl.untrusted'),
    evidence: { code: error, issuer },
  };
}

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});

function expiryFinding(cert: PeerCertificate, now: Date): Finding {
  const validTo = new Date(cert.valid_to);
  const days = Math.floor((validTo.getTime() - now.getTime()) / DAY_MS);
  const when = dateFmt.format(validTo);
  const evidence = { validTo: validTo.toISOString(), daysLeft: days, issuer: issuerName(cert) };

  if (days < 0) {
    return {
      ...base,
      id: 'ssl.expiry',
      status: 'fail',
      title: 'El certificado está caducado',
      detail: `Caducó el ${when} (hace ${-days} ${-days === 1 ? 'día' : 'días'}).`,
      risk: 'Los navegadores bloquean la entrada con un aviso de seguridad: estás perdiendo visitas.',
      fix: fixFor('ssl.expiry'),
      evidence,
    };
  }
  if (days <= EXPIRY_WARN_DAYS) {
    return {
      ...base,
      id: 'ssl.expiry',
      status: days <= EXPIRY_FAIL_DAYS ? 'fail' : 'warning',
      title: `El certificado caduca en ${days} ${days === 1 ? 'día' : 'días'}`,
      detail: `Vence el ${when}. Si tiene renovación automática debería renovarse antes; si no, hazlo ya.`,
      risk: 'Si caduca, los navegadores mostrarán un aviso de seguridad a tus clientes.',
      fix: fixFor('ssl.expiry'),
      evidence,
    };
  }
  return {
    ...base,
    id: 'ssl.expiry',
    status: 'ok',
    title: `El certificado es válido ${days} días más`,
    detail: `Vence el ${when}.`,
    risk: 'Nada urgente: comprueba que la renovación automática está activada.',
    fix: [],
    evidence,
  };
}

function hostnameFinding(domain: string, cert: PeerCertificate): Finding {
  const mismatch = checkServerIdentity(domain, cert);
  const names = cert.subjectaltname ?? '';
  if (!mismatch) {
    return {
      ...base,
      id: 'ssl.hostname',
      status: 'ok',
      title: 'El certificado corresponde a tu dominio',
      detail: `Cubre ${domain}.`,
      risk: 'Sin problemas de nombre.',
      fix: [],
      evidence: { subjectAltNames: names },
    };
  }
  return {
    ...base,
    id: 'ssl.hostname',
    status: 'fail',
    title: 'El certificado es de otro dominio',
    detail: `El certificado instalado no incluye ${domain}${names ? ` (cubre: ${names.replace(/DNS:/g, '')})` : ''}.`,
    risk: 'Los navegadores muestran un aviso de "conexión no privada" y bloquean la entrada.',
    fix: fixFor('ssl.hostname'),
    evidence: { subjectAltNames: names },
  };
}

function wwwFinding(variant: string, alt: PromiseSettledResult<TlsProbe>): Finding | null {
  if (alt.status === 'rejected') {
    const reason: unknown = alt.reason;
    // La variante no existe o no responde a tiempo: nada que decir.
    if (isScanError(reason) || !(reason instanceof TlsProbeError) || reason.kind === 'timeout') {
      return null;
    }
    return wwwProblem(variant, 'responde, pero sin conexión segura');
  }
  const cert = alt.value.cert;
  if (cert && !checkServerIdentity(variant, cert)) {
    return {
      ...base,
      id: 'ssl.www',
      status: 'ok',
      title: `La versión ${variant} también es segura`,
      detail: `Si un cliente escribe ${variant}, también ve el candado.`,
      risk: 'Sin problemas.',
      fix: [],
    };
  }
  return wwwProblem(variant, 'tiene un certificado que no la incluye');
}

function wwwProblem(variant: string, what: string): Finding {
  return {
    ...base,
    id: 'ssl.www',
    status: 'warning',
    title: `La dirección ${variant} da error de seguridad`,
    detail: `${variant} ${what}. Quien la escriba así verá un aviso del navegador.`,
    risk: 'Muchos clientes escriben la web con o sin "www": parte de ellos verá un error.',
    fix: fixFor('ssl.www'),
    evidence: { host: variant },
  };
}

function protocolFinding(protocol: string | null): Finding {
  if (protocol === 'TLSv1.3' || protocol === 'TLSv1.2') {
    return {
      ...base,
      id: 'ssl.protocol',
      status: 'ok',
      title: `Usa una versión moderna de cifrado (${protocol.replace('v', ' ')})`,
      detail: 'La conexión usa un protocolo actual y seguro.',
      risk: 'Sin problemas.',
      fix: [],
      evidence: { protocol },
    };
  }
  return {
    ...base,
    id: 'ssl.protocol',
    status: 'fail',
    title: 'Usa una versión de cifrado obsoleta',
    detail: `El servidor ha negociado ${protocol ?? 'un protocolo desconocido'}, que está retirado por inseguro.`,
    risk: 'Los navegadores modernos pueden rechazar la conexión y el cifrado es vulnerable.',
    fix: fixFor('ssl.protocol'),
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
): Promise<Finding> {
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
          title: 'No hay versión sin cifrar de tu web',
          detail: 'Tu servidor no responde por http, así que nadie puede ver la web sin cifrar.',
          risk: 'Sin problemas, aunque lo habitual es redirigir http a https.',
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
          title: 'La versión sin cifrar redirige a la segura',
          detail: `Quien entra por http://${domain} acaba en ${next.origin}.`,
          risk: 'Sin problemas.',
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
    title: 'Tu web se puede ver sin cifrar',
    detail: `Si alguien entra por http://${domain}, la web se carga sin el candado en lugar de llevarle a la versión segura.`,
    risk: 'Los datos de esa visita viajan sin cifrar y el navegador marca la página como "No segura".',
    fix: fixFor('ssl.redirect'),
    evidence: { finalUrl: url.href },
  };
}
