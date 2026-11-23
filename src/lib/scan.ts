import { checkHeaders } from './checks/headers';
import { checkSsl, type SslDeps } from './checks/ssl';
import { errorFinding } from './findings';
import { isScanError } from './net/errors';
import { safeFetch, type SafeResponse } from './net/safeFetch';
import type { Finding } from './types';

export type ScanDeps = {
  fetch?: typeof safeFetch;
  probe?: SslDeps['probe'];
  now?: () => Date;
};

export type ScanResult = {
  domain: string;
  scannedAt: string;
  /** URL de la página de inicio tras las redirecciones, si se pudo cargar. */
  finalUrl: string | null;
  durationMs: number;
  findings: Finding[];
};

/**
 * Carga la página de inicio una sola vez para todos los checks que la necesitan.
 * Prueba https y, si no hay forma de conectar, http. Acepta certificados
 * inválidos para poder revisar las cabeceras de webs con el SSL roto (el
 * check SSL ya informa de ello); solo se lee, nunca se envían datos.
 */
export async function fetchHomepage(
  domain: string,
  fetcher: typeof safeFetch = safeFetch,
): Promise<SafeResponse> {
  try {
    return await fetcher(`https://${domain}/`, { acceptInvalidCert: true });
  } catch (error) {
    if (isScanError(error) && (error.code === 'network' || error.code === 'timeout')) {
      return fetcher(`http://${domain}/`, { acceptInvalidCert: true });
    }
    throw error;
  }
}

/**
 * Ejecuta todas las comprobaciones en paralelo. Un check que falla se convierte
 * en un hallazgo `error`: nunca tumba el informe entero.
 */
export async function runScan(domain: string, deps: ScanDeps = {}): Promise<ScanResult> {
  const started = Date.now();
  const fetcher = deps.fetch ?? safeFetch;

  const [ssl, home] = await Promise.allSettled([
    checkSsl(domain, { fetch: fetcher, probe: deps.probe, now: deps.now }),
    fetchHomepage(domain, fetcher),
  ]);

  const findings: Finding[] = [
    ...(ssl.status === 'fulfilled'
      ? ssl.value
      : [errorFinding('ssl.certificate', 'ssl', ssl.reason)]),
    ...(home.status === 'fulfilled'
      ? checkHeaders(home.value)
      : [errorFinding('headers.fetch', 'headers', home.reason)]),
  ];

  return {
    domain,
    scannedAt: (deps.now?.() ?? new Date()).toISOString(),
    finalUrl: home.status === 'fulfilled' ? home.value.url : null,
    durationMs: Date.now() - started,
    findings,
  };
}
