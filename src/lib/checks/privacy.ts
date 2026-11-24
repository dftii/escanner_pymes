import * as cheerio from 'cheerio';
import {
  CMPS,
  KNOWN_COOKIES,
  TRACKERS,
  type CookieKind,
  type TrackerRule,
} from '../data/known-cookies';
import { fixFor } from '../data/remediation';
import type { Locale } from '../i18n';
import { localizeLabel, PRIVACY_MSG } from './privacy.messages';
import type { SafeResponse } from '../net/safeFetch';
import type { Finding } from '../types';

/** Aviso que acompaña a todo el apartado de cookies y RGPD. */
export const PRIVACY_DISCLAIMER = PRIVACY_MSG.es.disclaimer;

type M = (typeof PRIVACY_MSG)['es'];

const base = { category: 'privacy' } as const;

type Page = Pick<SafeResponse, 'url' | 'body' | 'setCookies' | 'redirects'>;

/**
 * Cookies y RGPD, fase 1 (sin navegador): cookies que instala el servidor,
 * scripts de seguimiento en el HTML inicial, banner de cookies, páginas
 * legales y formularios. Función pura: no hace red.
 */
export function checkPrivacy(
  home: Page,
  pages: readonly Page[] = [home],
  locale: Locale = 'es',
): Finding[] {
  const m = PRIVACY_MSG[locale];
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
    cookiesFinding(cookies, m, locale),
    trackersFinding(scripts, cmp, m, locale),
    bannerFinding(cmp, needsConsent, m, locale),
    ...legalFindings($, home.url, needsConsent || cmp.kind !== 'none', m, locale),
    formsFinding(pages, m, locale),
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

const kindLabel = (kind: CookieKind | 'unknown', m: M): string =>
  ({
    technical: m.kindTechnical,
    preferences: m.kindPreferences,
    analytics: m.kindAnalytics,
    advertising: m.kindAdvertising,
    unknown: m.kindUnknown,
  })[kind];

const describeCookie = (c: ServerCookie, m: M, locale: Locale) =>
  `${c.name} (${c.owner ? localizeLabel(c.owner, locale) : kindLabel(c.kind, m)})`;

function cookiesFinding(cookies: ServerCookie[], m: M, locale: Locale): Finding {
  const id = 'privacy.cookies';
  const evidence = { cookies: cookies.map(({ name, kind, owner }) => ({ name, kind, owner })) };
  const describe = (list: ServerCookie[]) =>
    list.map((c) => describeCookie(c, m, locale)).join(', ');
  const tracking = cookies.filter((c) => c.kind === 'analytics' || c.kind === 'advertising');
  const unknown = cookies.filter((c) => c.kind === 'unknown');

  if (tracking.length > 0) {
    return {
      ...base,
      id,
      status: 'fail',
      title: m.cookiesFailTitle,
      detail: m.cookiesFailDetail(describe(tracking)),
      risk: m.cookiesFailRisk,
      fix: fixFor('privacy.cookies', locale),
      evidence,
    };
  }
  if (unknown.length > 0) {
    return {
      ...base,
      id,
      status: 'info',
      title: m.cookiesUnknownTitle,
      detail: m.cookiesUnknownDetail(describe(unknown), m.cookiesNote),
      risk: m.cookiesUnknownRisk,
      fix: fixFor('privacy.cookies_unknown', locale),
      evidence,
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title: cookies.length > 0 ? m.cookiesTechTitle : m.cookiesNoneTitle,
    detail: `${cookies.length > 0 ? m.cookiesList(describe(cookies)) : ''}${m.cookiesNote}`,
    risk: m.cookiesOkRisk,
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

function trackersFinding(scripts: ScriptScan, cmp: CmpDetection, m: M, locale: Locale): Finding {
  const id = 'privacy.trackers';
  const evidence = { ...scripts, cmp: cmp.name };
  const names = (list: string[]) => list.map((n) => localizeLabel(n, locale)).join(', ');
  const blockedNote = scripts.blocked.length > 0 ? m.blockedNote(names(scripts.blocked)) : '';

  if (scripts.active.length === 0) {
    return {
      ...base,
      id,
      status: 'ok',
      title: scripts.blocked.length > 0 ? m.trackersWaitTitle : m.trackersNoneTitle,
      detail: m.trackersOkDetail(blockedNote),
      risk: m.noProblems,
      fix: [],
      evidence,
    };
  }

  const list = names(scripts.active);
  if (scripts.consentModeDenied && scripts.active.every((n) => GOOGLE_TAGS.has(n))) {
    return {
      ...base,
      id,
      status: 'info',
      title: m.consentModeTitle,
      detail: m.consentModeDetail(list, blockedNote),
      risk: m.consentModeRisk,
      fix: [],
      evidence,
    };
  }
  if (cmp.kind !== 'none') {
    return {
      ...base,
      id,
      status: 'warning',
      title: m.trackersCmpTitle,
      detail: m.trackersCmpDetail(list, blockedNote),
      risk: m.trackersCmpRisk,
      fix: fixFor('privacy.trackers', locale),
      evidence,
    };
  }
  return {
    ...base,
    id,
    status: 'fail',
    title: m.trackersFailTitle,
    detail: m.trackersFailDetail(list, blockedNote),
    risk: m.trackersFailRisk,
    fix: fixFor('privacy.trackers', locale),
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

function bannerFinding(cmp: CmpDetection, needsConsent: boolean, m: M, locale: Locale): Finding {
  const id = 'privacy.banner';
  if (cmp.kind === 'known') {
    return {
      ...base,
      id,
      status: 'ok',
      title: m.bannerKnownTitle(cmp.name ?? ''),
      detail: m.bannerKnownDetail,
      risk: m.bannerKnownRisk,
      fix: [],
      evidence: { cmp: cmp.name },
    };
  }
  if (cmp.kind === 'generic') {
    return {
      ...base,
      id,
      status: 'info',
      title: m.bannerGenericTitle,
      detail: m.bannerGenericDetail,
      risk: m.bannerGenericRisk,
      fix: fixFor('privacy.banner', locale),
    };
  }
  if (needsConsent) {
    return {
      ...base,
      id,
      status: 'fail',
      title: m.bannerMissingTitle,
      detail: m.bannerMissingDetail,
      risk: m.bannerMissingRisk,
      fix: fixFor('privacy.banner', locale),
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title: m.bannerNotNeededTitle,
    detail: m.bannerNotNeededDetail,
    risk: m.noProblems,
    fix: [],
  };
}

// ─── Páginas legales ─────────────────────────────────────────────────────────

const LEGAL_RE =
  /aviso[-_ ]?legal|av[ií]s[-_ ]?legal|legal[-_ ]?notice|nota[-_ ]?legal|informaci[oó]n[-_ ]?legal|t[eé]rminos[-_ ]?(y|and)[-_ ]?condiciones|condiciones[-_ ]?(de[-_ ]?uso|generales)|impressum|\bterms\b|site[-_ ]?policy/i;
const PRIVACY_RE =
  /privacidad|privadesa|privacitat|privacy|protecci[oó]n?[-_ ]?de[-_ ]?(datos|dades)|rgpd|gdpr/i;
const COOKIES_RE = /cookie|galeta/i;

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

function legalFindings(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  usesCookies: boolean,
  m: M,
  locale: Locale,
): Finding[] {
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
          detail: m.legalLinked(url),
          risk: m.legalOkRisk,
          fix: [],
          evidence: { url },
        }
      : { ...base, id, title: names.missing, fix: fixFor(id, locale), ...missing };

  return [
    make(
      'privacy.legal_notice',
      links.legal,
      { ok: m.noticeOk, missing: m.noticeMissing },
      { status: 'fail', detail: m.noticeDetail, risk: m.noticeRisk },
    ),
    make(
      'privacy.privacy_policy',
      links.privacy,
      { ok: m.privacyOk, missing: m.privacyMissing },
      { status: 'fail', detail: m.privacyDetail, risk: m.privacyRisk },
    ),
    make(
      'privacy.cookie_policy',
      links.cookies,
      { ok: m.cookiePolicyOk, missing: m.cookiePolicyMissing },
      usesCookies
        ? { status: 'fail', detail: m.cookiePolicyFailDetail, risk: m.cookiePolicyFailRisk }
        : { status: 'info', detail: m.cookiePolicyInfoDetail, risk: m.cookiePolicyInfoRisk },
    ),
  ];
}

// ─── Formularios ─────────────────────────────────────────────────────────────

const FORM_PRIVACY_RE =
  /pol[ií]tica de privacidad|pol[ií]tica de privadesa|protecci[oó] de dades|protecci[oó]n de datos|privacy policy|informaci[oó]n b[aá]sica|responsable del tratamiento|privacidad|rgpd/i;
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

function formsFinding(pages: readonly Page[], m: M, locale: Locale): Finding {
  const id = 'privacy.forms';
  const problemText: Record<FormIssue['problem'], string> = {
    insecure: m.formInsecure,
    no_privacy: m.formNoPrivacy,
    prechecked: m.formPrechecked,
  };
  const results = pages.map(analyzeForms);
  const total = results.reduce((n, r) => n + r.forms, 0);
  const issues = results.flatMap((r) => r.issues);
  const evidence = { forms: total, issues };

  if (total === 0) {
    return {
      ...base,
      id,
      status: 'info',
      title: m.formsNoneTitle,
      detail: m.formsNoneDetail(pages.length),
      risk: m.noProblems,
      fix: [],
      evidence,
    };
  }
  if (issues.length === 0) {
    return {
      ...base,
      id,
      status: 'ok',
      title: m.formsOkTitle(total),
      detail: m.formsOkDetail,
      risk: m.noProblems,
      fix: [],
      evidence,
    };
  }
  const insecure = issues.some((i) => i.problem === 'insecure');
  const lines = issues.map((i) => `${i.page}: ${problemText[i.problem]}`);
  return {
    ...base,
    id,
    status: insecure ? 'fail' : 'warning',
    title: insecure ? m.formsInsecureTitle : m.formsGdprTitle,
    detail: `${[...new Set(lines)].join('; ')}.`,
    risk: insecure ? m.formsInsecureRisk : m.formsGdprRisk,
    fix: fixFor('privacy.forms', locale),
    evidence,
  };
}
