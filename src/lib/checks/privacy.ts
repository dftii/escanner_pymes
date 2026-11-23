import * as cheerio from 'cheerio';
import {
  CMPS,
  KNOWN_COOKIES,
  TRACKERS,
  type CookieKind,
  type TrackerRule,
} from '../data/known-cookies';
import { fixFor } from '../data/remediation';
import type { SafeResponse } from '../net/safeFetch';
import type { Finding } from '../types';

/** Aviso que acompaña a todo el apartado de cookies y RGPD. */
export const PRIVACY_DISCLAIMER =
  'Los resultados sobre cookies y RGPD son orientativos: se basan en lo que se ve al cargar la web sin aceptar nada y no sustituyen el asesoramiento legal.';

const base = { category: 'privacy' } as const;

type Page = Pick<SafeResponse, 'url' | 'body' | 'setCookies' | 'redirects'>;

/**
 * Cookies y RGPD, fase 1 (sin navegador): cookies que instala el servidor,
 * scripts de seguimiento en el HTML inicial, banner de cookies, páginas
 * legales y formularios. Función pura: no hace red.
 */
export function checkPrivacy(home: Page, pages: readonly Page[] = [home]): Finding[] {
  const $ = cheerio.load(home.body);
  const all = pages.includes(home) ? pages : [home, ...pages];
  const cookies = collectCookies(all);
  const scripts = mergeScripts([
    analyzeScripts($),
    ...all.filter((p) => p !== home).map((p) => analyzeScripts(cheerio.load(p.body))),
  ]);
  const cmp = detectCmp(home.body, $);

  const needsConsent =
    cookies.some((c) => c.kind === 'analytics' || c.kind === 'advertising') ||
    scripts.active.length > 0 ||
    scripts.blocked.length > 0;

  return [
    cookiesFinding(cookies),
    trackersFinding(scripts, cmp),
    bannerFinding(cmp, needsConsent),
    ...legalFindings($, home.url, needsConsent || cmp.kind !== 'none'),
    formsFinding(pages),
  ];
}

// ─── Cookies del servidor ────────────────────────────────────────────────────

export type ServerCookie = {
  name: string;
  kind: CookieKind | 'unknown';
  owner: string | null;
  secure: boolean;
  httpOnly: boolean;
};

export function classifyCookie(name: string): {
  kind: CookieKind | 'unknown';
  owner: string | null;
} {
  const rule = KNOWN_COOKIES.find((r) => r.pattern.test(name));
  return rule ? { kind: rule.kind, owner: rule.owner } : { kind: 'unknown', owner: null };
}

export function parseSetCookie(header: string): ServerCookie | null {
  const [pair = '', ...attrs] = header.split(';');
  const name = pair.split('=')[0]?.trim();
  if (!name) return null;
  const flags = attrs.map((a) => a.trim().toLowerCase());
  return {
    name,
    ...classifyCookie(name),
    secure: flags.includes('secure'),
    httpOnly: flags.includes('httponly'),
  };
}

/** Cookies del servidor en todas las páginas revisadas (y sus redirecciones). */
function collectCookies(pages: readonly Page[]): ServerCookie[] {
  const headers = pages.flatMap((p) => [
    ...p.redirects.flatMap((r) => r.setCookies),
    ...p.setCookies,
  ]);
  const byName = new Map<string, ServerCookie>();
  for (const header of headers) {
    const cookie = parseSetCookie(header);
    if (cookie) byName.set(cookie.name, cookie);
  }
  return [...byName.values()];
}

const KIND_LABEL: Record<CookieKind | 'unknown', string> = {
  technical: 'técnica',
  preferences: 'de preferencias',
  analytics: 'de analítica',
  advertising: 'de publicidad',
  unknown: 'desconocida',
};

const describeCookie = (c: ServerCookie) => `${c.name} (${c.owner ?? KIND_LABEL[c.kind]})`;

