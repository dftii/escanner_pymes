import type { Page } from 'playwright-core';
import { TRACKERS, type CookieKind } from '../data/known-cookies';
import { fixFor } from '../data/remediation';
import { messages, type Locale } from '../i18n';
import { startEgressProxy, type EgressProxyOptions } from '../net/egressProxy';
import { ScanError } from '../net/errors';
import { USER_AGENT } from '../net/safeFetch';
import type { Finding } from '../types';
import { classifyCookie } from './privacy';
import { localizeLabel } from './privacy.messages';

/**
 * Cookies y RGPD, fase 2: abre la web en un Chromium real (sin aceptar nada,
 * sin hacer clic, sin enviar formularios) y mira qué cookies crean los
 * scripts al ejecutarse. Solo se activa con `ENABLE_HEADLESS=true`.
 */

export const BROWSER_FINDING_ID = 'privacy.cookies_js';

export type BrowserCookie = { name: string; domain: string };

/** Lo que vio el navegador al cargar la web. */
export type BrowserObservation = {
  finalUrl: string;
  cookies: BrowserCookie[];
  /** URLs pedidas por la página (para saber a qué servicios de seguimiento llamó). */
  requests: string[];
  /** Conexiones que el proxy cortó por apuntar a direcciones internas o puertos raros. */
  blocked: number;
};

export type BrowserRunner = (domain: string) => Promise<BrowserObservation>;

export const isHeadlessEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  /^(1|true|yes)$/i.test(env.ENABLE_HEADLESS ?? '');

// ─── Análisis (función pura) ─────────────────────────────────────────────────

type ClassifiedCookie = BrowserCookie & {
  kind: CookieKind | 'unknown';
  owner: string | null;
  thirdParty: boolean;
};

/** Dominio base aproximado: quita `www.` y los puntos iniciales. */
const siteOf = (host: string) =>
  host
    .replace(/^\.+/, '')
    .replace(/^www\./i, '')
    .toLowerCase();

export function isThirdParty(cookieDomain: string, pageUrl: string): boolean {
  const site = siteOf(new URL(pageUrl).hostname);
  const domain = siteOf(cookieDomain);
  return !(domain === site || domain.endsWith(`.${site}`) || site.endsWith(`.${domain}`));
}

/** Servicios de seguimiento a los que la página llamó, por las URLs pedidas. */
export function trackersContacted(requests: readonly string[]): string[] {
  const found = new Set<string>();
  for (const url of requests) {
    for (const tracker of TRACKERS) {
      if (tracker.src?.test(url)) found.add(tracker.name);
    }
  }
  return [...found];
}

