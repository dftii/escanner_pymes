import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';
import {
  analyzeForms,
  analyzeScripts,
  checkPrivacy,
  classifyCookie,
  detectCmp,
  findLegalLinks,
  parseSetCookie,
} from '@/lib/checks/privacy';
import type { Finding } from '@/lib/types';

const URL_HOME = 'https://minegocio.es/';
const FOOTER = `<footer>
  <a href="/aviso-legal">Aviso legal</a>
  <a href="/politica-de-privacidad">Política de privacidad</a>
  <a href="/politica-de-cookies">Cookies</a>
</footer>`;

const page = (
  body: string,
  setCookies: string[] = [],
  url = URL_HOME,
  redirectCookies: string[] = [],
) => ({
  url,
  body,
  setCookies,
  redirects: redirectCookies.length
    ? [{ url: 'http://minegocio.es/', status: 301, setCookies: redirectCookies }]
    : [],
});

const run = (...args: Parameters<typeof page>) =>
  Object.fromEntries(checkPrivacy(page(...args)).map((f) => [f.id, f])) as Record<string, Finding>;

describe('checkPrivacy: escenarios completos', () => {
  it('web sencilla y correcta: sin seguimiento, con páginas legales', () => {
    const f = run(`<main>Hola</main>${FOOTER}`, ['PHPSESSID=abc; Path=/; HttpOnly; Secure']);
    expect(Object.keys(f)).toEqual([
      'privacy.cookies',
      'privacy.trackers',
      'privacy.banner',
      'privacy.legal_notice',
      'privacy.privacy_policy',
      'privacy.cookie_policy',
      'privacy.forms',
    ]);
    expect(f['privacy.cookies']).toMatchObject({
      status: 'ok',
      title: 'Al entrar solo se instalan cookies técnicas',
    });
    expect(f['privacy.trackers']).toMatchObject({ status: 'ok' });
    expect(f['privacy.banner']).toMatchObject({
      status: 'ok',
      title: 'No necesitas banner de cookies (por lo que vemos)',
    });
    expect(f['privacy.legal_notice']).toMatchObject({ status: 'ok' });
    expect(f['privacy.legal_notice']!.detail).toContain('https://minegocio.es/aviso-legal');
    expect(f['privacy.forms']).toMatchObject({ status: 'info' });
    for (const finding of Object.values(f)) expect(finding.category).toBe('privacy');
  });

  it('WordPress con Google Analytics y Meta Pixel, sin banner ni textos legales', () => {
    const html = `
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
      <script>window.dataLayer=[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-ABC123');</script>
      <script>!function(f,b,e,v,n,t,s){}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','123');</script>`;
    const f = run(html, ['_ga=GA1.1.1; Path=/', 'wordpress_test_cookie=WP; Path=/']);
    expect(f['privacy.cookies']).toMatchObject({ status: 'fail' });
    expect(f['privacy.cookies']!.detail).toContain('_ga (Google Analytics)');
    expect(f['privacy.trackers']).toMatchObject({ status: 'fail' });
    expect(f['privacy.trackers']!.detail).toContain('Google Analytics');
    expect(f['privacy.trackers']!.detail).toContain('Meta Pixel');
    expect(f['privacy.banner']).toMatchObject({
      status: 'fail',
      title: 'Falta el banner de cookies',
    });
    expect(f['privacy.legal_notice']).toMatchObject({ status: 'fail' });
    expect(f['privacy.privacy_policy']).toMatchObject({ status: 'fail' });
    expect(f['privacy.cookie_policy']).toMatchObject({ status: 'fail' });
    for (const id of [
      'privacy.cookies',
      'privacy.trackers',
      'privacy.banner',
      'privacy.legal_notice',
    ]) {
      expect(f[id]!.fix.length, id).toBeGreaterThan(0);
    }
  });

  it('Cookiebot bloqueando los scripts hasta el consentimiento', () => {
    const html = `
      <script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="abc"></script>
      <script type="text/plain" data-cookieconsent="statistics" src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
      <iframe data-src="https://www.youtube.com/embed/xyz" data-cookieconsent="marketing"></iframe>
      ${FOOTER}`;
    const f = run(html);
    expect(f['privacy.banner']).toMatchObject({
      status: 'ok',
      title: 'Tienes un gestor de consentimiento de cookies (Cookiebot)',
    });
    expect(f['privacy.trackers']).toMatchObject({
      status: 'ok',
      title: 'Los scripts de seguimiento esperan al consentimiento',
    });
    expect(f['privacy.trackers']!.detail).toContain('Google Analytics');
    expect(f['privacy.trackers']!.detail).toContain('YouTube');
    expect(f['privacy.cookie_policy']).toMatchObject({ status: 'ok' });
  });

  it('banner conocido pero scripts sin bloquear: aviso', () => {
    const html = `<script src="https://cdn-cookieyes.com/client_data/x/script.js"></script>
      <script src="https://static.hotjar.com/c/hotjar-1.js"></script>`;
    const f = run(html);
    expect(f['privacy.trackers']).toMatchObject({ status: 'warning' });
    expect(f['privacy.cookie_policy']).toMatchObject({ status: 'fail' });
  });

  it('Google Consent Mode con denied por defecto', () => {
    const html = `<script>gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' });</script>
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12"></script>`;
    const f = run(html);
    expect(f['privacy.trackers']).toMatchObject({ status: 'info' });
    expect(f['privacy.trackers']!.title).toContain('Consent Mode');
  });

  it('Consent Mode no salva a un píxel que no es de Google', () => {
    const html = `<script>gtag('consent','default',{ad_storage:'denied'});</script>
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12"></script>
      <script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>`;
    expect(run(html)['privacy.trackers']).toMatchObject({ status: 'fail' });
  });

  it('aviso de cookies casero', () => {
    const f = run(`<div id="cookie-banner">Usamos cookies <button>Aceptar</button></div>`);
    expect(f['privacy.banner']).toMatchObject({ status: 'info' });
    expect(f['privacy.cookie_policy']).toMatchObject({ status: 'fail' });
  });

  it('cookies desconocidas y cookies de las redirecciones', () => {
    const f = run('<p>x</p>', ['misterio=1'], URL_HOME, ['_fbp=fb.1; Path=/']);
    expect(f['privacy.cookies']).toMatchObject({ status: 'fail' });
    const g = run('<p>x</p>', ['misterio=1; Secure']);
    expect(g['privacy.cookies']).toMatchObject({ status: 'info' });
    expect(g['privacy.cookies']!.detail).toContain('misterio (desconocida)');
  });

  it('sin cookies', () => {
    expect(run('<p>x</p>')['privacy.cookies']).toMatchObject({
      status: 'ok',
      title: 'Tu web no instala cookies desde el servidor al entrar',
    });
  });

  it('vídeo de YouTube incrustado sin bloquear', () => {
    const f = run('<iframe src="https://www.youtube.com/embed/abc"></iframe>');
    expect(f['privacy.trackers']).toMatchObject({ status: 'fail' });
    expect(f['privacy.banner']).toMatchObject({ status: 'fail' });
  });

  it('youtube-nocookie no cuenta', () => {
    expect(
      run('<iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>')['privacy.trackers'],
    ).toMatchObject({
      status: 'ok',
    });
  });
});