function cookiesFinding(cookies: ServerCookie[]): Finding {
  const id = 'privacy.cookies';
  const evidence = { cookies: cookies.map(({ name, kind, owner }) => ({ name, kind, owner })) };
  const note =
    'Solo vemos las cookies que envía el servidor; las que crean los scripts se revisan en el apartado de seguimiento.';
  const tracking = cookies.filter((c) => c.kind === 'analytics' || c.kind === 'advertising');
  const unknown = cookies.filter((c) => c.kind === 'unknown');

  if (tracking.length > 0) {
    return {
      ...base,
      id,
      status: 'fail',
      title: 'Tu web instala cookies de seguimiento antes de pedir permiso',
      detail: `Nada más entrar, sin aceptar nada, se instalan: ${tracking.map(describeCookie).join(', ')}.`,
      risk: 'Es una de las infracciones que más sanciona la AEPD: estas cookies requieren consentimiento previo.',
      fix: fixFor('privacy.cookies'),
      evidence,
    };
  }
  if (unknown.length > 0) {
    return {
      ...base,
      id,
      status: 'info',
      title: 'Tu web instala cookies que no reconocemos',
      detail: `Al entrar se instalan: ${unknown.map(describeCookie).join(', ')}. ${note}`,
      risk: 'Si no son técnicas (necesarias para que la web funcione), necesitan consentimiento previo.',
      fix: fixFor('privacy.cookies_unknown'),
      evidence,
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title:
      cookies.length > 0
        ? 'Al entrar solo se instalan cookies técnicas'
        : 'Tu web no instala cookies desde el servidor al entrar',
    detail: `${cookies.length > 0 ? `Cookies: ${cookies.map(describeCookie).join(', ')}. ` : ''}${note}`,
    risk: 'Las cookies técnicas no necesitan consentimiento.',
    fix: [],
    evidence,
  };
}

// ─── Scripts de seguimiento ──────────────────────────────────────────────────

const JS_TYPES = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'module',
  'text/ecmascript',
]);

export type ScriptScan = {
  active: string[];
  blocked: string[];
  /** Google Consent Mode con "denied" por defecto. */
  consentModeDenied: boolean;
};

export function analyzeScripts($: cheerio.CheerioAPI): ScriptScan {
  const active = new Set<string>();
  const blocked = new Set<string>();
  let consentModeDenied = false;

  $('script').each((_, el) => {
    const $el = $(el);
    const type = ($el.attr('type') ?? '').trim().toLowerCase();
    const isBlocked = !JS_TYPES.has(type);
    const src = $el.attr('src') ?? $el.attr('data-src') ?? $el.attr('data-cmplz-src') ?? '';
    const code = $el.html() ?? '';
    if (
      !isBlocked &&
      /gtag\(\s*['"]consent['"]\s*,\s*['"]default['"][\s\S]{0,600}?['"]denied['"]/.test(code)
    ) {
      consentModeDenied = true;
    }
    for (const tracker of TRACKERS) {
      if (matchesTracker(tracker, src, code)) (isBlocked ? blocked : active).add(tracker.name);
    }
  });

  $('iframe').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const lazy = $(el).attr('data-src') ?? '';
    const youtube = /(^|\/\/)(www\.)?youtube\.com\/embed\//i;
    if (youtube.test(src)) active.add('Vídeo de YouTube incrustado');
    else if (youtube.test(lazy)) blocked.add('Vídeo de YouTube incrustado');
  });

  for (const name of active) blocked.delete(name);
  return { active: [...active], blocked: [...blocked], consentModeDenied };
}

/** Junta los scripts de varias páginas: activo en alguna gana a bloqueado. */
export function mergeScripts(scans: readonly ScriptScan[]): ScriptScan {
  const active = new Set(scans.flatMap((s) => s.active));
  const blocked = new Set(scans.flatMap((s) => s.blocked).filter((n) => !active.has(n)));
  return {
    active: [...active],
    blocked: [...blocked],
    consentModeDenied: scans.some((s) => s.consentModeDenied),
  };
}

function matchesTracker(tracker: TrackerRule, src: string, code: string): boolean {
  return (!!src && !!tracker.src?.test(src)) || (!!code && !!tracker.inline?.test(code));
}

const GOOGLE_TAGS = new Set(['Google Tag Manager', 'Google Analytics', 'Google Ads']);

