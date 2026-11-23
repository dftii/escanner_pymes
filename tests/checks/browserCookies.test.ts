import { describe, expect, it } from 'vitest';
import {
  analyzeBrowserCookies,
  isHeadlessEnabled,
  isThirdParty,
  trackersContacted,
  type BrowserObservation,
} from '@/lib/checks/browserCookies';

const obs = (cookies: [string, string][], requests: string[] = []): BrowserObservation => ({
  finalUrl: 'https://www.minegocio.es/',
  cookies: cookies.map(([name, domain]) => ({ name, domain })),
  requests,
  blocked: 0,
});

describe('isHeadlessEnabled', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['YES', true],
    ['false', false],
    ['', false],
    [undefined, false],
  ])('ENABLE_HEADLESS=%s → %s', (value, expected) => {
    expect(isHeadlessEnabled({ ENABLE_HEADLESS: value } as unknown as NodeJS.ProcessEnv)).toBe(
      expected,
    );
  });
});

describe('isThirdParty', () => {
  const home = 'https://www.minegocio.es/';
  it.each([
    ['.minegocio.es', false],
    ['www.minegocio.es', false],
    ['tienda.minegocio.es', false],
    ['.doubleclick.net', true],
    ['otrominegocio.es', true],
  ])('%s → %s', (domain, expected) => expect(isThirdParty(domain, home)).toBe(expected));
});

describe('trackersContacted', () => {
  it('reconoce servicios por las URLs pedidas, sin duplicados', () => {
    expect(
      trackersContacted([
        'https://www.googletagmanager.com/gtm.js?id=GTM-ABCD',
        'https://www.googletagmanager.com/gtm.js?id=GTM-EFGH',
        'https://minegocio.es/app.js',
      ]),
    ).toEqual(['Google Tag Manager']);
  });
});

describe('analyzeBrowserCookies', () => {
  it('falla con cookies de analítica creadas por scripts', () => {
    const f = analyzeBrowserCookies(
      obs(
        [
          ['_ga', '.minegocio.es'],
          ['PHPSESSID', 'www.minegocio.es'],
        ],
        ['https://www.googletagmanager.com/gtm.js?id=GTM-ABCD'],
      ),
    );
    expect(f.id).toBe('privacy.cookies_js');
    expect(f.status).toBe('fail');
    expect(f.detail).toContain('_ga (Google Analytics)');
    expect(f.detail).not.toContain('PHPSESSID');
    expect(f.detail).toContain('Google Tag Manager');
    expect(f.fix.length).toBeGreaterThan(0);
  });

  it('trata como seguimiento las cookies de terceros desconocidas', () => {
    const f = analyzeBrowserCookies(obs([['xyz', '.adnetwork.example']]));
    expect(f.status).toBe('fail');
    expect(f.detail).toContain('xyz (adnetwork.example)');
    expect(f.evidence?.cookies).toEqual([
      { name: 'xyz', domain: '.adnetwork.example', kind: 'unknown', owner: null, thirdParty: true },
    ]);
  });

  it('informa de cookies propias desconocidas', () => {
    const f = analyzeBrowserCookies(obs([['mi_cookie', 'www.minegocio.es']]));
    expect(f.status).toBe('info');
    expect(f.detail).toContain('mi_cookie (desconocida)');
  });

  it('no repite las cookies que ya puso el servidor', () => {
    const f = analyzeBrowserCookies(obs([['_ga', '.minegocio.es']]), ['_ga']);
    expect(f.status).toBe('ok');
  });

  it('ok con cookies técnicas, y sin duplicados', () => {
    const f = analyzeBrowserCookies(
      obs([
        ['PHPSESSID', 'www.minegocio.es'],
        ['PHPSESSID', 'www.minegocio.es'],
        ['CookieConsent', 'www.minegocio.es'],
      ]),
    );
    expect(f.status).toBe('ok');
    expect(f.detail).toBe(
      'Los scripts solo crean cookies técnicas o de preferencias: PHPSESSID (Sesión del servidor), CookieConsent (Gestor de consentimiento).',
    );
  });

  it('ok sin cookies', () => {
    const f = analyzeBrowserCookies(obs([]));
    expect(f.status).toBe('ok');
    expect(f.detail).toContain('no crearon cookies');
  });
});
