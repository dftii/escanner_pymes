import { fixFor } from '../data/remediation';
import { messages, type Locale } from '../i18n';
import type { Finding } from '../types';

/** Lo mínimo que necesita el check: la URL final y sus cabeceras. */
export type PageResponse = { url: string; headers: Headers };

/** 180 días: por debajo, HSTS protege poco entre visitas. */
export const HSTS_MIN_MAX_AGE = 15_552_000;

const base = { category: 'headers' } as const;

export const MSG = messages({
  es: {
    noProblems: 'Sin problemas.',
    hstsNaTitle: 'HSTS no aplica: la web no se sirve por HTTPS',
    hstsNaDetail:
      'Esta protección solo funciona cuando la web ya tiene HTTPS. Revisa primero el certificado.',
    hstsNaRisk: 'Ver el apartado del certificado SSL.',
    hstsMissingTitle: 'Falta HSTS (obligar siempre a usar la conexión segura)',
    hstsMissingDetail: 'El navegador no sabe que tu web debe abrirse siempre con https.',
    hstsMissingRisk: 'En una wifi pública alguien podría forzar la versión sin cifrar de tu web.',
    hstsShortTitle: 'HSTS está activado, pero dura muy poco',
    hstsShortDetail: (v: string) =>
      `La cabecera tiene max-age=${v} segundos; lo recomendable es al menos 6 meses (15552000).`,
    hstsShortRisk: 'La protección caduca pronto y deja de aplicarse entre visitas.',
    hstsOkTitle: 'HSTS activado',
    hstsOkDetail: 'El navegador siempre abrirá tu web con conexión segura.',
    cspReportTitle: 'Política de contenido (CSP) solo en modo prueba',
    cspMissingTitle: 'Falta una política de seguridad de contenido (CSP)',
    cspReportDetail:
      'Tienes una CSP en modo "solo informar": avisa de problemas pero aún no bloquea nada.',
    cspMissingDetail: 'No hay reglas que limiten qué scripts y recursos puede cargar tu web.',
    cspMissingRisk:
      'Si alguien consigue inyectar código en tu web (por ejemplo con un plugin vulnerable), nada lo frena.',
    cspWeakTitle: 'Tienes CSP, pero permite scripts incrustados',
    cspOkTitle: 'Política de seguridad de contenido (CSP) activada',
    cspWeakDetail:
      "La política incluye 'unsafe-inline' en los scripts, lo que reduce mucho su protección.",
    cspOkDetail: 'Tu web limita qué recursos se pueden cargar.',
    cspWeakRisk: 'Protege menos frente a la inyección de código.',
    xctoOkTitle: 'Protección contra archivos disfrazados activada',
    xctoBadTitle: 'Falta X-Content-Type-Options',
    xctoOkDetail: 'El navegador no intentará adivinar el tipo de los archivos.',
    xctoBadDetail:
      'El navegador podría interpretar un archivo subido (por ejemplo, una imagen) como código.',
    xctoBadRisk: 'Facilita ciertos ataques con archivos manipulados.',
    frameOkTitle: 'Tu web no se puede incrustar en otras páginas',
    frameBadTitle: 'Tu web se puede incrustar dentro de otras páginas',
    frameOkDetail: 'Está protegida contra el "clickjacking".',
    frameBadDetail: 'Falta X-Frame-Options (o frame-ancestors en la CSP).',
    frameBadRisk:
      'Alguien podría mostrar tu web dentro de la suya y engañar a tus clientes para que hagan clic donde no quieren.',
    refMissingTitle: 'No defines una política de referencia (Referrer-Policy)',
    refMissingDetail:
      'Los navegadores actuales aplican una política razonable por defecto, pero es mejor fijarla.',
    refMissingRisk:
      'Con navegadores antiguos, las direcciones completas de tu web pueden enviarse a otras webs.',
    refWeakTitle: 'La política de referencia comparte demasiado',
    refOkTitle: 'Política de referencia correcta',
    refWeakDetail: (p: string) =>
      `"${p}" envía la dirección completa de cada página a las webs enlazadas.`,
    refOkDetail: (p: string) => `Usas "${p}".`,
    refWeakRisk:
      'Datos de las direcciones (por ejemplo, parámetros de un formulario) pueden llegar a terceros.',
    permOkTitle: 'Permisos del navegador limitados (Permissions-Policy)',
    permOkDetail: 'Tu web indica qué funciones del dispositivo puede usar.',
    permMissingTitle: 'No limitas los permisos del navegador (Permissions-Policy)',
    permMissingDetail:
      'No indicas qué funciones (cámara, micrófono, ubicación) puede usar tu web o el contenido incrustado.',
    permMissingRisk: 'Un script de terceros podría pedir permisos que tu web no necesita.',
    discOkTitle: 'Tu web no anuncia qué software ni versión usa',
    discOkDetail: 'Las cabeceras no revelan versiones del servidor.',
    discBadTitle: 'Tu web revela qué software y versión usa',
    discBadDetail: (list: string) => `Las cabeceras muestran: ${list}.`,
    discBadRisk:
      'A un atacante le resulta más fácil buscar fallos conocidos de esa versión concreta.',
  },
  ca: {
    noProblems: 'Cap problema.',
    hstsNaTitle: "HSTS no s'aplica: el web no se serveix per HTTPS",
    hstsNaDetail:
      'Aquesta protecció només funciona quan el web ja té HTTPS. Revisa primer el certificat.',
    hstsNaRisk: "Mira l'apartat del certificat SSL.",
    hstsMissingTitle: 'Falta HSTS (obligar sempre a fer servir la connexió segura)',
    hstsMissingDetail: "El navegador no sap que el teu web s'ha d'obrir sempre amb https.",
    hstsMissingRisk: 'En una wifi pública algú podria forçar la versió sense xifrar del teu web.',
    hstsShortTitle: 'HSTS està activat, però dura molt poc',
    hstsShortDetail: (v: string) =>
      `La capçalera té max-age=${v} segons; el recomanable és com a mínim 6 mesos (15552000).`,
    hstsShortRisk: "La protecció caduca aviat i deixa d'aplicar-se entre visites.",
    hstsOkTitle: 'HSTS activat',
    hstsOkDetail: 'El navegador sempre obrirà el teu web amb connexió segura.',
    cspReportTitle: 'Política de contingut (CSP) només en mode de prova',
    cspMissingTitle: 'Falta una política de seguretat de contingut (CSP)',
    cspReportDetail:
      'Tens una CSP en mode "només informar": avisa de problemes però encara no bloqueja res.',
    cspMissingDetail:
      'No hi ha regles que limitin quins scripts i recursos pot carregar el teu web.',
    cspMissingRisk:
      'Si algú aconsegueix injectar codi al teu web (per exemple amb un plugin vulnerable), res no ho atura.',
    cspWeakTitle: 'Tens CSP, però permet scripts incrustats',
    cspOkTitle: 'Política de seguretat de contingut (CSP) activada',
    cspWeakDetail:
      "La política inclou 'unsafe-inline' als scripts, cosa que en redueix molt la protecció.",
    cspOkDetail: 'El teu web limita quins recursos es poden carregar.',
    cspWeakRisk: 'Protegeix menys contra la injecció de codi.',
    xctoOkTitle: 'Protecció contra fitxers disfressats activada',
    xctoBadTitle: 'Falta X-Content-Type-Options',
    xctoOkDetail: 'El navegador no intentarà endevinar el tipus dels fitxers.',
    xctoBadDetail:
      'El navegador podria interpretar un fitxer pujat (per exemple, una imatge) com a codi.',
    xctoBadRisk: 'Facilita certs atacs amb fitxers manipulats.',
    frameOkTitle: 'El teu web no es pot incrustar en altres pàgines',
    frameBadTitle: "El teu web es pot incrustar dins d'altres pàgines",
    frameOkDetail: 'Està protegit contra el "clickjacking".',
    frameBadDetail: 'Falta X-Frame-Options (o frame-ancestors a la CSP).',
    frameBadRisk:
      'Algú podria mostrar el teu web dins del seu i enganyar els teus clients perquè facin clic on no volen.',
    refMissingTitle: 'No defineixes una política de referència (Referrer-Policy)',
    refMissingDetail:
      'Els navegadors actuals apliquen una política raonable per defecte, però és millor fixar-la.',
    refMissingRisk:
      'Amb navegadors antics, les adreces completes del teu web es poden enviar a altres webs.',
    refWeakTitle: 'La política de referència comparteix massa',
    refOkTitle: 'Política de referència correcta',
    refWeakDetail: (p: string) =>
      `"${p}" envia l'adreça completa de cada pàgina als webs enllaçats.`,
    refOkDetail: (p: string) => `Fas servir "${p}".`,
    refWeakRisk:
      "Dades de les adreces (per exemple, paràmetres d'un formulari) poden arribar a tercers.",
    permOkTitle: 'Permisos del navegador limitats (Permissions-Policy)',
    permOkDetail: 'El teu web indica quines funcions del dispositiu pot fer servir.',
    permMissingTitle: 'No limites els permisos del navegador (Permissions-Policy)',
    permMissingDetail:
      'No indiques quines funcions (càmera, micròfon, ubicació) pot fer servir el teu web o el contingut incrustat.',
    permMissingRisk: 'Un script de tercers podria demanar permisos que el teu web no necessita.',
    discOkTitle: 'El teu web no anuncia quin programari ni versió fa servir',
    discOkDetail: 'Les capçaleres no revelen versions del servidor.',
    discBadTitle: 'El teu web revela quin programari i versió fa servir',
    discBadDetail: (list: string) => `Les capçaleres mostren: ${list}.`,
    discBadRisk:
      "A un atacant li resulta més fàcil buscar errors coneguts d'aquesta versió concreta.",
  },
  en: {
    noProblems: 'No problems.',
    hstsNaTitle: 'HSTS does not apply: the website is not served over HTTPS',
    hstsNaDetail:
      'This protection only works once the website has HTTPS. Check the certificate first.',
    hstsNaRisk: 'See the SSL certificate section.',
    hstsMissingTitle: 'HSTS is missing (always force the secure connection)',
    hstsMissingDetail: 'The browser does not know your website must always open over https.',
    hstsMissingRisk: 'On public wifi, someone could force the unencrypted version of your website.',
    hstsShortTitle: 'HSTS is on, but it lasts very little',
    hstsShortDetail: (v: string) =>
      `The header has max-age=${v} seconds; at least 6 months (15552000) is recommended.`,
    hstsShortRisk: 'The protection expires soon and stops applying between visits.',
    hstsOkTitle: 'HSTS is on',
    hstsOkDetail: 'The browser will always open your website over a secure connection.',
    cspReportTitle: 'Content policy (CSP) in test mode only',
    cspMissingTitle: 'Content Security Policy (CSP) is missing',
    cspReportDetail:
      'You have a CSP in "report only" mode: it reports problems but does not block anything yet.',
    cspMissingDetail:
      'There are no rules limiting which scripts and resources your website can load.',
    cspMissingRisk:
      'If someone manages to inject code into your website (for example through a vulnerable plugin), nothing stops it.',
    cspWeakTitle: 'You have a CSP, but it allows inline scripts',
    cspOkTitle: 'Content Security Policy (CSP) is on',
    cspWeakDetail:
      "The policy includes 'unsafe-inline' for scripts, which greatly reduces its protection.",
    cspOkDetail: 'Your website limits which resources can be loaded.',
    cspWeakRisk: 'It gives less protection against code injection.',
    xctoOkTitle: 'Protection against disguised files is on',
    xctoBadTitle: 'X-Content-Type-Options is missing',
    xctoOkDetail: 'The browser will not try to guess the type of files.',
    xctoBadDetail: 'The browser could treat an uploaded file (for example, an image) as code.',
    xctoBadRisk: 'It makes some attacks with tampered files easier.',
    frameOkTitle: 'Your website cannot be embedded in other pages',
    frameBadTitle: 'Your website can be embedded inside other pages',
    frameOkDetail: 'It is protected against "clickjacking".',
    frameBadDetail: 'X-Frame-Options (or frame-ancestors in the CSP) is missing.',
    frameBadRisk:
      'Someone could show your website inside theirs and trick your customers into clicking where they do not mean to.',
    refMissingTitle: 'You do not set a referrer policy (Referrer-Policy)',
    refMissingDetail:
      'Modern browsers apply a reasonable policy by default, but it is better to set one.',
    refMissingRisk:
      'With old browsers, the full addresses of your pages can be sent to other websites.',
    refWeakTitle: 'The referrer policy shares too much',
    refOkTitle: 'Referrer policy is correct',
    refWeakDetail: (p: string) =>
      `"${p}" sends the full address of every page to the websites it links to.`,
    refOkDetail: (p: string) => `You use "${p}".`,
    refWeakRisk: 'Data in the addresses (for example, form parameters) can reach third parties.',
    permOkTitle: 'Browser permissions are limited (Permissions-Policy)',
    permOkDetail: 'Your website states which device features it can use.',
    permMissingTitle: 'You do not limit browser permissions (Permissions-Policy)',
    permMissingDetail:
      'You do not state which features (camera, microphone, location) your website or embedded content can use.',
    permMissingRisk: 'A third-party script could ask for permissions your website does not need.',
    discOkTitle: 'Your website does not reveal its software or version',
    discOkDetail: 'The headers do not reveal server versions.',
    discBadTitle: 'Your website reveals its software and version',
    discBadDetail: (list: string) => `The headers show: ${list}.`,
    discBadRisk: 'It is easier for an attacker to look up known flaws in that specific version.',
  },
});