function trackersFinding(scripts: ScriptScan, cmp: CmpDetection): Finding {
  const id = 'privacy.trackers';
  const evidence = { ...scripts, cmp: cmp.name };
  const blockedNote =
    scripts.blocked.length > 0
      ? ` Bloqueados hasta que el usuario acepte: ${scripts.blocked.join(', ')}.`
      : '';

  if (scripts.active.length === 0) {
    return {
      ...base,
      id,
      status: 'ok',
      title:
        scripts.blocked.length > 0
          ? 'Los scripts de seguimiento esperan al consentimiento'
          : 'No hemos visto scripts de seguimiento al cargar la web',
      detail: `Ningún script de analítica o publicidad se ejecuta antes de aceptar.${blockedNote}`,
      risk: 'Sin problemas.',
      fix: [],
      evidence,
    };
  }

  const list = scripts.active.join(', ');
  if (scripts.consentModeDenied && scripts.active.every((n) => GOOGLE_TAGS.has(n))) {
    return {
      ...base,
      id,
      status: 'info',
      title: 'Usas Google Consent Mode con permisos denegados por defecto',
      detail: `Se cargan ${list}, pero empiezan sin guardar cookies hasta que el usuario acepte.${blockedNote}`,
      risk: 'Es una configuración aceptada si el banner actualiza el consentimiento correctamente; revísalo con tu proveedor.',
      fix: [],
      evidence,
    };
  }
  if (cmp.kind !== 'none') {
    return {
      ...base,
      id,
      status: 'warning',
      title: 'Hay scripts de seguimiento que no parecen esperar al consentimiento',
      detail: `Tienes banner de cookies, pero en el HTML se cargan sin bloquear: ${list}.${blockedNote} Algunos gestores los bloquean al ejecutarse; compruébalo en el navegador.`,
      risk: 'Si se ejecutan antes de aceptar, instalan cookies sin permiso aunque haya banner.',
      fix: fixFor('privacy.trackers'),
      evidence,
    };
  }
  return {
    ...base,
    id,
    status: 'fail',
    title: 'Tu web carga scripts de seguimiento sin pedir permiso',
    detail: `Al entrar se ejecutan ${list}, que instalan cookies de analítica o publicidad, y no hay banner de cookies.${blockedNote}`,
    risk: 'Es una infracción de la LSSI (art. 22.2) que la AEPD sanciona con frecuencia, también a pequeños negocios.',
    fix: fixFor('privacy.trackers'),
    evidence,
  };
}

// ─── Banner de cookies (CMP) ─────────────────────────────────────────────────

export type CmpDetection = { kind: 'known' | 'generic' | 'none'; name: string | null };

const GENERIC_BANNER =
  /cookie[-_]?(banner|consent|notice|bar|popup|law|box|modal|alert|warning|message)|gdpr[-_]?(banner|consent|cookie)|consent[-_]?(banner|bar|popup|modal)/i;

export function detectCmp(html: string, $: cheerio.CheerioAPI): CmpDetection {
  const known = CMPS.find((c) => c.pattern.test(html));
  if (known) return { kind: 'known', name: known.name };
  let generic = false;
  $('[id], [class]').each((_, el) => {
    const attrs = `${$(el).attr('id') ?? ''} ${$(el).attr('class') ?? ''}`;
    if (GENERIC_BANNER.test(attrs)) {
      generic = true;
      return false;
    }
  });
  return generic ? { kind: 'generic', name: null } : { kind: 'none', name: null };
}

