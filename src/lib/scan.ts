import { checkEmailDns } from './checks/emailDns';
import { analyzeEmailExposure, fetchRelatedPages } from './checks/emailExposure';
import { checkHeaders } from './checks/headers';
import { checkBreaches } from './checks/breaches';
import {
  analyzeBrowserCookies,
  BROWSER_FINDING_ID,
  createBrowserRunner,
  isHeadlessEnabled,
  type BrowserRunner,
} from './checks/browserCookies';
import { mixedContentFinding } from './checks/mixedContent';
import { checkPrivacy, parseSetCookie, PRIVACY_DISCLAIMER } from './checks/privacy';
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
  /**
   * Navegador para la fase 2 de cookies. `undefined` lo decide `ENABLE_HEADLESS`;
   * `null` lo desactiva siempre.
   */
  browser?: BrowserRunner | null;
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
  const browser =
    deps.browser === undefined
      ? isHeadlessEnabled()
        ? createBrowserRunner()
        : null
      : deps.browser;

  const home = fetchHomepage(domain, fetcher);
  const pages = home.then((page) => fetchRelatedPages(page, fetcher));
  // Evita avisos de promesas rechazadas sin manejar: cada categoría las trata.
  home.catch(() => {});
  pages.catch(() => {});

  const tasks: Record<Category, Promise<Finding[]>> = {
    ssl: Promise.all([
      guard('ssl.certificate', 'ssl', () =>
        checkSsl(domain, { fetch: fetcher, probe: deps.probe, now: deps.now }),
      ),
      guard('ssl.mixed_content', 'ssl', async () => {
        const finding = mixedContentFinding(await pages);
        return finding ? [finding] : [];
      }),
    ]).then((parts) => parts.flat()),
    headers: guard('headers.fetch', 'headers', async () => checkHeaders(await home)),
    email: Promise.all([
      guard('email.dns', 'email', () => checkEmailDns(domain, deps.dns)),
      guard('email.exposed', 'email', async () => [analyzeEmailExposure(await pages)]),
    ]).then((parts) => parts.flat()),
    privacy: Promise.all([
      guard('privacy.scan', 'privacy', async () => checkPrivacy(await home, await pages)),
      guard('privacy.breaches', 'privacy', async () => [
        await checkBreaches(domain, { fetch: fetcher, now: deps.now }),
      ]),
      browser
        ? guard(BROWSER_FINDING_ID, 'privacy', async () => {
            const observation = await browser(domain);
            return [analyzeBrowserCookies(observation, await serverCookieNames(home))];
          })
        : Promise.resolve([]),
    ]).then((parts) => parts.flat()),
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

/** Cookies que ya envió el servidor (las evalúa `privacy.cookies`). */
async function serverCookieNames(home: Promise<SafeResponse>): Promise<string[]> {
  const page = await home.catch(() => null);
  if (!page) return [];
  return [...page.redirects.flatMap((r) => r.setCookies), ...page.setCookies]
    .map((h) => parseSetCookie(h)?.name)
    .filter((n): n is string => !!n);
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