describe('formularios', () => {
  const form = (inner: string, action = '/enviar') =>
    `<form action="${action}" method="post">${inner}</form>`;
  const analyze = (body: string, url = URL_HOME) => analyzeForms(page(body, [], url));

  it('formulario correcto', () => {
    const r = analyze(
      form(`<input name="email" type="email"><textarea name="msg"></textarea>
        <label><input type="checkbox" name="acepto" required> He leído la <a href="/privacidad">política de privacidad</a></label>
        <button>Enviar</button>`),
    );
    expect(r).toEqual({ forms: 1, issues: [] });
  });

  it('ignora buscadores y formularios sin campos', () => {
    expect(analyze(form('<input type="search" name="s">')).forms).toBe(0);
    expect(analyze('<form role="search"><input name="x"></form>').forms).toBe(0);
    expect(analyze(form('<input type="hidden" name="t"><button>Ir</button>')).forms).toBe(0);
  });

  it('detecta falta de información, envío por http y casillas premarcadas', () => {
    const r = analyze(
      form(
        `<input name="nombre"><input type="checkbox" id="nl" name="nl" checked><label for="nl">Quiero recibir ofertas</label>`,
        'http://minegocio.es/enviar',
      ),
      'https://minegocio.es/contacto',
    );
    expect(r.issues.map((i) => i.problem).sort()).toEqual(['insecure', 'no_privacy', 'prechecked']);
    expect(r.issues[0]!.page).toBe('/contacto');
  });

  it('una casilla marcada que no es de consentimiento no cuenta', () => {
    const r = analyze(
      form(
        `<input name="n"><input type="checkbox" name="recordar" checked> Recordarme <a href="/privacidad">privacidad</a>`,
      ),
    );
    expect(r.issues).toEqual([]);
  });

  it('acción no válida no rompe', () => {
    expect(analyze(form('<input name="n"> privacidad', 'http://[malo')).forms).toBe(1);
  });

  it('el hallazgo agrega todas las páginas', () => {
    const home = page(`${FOOTER}`);
    const contacto = page(
      form('<input name="n">', 'http://minegocio.es/x'),
      [],
      'https://minegocio.es/contacto',
    );
    const f = checkPrivacy(home, [home, contacto]).find((x) => x.id === 'privacy.forms')!;
    expect(f.status).toBe('fail');
    expect(f.detail).toContain('/contacto: envía los datos sin cifrar');

    const bien = page(
      form('<input name="n"> <a href="/privacidad">Política de privacidad</a>'),
      [],
      'https://minegocio.es/contacto',
    );
    const g = checkPrivacy(home, [home, bien]).find((x) => x.id === 'privacy.forms')!;
    expect(g).toMatchObject({
      status: 'ok',
      title: 'El formulario informa sobre la protección de datos',
    });

    const dos = page(form('<input name="a"> privacidad') + form('<input name="b"> privacidad'));
    expect(checkPrivacy(dos, [dos]).find((x) => x.id === 'privacy.forms')!.title).toBe(
      'Los 2 formularios informan sobre la protección de datos',
    );

    const sinInfo = page(form('<input name="n">'));
    expect(checkPrivacy(sinInfo, [sinInfo]).find((x) => x.id === 'privacy.forms')).toMatchObject({
      status: 'warning',
    });
  });
});