function bannerFinding(cmp: CmpDetection, needsConsent: boolean): Finding {
  const id = 'privacy.banner';
  if (cmp.kind === 'known') {
    return {
      ...base,
      id,
      status: 'ok',
      title: `Tienes un gestor de consentimiento de cookies (${cmp.name})`,
      detail:
        'Recuerda que, según la AEPD, el botón de "Rechazar" debe estar en la primera capa y ser tan visible como el de "Aceptar".',
      risk: 'Sin problemas, si está bien configurado.',
      fix: [],
      evidence: { cmp: cmp.name },
    };
  }
  if (cmp.kind === 'generic') {
    return {
      ...base,
      id,
      status: 'info',
      title: 'Parece que tienes un aviso de cookies',
      detail:
        'Hemos visto un aviso de cookies, pero no es un gestor conocido. Comprueba que permite rechazar en la primera capa y que bloquea las cookies hasta aceptar.',
      risk: 'Un simple aviso informativo ("al navegar aceptas…") no es un consentimiento válido.',
      fix: fixFor('privacy.banner'),
    };
  }
  if (needsConsent) {
    return {
      ...base,
      id,
      status: 'fail',
      title: 'Falta el banner de cookies',
      detail: 'Tu web usa cookies o scripts de analítica o publicidad y no pide consentimiento.',
      risk: 'La LSSI exige consentimiento previo para estas cookies; las multas pueden llegar a decenas de miles de euros.',
      fix: fixFor('privacy.banner'),
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title: 'No necesitas banner de cookies (por lo que vemos)',
    detail:
      'No hemos visto cookies ni scripts que requieran consentimiento. Si añades analítica, vídeos o píxeles de publicidad, necesitarás uno.',
    risk: 'Sin problemas.',
    fix: [],
  };
}

// ─── Páginas legales ─────────────────────────────────────────────────────────

const LEGAL_RE =
  /aviso[-_ ]?legal|legal[-_ ]?notice|nota[-_ ]?legal|informaci[oó]n[-_ ]?legal|t[eé]rminos[-_ ]?(y|and)[-_ ]?condiciones|condiciones[-_ ]?(de[-_ ]?uso|generales)|impressum|\bterms\b|site[-_ ]?policy/i;
const PRIVACY_RE = /privacidad|privacy|protecci[oó]n[-_ ]?de[-_ ]?datos|rgpd|gdpr/i;
const COOKIES_RE = /cookie/i;

export function findLegalLinks($: cheerio.CheerioAPI, pageUrl: string) {
  const found = {
    legal: null as string | null,
    privacy: null as string | null,
    cookies: null as string | null,
  };
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return;
    const haystack = `${href} ${$(el).text()} ${$(el).attr('title') ?? ''}`;
    let url: string;
    try {
      url = new URL(href, pageUrl).href;
    } catch {
      return;
    }
    if (!found.legal && LEGAL_RE.test(haystack)) found.legal = url;
    if (!found.privacy && PRIVACY_RE.test(haystack)) found.privacy = url;
    if (!found.cookies && COOKIES_RE.test(haystack)) found.cookies = url;
  });
  return found;
}

function legalFindings($: cheerio.CheerioAPI, pageUrl: string, usesCookies: boolean): Finding[] {
  const links = findLegalLinks($, pageUrl);
  const make = (
    id: 'privacy.legal_notice' | 'privacy.privacy_policy' | 'privacy.cookie_policy',
    url: string | null,
    names: { ok: string; missing: string },
    missing: Pick<Finding, 'status' | 'detail' | 'risk'>,
  ): Finding =>
    url
      ? {
          ...base,
          id,
          status: 'ok',
          title: names.ok,
          detail: `Enlazada desde la página de inicio: ${url}`,
          risk: 'Sin problemas (revisa que su contenido esté actualizado).',
          fix: [],
          evidence: { url },
        }
      : { ...base, id, title: names.missing, fix: fixFor(id), ...missing };

  return [
    make(
      'privacy.legal_notice',
      links.legal,
      { ok: 'Tienes aviso legal', missing: 'No encontramos el aviso legal' },
      {
        status: 'fail',
        detail: 'No hay un enlace visible a un "Aviso legal" en la página de inicio.',
        risk: 'La LSSI (art. 10) obliga a identificar al titular de la web: nombre o razón social, NIF, dirección y email.',
      },
    ),
    make(
      'privacy.privacy_policy',
      links.privacy,
      { ok: 'Tienes política de privacidad', missing: 'No encontramos la política de privacidad' },
      {
        status: 'fail',
        detail: 'No hay un enlace visible a una "Política de privacidad" en la página de inicio.',
        risk: 'Si tu web recoge cualquier dato (formulario, email, reservas), el RGPD (art. 13) obliga a informar de cómo se tratan.',
      },
    ),
    make(
      'privacy.cookie_policy',
      links.cookies,
      { ok: 'Tienes política de cookies', missing: 'No encontramos la política de cookies' },
      usesCookies
        ? {
            status: 'fail',
            detail:
              'Tu web usa cookies que requieren consentimiento, pero no enlaza una "Política de cookies".',
            risk: 'La LSSI (art. 22.2) obliga a informar de forma clara y completa sobre las cookies que se usan.',
          }
        : {
            status: 'info',
            detail:
              'No hay enlace a una "Política de cookies". Si solo usas cookies técnicas no es obligatoria, pero es recomendable.',
            risk: 'Bajo, mientras no añadas cookies de analítica o publicidad.',
          },
    ),
  ];
}

// ─── Formularios ─────────────────────────────────────────────────────────────

const FORM_PRIVACY_RE =
  /pol[ií]tica de privacidad|protecci[oó]n de datos|privacy policy|informaci[oó]n b[aá]sica|responsable del tratamiento|privacidad|rgpd/i;
