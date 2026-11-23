import { checkEmailDns } from './checks/emailDns';
import { analyzeEmailExposure, fetchRelatedPages } from './checks/emailExposure';
import { checkHeaders } from './checks/headers';
import { checkPrivacy, PRIVACY_DISCLAIMER } from './checks/privacy';
import { checkSsl, type SslDeps } from './checks/ssl';
import { errorFinding } from './findings';
import type { DnsClient } from './net/dnsClient';
import { isScanError } from './net/errors';
import { safeFetch, type SafeResponse } from './net/safeFetch';
import type { Category, Finding } from './types';

export type ScanDeps = {
  fetch?: typeof safeFetch;
  probe?: SslDeps['probe'];
  dns?: DnsClient;
  now?: () => Date;
};

export type ScanResult = {
  domain: string;
  scannedAt: string;
  /** URL de la página de inicio tras las redirecciones, si se pudo cargar. */
  finalUrl: string | null;
  durationMs: number;
  findings: Finding[];
  /** Avisos generales para mostrar con el informe (p. ej. carácter orientativo del RGPD). */
  notices: string[];
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

/** Se llama cada vez que termina una categoría, para mostrar el progreso real. */
export type ProgressHandler = (category: Category, findings: Finding[]) => void;

/**
 * Ejecuta todas las comprobaciones en paralelo. Un check que falla se convierte
 * en un hallazgo `error`: nunca tumba el informe entero.
 */
export async function runScan(
  domain: string,
  deps: ScanDeps = {},
  onProgress?: ProgressHandler,
): Promise<ScanResult> {
  const started = Date.now();
  const fetcher = deps.fetch ?? safeFetch;

  const home = fetchHomepage(domain, fetcher);
  const pages = home.then((page) => fetchRelatedPages(page, fetcher));
  // Evita avisos de promesas rechazadas sin manejar: cada categoría las trata.
  home.catch(() => {});
  pages.catch(() => {});

  const tasks: Record<Category, Promise<Finding[]>> = {
    ssl: guard('ssl.certificate', 'ssl', () =>
      checkSsl(domain, { fetch: fetcher, probe: deps.probe, now: deps.now }),
    ),
    headers: guard('headers.fetch', 'headers', async () => checkHeaders(await home)),
    email: Promise.all([
      guard('email.dns', 'email', () => checkEmailDns(domain, deps.dns)),
      guard('email.exposed', 'email', async () => [analyzeEmailExposure(await pages)]),
    ]).then((parts) => parts.flat()),
    privacy: guard('privacy.scan', 'privacy', async () => checkPrivacy(await home, await pages)),
  };

  const categories = Object.keys(tasks) as Category[];
  for (const category of categories) {
    void tasks[category].then((findings) => onProgress?.(category, findings));
  }
  const results = await Promise.all(categories.map((c) => tasks[c]));
  const homePage = await home.catch(() => null);

  return {
    domain,
    scannedAt: (deps.now?.() ?? new Date()).toISOString(),
    finalUrl: homePage?.url ?? null,
    durationMs: Date.now() - started,
    findings: results.flat(),
    notices: [PRIVACY_DISCLAIMER],
  };
}

/** Ejecuta un check y convierte cualquier excepción en un hallazgo de error. */
async function guard(
  id: string,
  category: Category,
  run: () => Finding[] | Promise<Finding[]>,
): Promise<Finding[]> {
  try {
    return await run();
  } catch (error) {
    return [errorFinding(id, category, error)];
  }
}