export const MSG = messages({
  es: {
    unknown: 'desconocida',
    contacted: (list: string) => ` Además, la página llamó a: ${list}.`,
    failTitle: 'Los scripts de tu web instalan cookies de seguimiento sin pedir permiso',
    failDetail: (list: string, contacted: string) =>
      `Abrimos tu web con un navegador real, sin aceptar nada, y se crearon: ${list}.${contacted}`,
    failRisk:
      'Estas cookies necesitan consentimiento previo: instalarlas antes de que el usuario acepte es de lo que más sanciona la AEPD.',
    unknownTitle: 'Los scripts de tu web crean cookies que no reconocemos',
    unknownDetail: (list: string, contacted: string) =>
      `Con un navegador real, sin aceptar nada, se crearon: ${list}.${contacted}`,
    unknownRisk:
      'Si no son técnicas (necesarias para que la web funcione), necesitan consentimiento previo.',
    okTitle: 'Sin cookies de seguimiento al cargar la web con un navegador real',
    okTechnical: (list: string) =>
      `Los scripts solo crean cookies técnicas o de preferencias: ${list}.`,
    okNone:
      'Abrimos tu web con un navegador real, sin aceptar nada, y los scripts no crearon cookies.',
    okRisk: 'Las cookies técnicas no necesitan consentimiento.',
  },
  ca: {
    unknown: 'desconeguda',
    contacted: (list: string) => ` A més, la pàgina va cridar: ${list}.`,
    failTitle: 'Els scripts del teu web instal·len galetes de seguiment sense demanar permís',
    failDetail: (list: string, contacted: string) =>
      `Vam obrir el teu web amb un navegador real, sense acceptar res, i es van crear: ${list}.${contacted}`,
    failRisk:
      "Aquestes galetes necessiten consentiment previ: instal·lar-les abans que l'usuari accepti és del que més sanciona l'AEPD.",
    unknownTitle: 'Els scripts del teu web creen galetes que no reconeixem',
    unknownDetail: (list: string, contacted: string) =>
      `Amb un navegador real, sense acceptar res, es van crear: ${list}.${contacted}`,
    unknownRisk:
      'Si no són tècniques (necessàries perquè el web funcioni), necessiten consentiment previ.',
    okTitle: 'Sense galetes de seguiment en carregar el web amb un navegador real',
    okTechnical: (list: string) =>
      `Els scripts només creen galetes tècniques o de preferències: ${list}.`,
    okNone:
      'Vam obrir el teu web amb un navegador real, sense acceptar res, i els scripts no van crear galetes.',
    okRisk: 'Les galetes tècniques no necessiten consentiment.',
  },
  en: {
    unknown: 'unknown',
    contacted: (list: string) => ` The page also contacted: ${list}.`,
    failTitle: "Your website's scripts set tracking cookies without asking for permission",
    failDetail: (list: string, contacted: string) =>
      `We opened your website in a real browser, without accepting anything, and these were created: ${list}.${contacted}`,
    failRisk:
      'These cookies need prior consent: setting them before the user accepts is one of the breaches the Spanish DPA (AEPD) fines most.',
    unknownTitle: "Your website's scripts create cookies we do not recognise",
    unknownDetail: (list: string, contacted: string) =>
      `In a real browser, without accepting anything, these were created: ${list}.${contacted}`,
    unknownRisk:
      'If they are not technical (needed for the website to work), they need prior consent.',
    okTitle: 'No tracking cookies when loading the website in a real browser',
    okTechnical: (list: string) =>
      `The scripts only create technical or preference cookies: ${list}.`,
    okNone:
      'We opened your website in a real browser, without accepting anything, and the scripts created no cookies.',
    okRisk: 'Technical cookies do not need consent.',
  },
});

const describe = (c: ClassifiedCookie, locale: Locale) =>
  `${c.name} (${c.owner ? localizeLabel(c.owner, locale) : c.thirdParty ? siteOf(c.domain) : MSG[locale].unknown})`;

/**
 * @param serverCookies nombres de las cookies que ya puso el servidor: esas
 *   las evalúa `privacy.cookies` y aquí no se vuelven a penalizar.
 */
export function analyzeBrowserCookies(
  obs: BrowserObservation,
  serverCookies: readonly string[] = [],
  locale: Locale = 'es',
): Finding {
  const m = MSG[locale];
  const names = (list: ClassifiedCookie[]) => list.map((c) => describe(c, locale)).join(', ');
  const skip = new Set(serverCookies);
  const seen = new Set<string>();
  const cookies: ClassifiedCookie[] = [];
  for (const c of obs.cookies) {
    const key = `${c.name}@${c.domain}`;
    if (skip.has(c.name) || seen.has(key)) continue;
    seen.add(key);
    cookies.push({
      ...c,
      ...classifyCookie(c.name),
      thirdParty: isThirdParty(c.domain, obs.finalUrl),
    });
  }

  const contacted = trackersContacted(obs.requests);
  // Las de terceros sin clasificar son casi siempre de publicidad o de medición.
  const tracking = cookies.filter(
    (c) =>
      c.kind === 'analytics' || c.kind === 'advertising' || (c.kind === 'unknown' && c.thirdParty),
  );
  const unknown = cookies.filter((c) => c.kind === 'unknown' && !c.thirdParty);

  const evidence = {
    cookies: cookies.map(({ name, domain, kind, owner, thirdParty }) => ({
      name,
      domain,
      kind,
      owner,
      thirdParty,
    })),
    trackersContacted: contacted,
    blockedConnections: obs.blocked,
  };
  const base = { id: BROWSER_FINDING_ID, category: 'privacy' as const, evidence };
  const contactedText = contacted.length > 0 ? m.contacted(contacted.join(', ')) : '';

  if (tracking.length > 0) {
    return {
      ...base,
      status: 'fail',
      title: m.failTitle,
      detail: m.failDetail(names(tracking), contactedText),
      risk: m.failRisk,
      fix: fixFor('privacy.cookies_js', locale),
    };
  }
  if (unknown.length > 0) {
    return {
      ...base,
      status: 'info',
      title: m.unknownTitle,
      detail: m.unknownDetail(names(unknown), contactedText),
      risk: m.unknownRisk,
      fix: fixFor('privacy.cookies_unknown', locale),
    };
  }
  return {
    ...base,
    status: 'ok',
    title: m.okTitle,
    detail: cookies.length > 0 ? m.okTechnical(names(cookies)) : m.okNone,
    risk: m.okRisk,
    fix: [],
  };
}