const MARKETING_RE =
  /privacidad|comercial|publicidad|newsletter|ofertas|promociones|novedades|bolet[ií]n/i;
const SEARCH_NAMES = new Set(['s', 'q', 'search', 'query', 'buscar', 'search_query']);

type FormIssue = { page: string; problem: 'insecure' | 'no_privacy' | 'prechecked' };

export function analyzeForms(page: Page): { forms: number; issues: FormIssue[] } {
  const $ = cheerio.load(page.body);
  const path = new URL(page.url).pathname;
  const issues: FormIssue[] = [];
  let forms = 0;

  $('form').each((_, el) => {
    const form = $(el);
    const fields = form
      .find('input, textarea, select')
      .filter((_, f) => !/^(hidden|submit|button|image|reset)$/i.test($(f).attr('type') ?? ''));
    if (fields.length === 0) return;
    const isSearch =
      form.attr('role') === 'search' ||
      fields
        .toArray()
        .every(
          (f) =>
            ($(f).attr('type') ?? '').toLowerCase() === 'search' ||
            SEARCH_NAMES.has(($(f).attr('name') ?? '').toLowerCase()),
        );
    if (isSearch) return;
    forms++;

    let action: URL | null = null;
    try {
      action = new URL(form.attr('action') ?? '', page.url);
    } catch {
      action = null;
    }
    if (action?.protocol === 'http:') issues.push({ page: path, problem: 'insecure' });

    const text = `${form.text()} ${form
      .find('a')
      .map((_, a) => $(a).attr('href') ?? '')
      .get()
      .join(' ')}`;
    if (!FORM_PRIVACY_RE.test(text)) issues.push({ page: path, problem: 'no_privacy' });

    const prechecked = form.find('input[type="checkbox"][checked]').filter((_, box) => {
      const $box = $(box);
      const id = $box.attr('id');
      // Solo su propia etiqueta: el padre puede ser el formulario entero.
      const label = `${id ? $(`label[for="${id}"]`).text() : ''} ${$box.closest('label').text()} ${$box.attr('name') ?? ''}`;
      return MARKETING_RE.test(label);
    });
    if (prechecked.length > 0) issues.push({ page: path, problem: 'prechecked' });
  });

  return { forms, issues };
}

const PROBLEM_TEXT: Record<FormIssue['problem'], string> = {
  insecure: 'envía los datos sin cifrar (http)',
  no_privacy: 'no informa de la protección de datos junto al formulario',
  prechecked: 'tiene una casilla de consentimiento ya marcada',
};

function formsFinding(pages: readonly Page[]): Finding {
  const id = 'privacy.forms';
  const results = pages.map(analyzeForms);
  const total = results.reduce((n, r) => n + r.forms, 0);
  const issues = results.flatMap((r) => r.issues);
  const evidence = { forms: total, issues };

  if (total === 0) {
    return {
      ...base,
      id,
      status: 'info',
      title: 'No hemos visto formularios',
      detail: `Hemos revisado ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} sin encontrar formularios de contacto o registro.`,
      risk: 'Sin problemas.',
      fix: [],
      evidence,
    };
  }
  if (issues.length === 0) {
    return {
      ...base,
      id,
      status: 'ok',
      title:
        total === 1
          ? 'El formulario informa sobre la protección de datos'
          : `Los ${total} formularios informan sobre la protección de datos`,
      detail: 'Se envían cifrados y enlazan o resumen la información de privacidad.',
      risk: 'Sin problemas.',
      fix: [],
      evidence,
    };
  }
  const insecure = issues.some((i) => i.problem === 'insecure');
  const lines = issues.map((i) => `${i.page}: ${PROBLEM_TEXT[i.problem]}`);
  return {
    ...base,
    id,
    status: insecure ? 'fail' : 'warning',
    title: insecure
      ? 'Hay formularios que envían datos sin cifrar'
      : 'Hay formularios que no cumplen del todo con el RGPD',
    detail: `${[...new Set(lines)].join('; ')}.`,
    risk: insecure
      ? 'Los datos que escriben tus clientes pueden interceptarse.'
      : 'El RGPD exige informar en el propio formulario (primera capa) y que el consentimiento sea una casilla sin marcar.',
    fix: fixFor('privacy.forms'),
    evidence,
  };
}
