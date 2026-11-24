import { afterEach, describe, expect, it } from 'vitest';
import {
  checkCms,
  cmsFinding,
  detectCms,
  latestWordPress,
  resetWordPressCache,
  WORDPRESS_VERSION_API,
  wordpressBranchesBehind,
} from '@/lib/checks/cms';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';

const page = (body: string, headers: Record<string, string> = {}): SafeResponse => ({
  url: 'https://minegocio.es/',
  status: 200,
  headers: new Headers(headers),
  setCookies: [],
  redirects: [],
  body,
  truncated: false,
});

const api = (body: string, status = 200, calls: string[] = []) =>
  (async (url: string) => {
    calls.push(url);
    return { ...page(body), url, status };
  }) as unknown as typeof safeFetch;

const WP_API = JSON.stringify({ offers: [{ current: '6.8.3' }] });

afterEach(() => resetWordPressCache());

describe('detectCms', () => {
  it('WordPress por meta generator', () => {
    expect(detectCms(page('<meta name="generator" content="WordPress 6.4.2">'))).toMatchObject({
      name: 'WordPress',
      version: '6.4.2',
    });
    expect(detectCms(page('<meta name="Generator" content="WordPress.com">'))).toMatchObject({
      name: 'WordPress',
      version: null,
    });
  });

  it('WordPress por ?ver= en wp-includes, ignorando jQuery', () => {
    const html = `
      <script src="/wp-includes/js/jquery/jquery.min.js?ver=3.7.1"></script>
      <script src="/wp-includes/js/jquery/jquery-migrate.min.js?ver=3.4.1"></script>
      <link rel="stylesheet" href="/wp-includes/css/dist/block-library/style.min.css?ver=6.5.5">
      <script src="/wp-includes/js/wp-emoji-release.min.js?ver=6.5.5"></script>`;
    expect(detectCms(page(html))).toMatchObject({ name: 'WordPress', version: '6.5.5' });
  });

  it('WordPress sin versión por /wp-content/', () => {
    expect(detectCms(page('<img src="/wp-content/uploads/logo.png">'))).toMatchObject({
      name: 'WordPress',
      version: null,
    });
  });

  it('Drupal y Joomla', () => {
    expect(detectCms(page('', { 'x-generator': 'Drupal 7 (http://drupal.org)' }))).toMatchObject({
      name: 'Drupal',
      version: '7',
    });
    expect(
      detectCms(page('<meta name="generator" content="Joomla! - Open Source Content Management">')),
    ).toMatchObject({ name: 'Joomla', version: null });
    expect(detectCms(page('<meta name="generator" content="Joomla! 3.9">'))).toMatchObject({
      name: 'Joomla',
      version: '3.9',
    });
  });

  it('nada si no hay gestor reconocible', () => {
    expect(detectCms(page('<meta name="generator" content="Wix.com Website Builder">'))).toBeNull();
    expect(detectCms(page('<p>Hola</p>'))).toBeNull();
  });
});

describe('wordpressBranchesBehind', () => {
  it.each([
    ['6.8.3', '6.8.3', 0],
    ['6.7', '6.8.3', 1],
    ['6.9', '7.0', 1],
    ['5.9.3', '6.8', 9],
    ['7.1', '7.0', -1],
  ])('%s frente a %s → %i', (v, latest, n) => expect(wordpressBranchesBehind(v, latest)).toBe(n));
});

describe('cmsFinding', () => {
  const wp = (version: string | null) => ({ name: 'WordPress' as const, version, source: 'x' });

  it('fallo si va 2 o más ramas por detrás', () => {
    expect(cmsFinding(wp('6.4.2'), '6.8.3')).toMatchObject({ id: 'headers.cms', status: 'fail' });
  });

  it('aviso con una rama o un parche pendiente', () => {
    expect(cmsFinding(wp('6.7.1'), '6.8.3').status).toBe('warning');
    const patch = cmsFinding(wp('6.8.1'), '6.8.3');
    expect(patch.status).toBe('warning');
    expect(patch.title).toContain('6.8.1 → 6.8.3');
  });

  it('informativo si está al día, sin versión o sin dato de la última', () => {
    expect(cmsFinding(wp('6.8.3'), '6.8.3')).toMatchObject({ status: 'info' });
    expect(cmsFinding(wp('6.8.3'), '6.8.3').detail).toContain('al día');
    expect(cmsFinding(wp(null), null).detail).toContain('No se ve qué versión');
    expect(cmsFinding(wp('5.0'), null).status).toBe('info');
  });

  it('Drupal sin soporte', () => {
    expect(cmsFinding({ name: 'Drupal', version: '9', source: 'x' }, null).status).toBe('fail');
    expect(cmsFinding({ name: 'Drupal', version: '11', source: 'x' }, null).status).toBe('info');
  });
});

describe('latestWordPress y checkCms', () => {
  it('consulta la API oficial y guarda en caché', async () => {
    const calls: string[] = [];
    const fetcher = api(WP_API, 200, calls);
    expect(await latestWordPress(fetcher, 1000)).toBe('6.8.3');
    expect(await latestWordPress(fetcher, 2000)).toBe('6.8.3');
    expect(calls).toEqual([WORDPRESS_VERSION_API]);
  });

  it('errores claros de la API', async () => {
    await expect(latestWordPress(api('', 500))).rejects.toThrow('HTTP 500');
    await expect(latestWordPress(api('{"offers":[]}'))).rejects.toThrow('Respuesta inesperada');
  });

  it('checkCms: null sin gestor; sin API no juzga la versión', async () => {
    expect(await checkCms(page('<p>x</p>'), { fetch: api(WP_API) })).toBeNull();
    const old = page('<meta name="generator" content="WordPress 5.0">');
    expect((await checkCms(old, { fetch: api(WP_API) }))!.status).toBe('fail');
    resetWordPressCache();
    expect((await checkCms(old, { fetch: api('', 503) }))!.status).toBe('info');
  });
});