// ─── Navegador ───────────────────────────────────────────────────────────────

export const BROWSER_LIMITS = {
  /** Tiempo máximo para cargar la página. */
  navigationMs: 15_000,
  /** Espera extra tras `load` para que los scripts diferidos creen sus cookies. */
  settleMs: 4_000,
  /** Navegadores abiertos a la vez por instancia (cada uno consume ~150 MB). */
  concurrency: 2,
} as const;

let running = 0;

export type BrowserRunnerOptions = {
  /** Ruta a Chromium. Por defecto `CHROMIUM_PATH` o el de Playwright. */
  executablePath?: string;
  /** Para tests: opciones del proxy de salida (resolutor DNS o conexión simulada). */
  proxy?: EgressProxyOptions;
};

/**
 * Crea un `BrowserRunner` con Chromium vía `playwright-core`.
 *
 * Seguridad:
 * - Todo el tráfico sale por `startEgressProxy` (anti-SSRF en el momento de conectar),
 *   incluido el de loopback (`<-loopback>` anula la excepción por defecto).
 * - Sin service workers, sin descargas, sin permisos, sin interacción.
 * - Contexto nuevo y vacío en cada análisis; se cierra siempre.
 */
export function createBrowserRunner(options: BrowserRunnerOptions = {}): BrowserRunner {
  return async (domain) => {
    if (running >= BROWSER_LIMITS.concurrency) {
      throw new ScanError(
        'network',
        'El análisis con navegador está ocupado ahora mismo; vuelve a intentarlo en un minuto.',
        503,
      );
    }
    running++;
    const proxy = await startEgressProxy(options.proxy);
    try {
      const { chromium } = await import('playwright-core');
      const browser = await chromium.launch({
        executablePath: options.executablePath ?? process.env.CHROMIUM_PATH ?? undefined,
        proxy: { server: proxy.url, bypass: '<-loopback>' },
        args: [
          '--proxy-bypass-list=<-loopback>',
          '--disable-background-networking',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-extensions',
        ],
      });
      try {
        const context = await browser.newContext({
          userAgent: USER_AGENT,
          locale: 'es-ES',
          ignoreHTTPSErrors: true,
          serviceWorkers: 'block',
          acceptDownloads: false,
          permissions: [],
        });
        const requests: string[] = [];
        await context.route('**/*', (route) => {
          const req = route.request();
          if (!/^https?:/i.test(req.url())) return route.abort();
          if (req.resourceType() === 'media' || req.resourceType() === 'font') {
            return route.abort();
          }
          requests.push(req.url());
          return route.continue();
        });

        // Las ventanas emergentes se cierran y los diálogos se descartan, sin interactuar.
        context.on('page', (p) => {
          p.on('dialog', (d) => void d.dismiss().catch(() => {}));
          p.on('popup', (popup) => void popup.close().catch(() => {}));
        });
        let main: Page | null = null;

        /** Cada intento en una pestaña nueva: la página de error del anterior no interfiere. */
        const open = async (url: string) => {
          await main?.close().catch(() => {});
          main = await context.newPage();
          const res = await main.goto(url, {
            waitUntil: 'load',
            timeout: BROWSER_LIMITS.navigationMs,
          });
          return res ? main : null;
        };
        const page = await open(`https://${domain}/`)
          .catch(() => open(`http://${domain}/`))
          .catch(() => null);
        if (!page) {
          throw new ScanError(
            'network',
            'No hemos podido abrir tu web con el navegador; el resto del informe no se ve afectado.',
            502,
          );
        }
        // Algunos scripts esperan un poco antes de crear cookies.
        await Promise.all([
          page
            .waitForLoadState('networkidle', { timeout: BROWSER_LIMITS.settleMs })
            .catch(() => {}),
          page.waitForTimeout(1_500),
        ]);

        const cookies = await context.cookies();
        return {
          finalUrl: page.url(),
          cookies: cookies.map((c) => ({ name: c.name, domain: c.domain })),
          requests,
          blocked: proxy.blocked(),
        };
      } finally {
        await browser.close().catch(() => {});
      }
    } finally {
      running--;
      await proxy.close();
    }
  };
}