describe('piezas sueltas', () => {
  it('reconoce "Terms" como aviso legal en webs en inglés', () => {
    const $ = cheerio.load('<a href="/site/terms">Terms</a>');
    expect(findLegalLinks($, URL_HOME).legal).toBe('https://minegocio.es/site/terms');
  });

  it.each([
    ['_ga', 'analytics', 'Google Analytics'],
    ['_ga_ABC123', 'analytics', 'Google Analytics'],
    ['_fbp', 'advertising', 'Meta (Facebook)'],
    ['_gcl_au', 'advertising', 'Google Ads'],
    ['_hjSessionUser_123', 'analytics', 'Hotjar'],
    ['PHPSESSID', 'technical', 'Sesión del servidor'],
    ['CookieConsent', 'technical', 'Gestor de consentimiento'],
    ['__cf_bm', 'technical', 'Cloudflare'],
    ['_shopify_y', 'analytics', 'Shopify Analytics'],
    ['cart', 'technical', 'Shopify'],
    ['pll_language', 'preferences', 'Idioma'],
    ['xyz', 'unknown', null],
  ])('clasifica %s', (name, kind, owner) => {
    expect(classifyCookie(name)).toEqual({ kind, owner });
  });

  it('parseSetCookie', () => {
    expect(parseSetCookie('_ga=GA1; Path=/; Secure; HttpOnly; SameSite=Lax')).toMatchObject({
      name: '_ga',
      kind: 'analytics',
      secure: true,
      httpOnly: true,
    });
    expect(parseSetCookie('=sin-nombre')).toBeNull();
  });

  it('analyzeScripts distingue activos y bloqueados por tipo', () => {
    const $ = cheerio.load(`
      <script type="module" src="https://static.hotjar.com/x.js"></script>
      <script type="text/plain" data-category="analytics" src="https://www.clarity.ms/tag/abc"></script>
      <script type="text/plain" data-src="https://static.hotjar.com/x.js"></script>`);
    expect(analyzeScripts($)).toEqual({
      active: ['Hotjar'],
      blocked: ['Microsoft Clarity'],
      consentModeDenied: false,
    });
  });

  it('detectCmp', () => {
    const load = (html: string) => detectCmp(html, cheerio.load(html));
    expect(
      load('<script src="https://cdn.cookielaw.org/scripttemplates/otSDKStub.js"></script>'),
    ).toEqual({
      kind: 'known',
      name: 'OneTrust',
    });
    expect(load('<div class="gdpr-consent">x</div>')).toEqual({ kind: 'generic', name: null });
    expect(load('<div class="hero">x</div>')).toEqual({ kind: 'none', name: null });
  });

  it('findLegalLinks ignora anclas, javascript y mailto', () => {
    const $ = cheerio.load(`
      <a href="#cookies">Cookies</a><a href="javascript:void(0)">Aviso legal</a>
      <a href="mailto:privacidad@x.es">privacidad</a><a href="http://[malo">Aviso legal</a>
      <a href="/legal" title="Aviso legal y privacidad">Legal</a>`);
    expect(findLegalLinks($, URL_HOME)).toEqual({
      legal: 'https://minegocio.es/legal',
      privacy: 'https://minegocio.es/legal',
      cookies: null,
    });
  });
});