type M = (typeof MSG)['es'];

/**
 * Cabeceras de seguridad de la página de inicio. Función pura: no hace red.
 */
export function checkHeaders(page: PageResponse, locale: Locale = 'es'): Finding[] {
  const m = MSG[locale];
  const h = page.headers;
  const https = page.url.startsWith('https:');
  const csp = h.get('content-security-policy');
  return [
    hsts(h.get('strict-transport-security'), https, m, locale),
    contentSecurityPolicy(csp, h.get('content-security-policy-report-only'), m, locale),
    nosniff(h.get('x-content-type-options'), m, locale),
    framing(h.get('x-frame-options'), csp, m, locale),
    referrer(h.get('referrer-policy'), m, locale),
    permissions(h.get('permissions-policy'), m, locale),
    disclosure(h, m, locale),
  ];
}

function hsts(value: string | null, https: boolean, m: M, locale: Locale): Finding {
  const id = 'headers.hsts';
  if (!https) {
    return {
      ...base,
      id,
      status: 'info',
      title: m.hstsNaTitle,
      detail: m.hstsNaDetail,
      risk: m.hstsNaRisk,
      fix: [],
    };
  }
  if (!value) {
    return {
      ...base,
      id,
      status: 'warning',
      title: m.hstsMissingTitle,
      detail: m.hstsMissingDetail,
      risk: m.hstsMissingRisk,
      fix: fixFor('headers.hsts', locale),
    };
  }
  const maxAge = Number(/max-age\s*=\s*"?(\d+)/i.exec(value)?.[1] ?? NaN);
  if (!Number.isFinite(maxAge) || maxAge < HSTS_MIN_MAX_AGE) {
    return {
      ...base,
      id,
      status: 'warning',
      title: m.hstsShortTitle,
      detail: m.hstsShortDetail(Number.isFinite(maxAge) ? String(maxAge) : '¿?'),
      risk: m.hstsShortRisk,
      fix: fixFor('headers.hsts', locale),
      evidence: { value },
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title: m.hstsOkTitle,
    detail: m.hstsOkDetail,
    risk: m.noProblems,
    fix: [],
    evidence: { value },
  };
}

function contentSecurityPolicy(
  value: string | null,
  reportOnly: string | null,
  m: M,
  locale: Locale,
): Finding {
  const id = 'headers.csp';
  if (!value) {
    return {
      ...base,
      id,
      status: reportOnly ? 'info' : 'warning',
      title: reportOnly ? m.cspReportTitle : m.cspMissingTitle,
      detail: reportOnly ? m.cspReportDetail : m.cspMissingDetail,
      risk: m.cspMissingRisk,
      fix: fixFor('headers.csp', locale),
      evidence: reportOnly ? { reportOnly } : undefined,
    };
  }
  const scriptSrc =
    /(?:^|;)\s*script-src\s+([^;]*)/i.exec(value)?.[1] ??
    /(?:^|;)\s*default-src\s+([^;]*)/i.exec(value)?.[1] ??
    '';
  const weak =
    /'unsafe-inline'/.test(scriptSrc) &&
    !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(scriptSrc);
  return {
    ...base,
    id,
    status: weak ? 'info' : 'ok',
    title: weak ? m.cspWeakTitle : m.cspOkTitle,
    detail: weak ? m.cspWeakDetail : m.cspOkDetail,
    risk: weak ? m.cspWeakRisk : m.noProblems,
    fix: weak ? fixFor('headers.csp', locale) : [],
    evidence: { value },
  };
}

function nosniff(value: string | null, m: M, locale: Locale): Finding {
  const ok = value?.trim().toLowerCase() === 'nosniff';
  return {
    ...base,
    id: 'headers.xcto',
    status: ok ? 'ok' : 'warning',
    title: ok ? m.xctoOkTitle : m.xctoBadTitle,
    detail: ok ? m.xctoOkDetail : m.xctoBadDetail,
    risk: ok ? m.noProblems : m.xctoBadRisk,
    fix: ok ? [] : fixFor('headers.xcto', locale),
    evidence: value ? { value } : undefined,
  };
}

function framing(xfo: string | null, csp: string | null, m: M, locale: Locale): Finding {
  const xfoOk = !!xfo && /^(deny|sameorigin)$/i.test(xfo.trim());
  const cspOk = !!csp && /(?:^|;)\s*frame-ancestors\s/i.test(csp);
  const ok = xfoOk || cspOk;
  return {
    ...base,
    id: 'headers.framing',
    status: ok ? 'ok' : 'warning',
    title: ok ? m.frameOkTitle : m.frameBadTitle,
    detail: ok ? m.frameOkDetail : m.frameBadDetail,
    risk: ok ? m.noProblems : m.frameBadRisk,
    fix: ok ? [] : fixFor('headers.framing', locale),
    evidence: xfo || cspOk ? { xFrameOptions: xfo, frameAncestors: cspOk } : undefined,
  };
}

const WEAK_REFERRER = new Set(['unsafe-url', 'no-referrer-when-downgrade']);

function referrer(value: string | null, m: M, locale: Locale): Finding {
  const id = 'headers.referrer';
  if (!value) {
    return {
      ...base,
      id,
      status: 'info',
      title: m.refMissingTitle,
      detail: m.refMissingDetail,
      risk: m.refMissingRisk,
      fix: fixFor('headers.referrer', locale),
    };
  }
  const policies = value
    .toLowerCase()
    .split(',')
    .map((p) => p.trim());
  const effective = policies.at(-1) ?? '';
  const weak = WEAK_REFERRER.has(effective);
  return {
    ...base,
    id,
    status: weak ? 'warning' : 'ok',
    title: weak ? m.refWeakTitle : m.refOkTitle,
    detail: weak ? m.refWeakDetail(effective) : m.refOkDetail(effective),
    risk: weak ? m.refWeakRisk : m.noProblems,
    fix: weak ? fixFor('headers.referrer', locale) : [],
    evidence: { value },
  };
}

function permissions(value: string | null, m: M, locale: Locale): Finding {
  return value
    ? {
        ...base,
        id: 'headers.permissions',
        status: 'ok',
        title: m.permOkTitle,
        detail: m.permOkDetail,
        risk: m.noProblems,
        fix: [],
        evidence: { value },
      }
    : {
        ...base,
        id: 'headers.permissions',
        status: 'info',
        title: m.permMissingTitle,
        detail: m.permMissingDetail,
        risk: m.permMissingRisk,
        fix: fixFor('headers.permissions', locale),
      };
}

const VERSION_RE = /\d+(\.\d+)+/;

function disclosure(h: Headers, m: M, locale: Locale): Finding {
  const leaks: Record<string, string> = {};
  const server = h.get('server');
  if (server && VERSION_RE.test(server)) leaks.server = server;
  for (const name of ['x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version', 'x-generator']) {
    const value = h.get(name);
    if (value) leaks[name] = value;
  }
  const names = Object.keys(leaks);
  if (names.length === 0) {
    return {
      ...base,
      id: 'headers.disclosure',
      status: 'ok',
      title: m.discOkTitle,
      detail: m.discOkDetail,
      risk: m.noProblems,
      fix: [],
      evidence: server ? { server } : undefined,
    };
  }
  return {
    ...base,
    id: 'headers.disclosure',
    status: 'warning',
    title: m.discBadTitle,
    detail: m.discBadDetail(
      Object.entries(leaks)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · '),
    ),
    risk: m.discBadRisk,
    fix: fixFor('headers.disclosure', locale),
    evidence: leaks,
  };
}
