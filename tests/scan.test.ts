import type { DetailedPeerCertificate } from 'node:tls';
import { describe, expect, it } from 'vitest';
import { ScanError } from '@/lib/net/errors';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';
import { fetchHomepage, runScan } from '@/lib/scan';
import { fakeDns } from './helpers/fakeDns';

const NOW = new Date('2026-11-23T12:00:00Z');
const dns = fakeDns({ txt: { 'minegocio.es': 'v=spf1 -all' } });

const page = (url: string, status = 200, headers: Record<string, string> = {}): SafeResponse => ({
  url,
  status,
  headers: new Headers(headers),
  setCookies: [],
  redirects: [],
  body: '',
  truncated: false,
});

const fetchFrom = (routes: Record<string, SafeResponse | Error>) =>
  (async (url: string) => {
    const r = routes[url];
    if (!r) throw new ScanError('network', `sin ruta ${url}`);
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof safeFetch;

const probe = async () => ({
  authorized: true,
  authorizationError: null,
  protocol: 'TLSv1.3',
  cert: {
    subject: { CN: 'minegocio.es' },
    issuer: { O: 'CA' },
    subjectaltname: 'DNS:minegocio.es, DNS:www.minegocio.es',
    valid_to: new Date('2027-02-01').toUTCString(),
  } as unknown as DetailedPeerCertificate,
});

describe('fetchHomepage', () => {
  it('usa https si funciona', async () => {
    const res = await fetchHomepage(
      'minegocio.es',
      fetchFrom({ 'https://minegocio.es/': page('https://minegocio.es/') }),
    );
    expect(res.url).toBe('https://minegocio.es/');
  });

  it('recurre a http si https no conecta', async () => {
    const res = await fetchHomepage(
      'minegocio.es',
      fetchFrom({
        'https://minegocio.es/': new ScanError('network', 'x'),
        'http://minegocio.es/': page('http://minegocio.es/'),
      }),
    );
    expect(res.url).toBe('http://minegocio.es/');
  });

  it('no recurre a http por otros errores', async () => {
    await expect(
      fetchHomepage(
        'minegocio.es',
        fetchFrom({ 'https://minegocio.es/': new ScanError('private_address', 'x') }),
      ),
    ).rejects.toMatchObject({ code: 'private_address' });
  });
});

describe('runScan', () => {
  it('junta SSL y cabeceras', async () => {
    const result = await runScan('minegocio.es', {
      now: () => NOW,
      dns,
      probe,
      fetch: fetchFrom({
        'http://minegocio.es/': page('http://minegocio.es/', 301, {
          location: 'https://minegocio.es/',
        }),
        'https://minegocio.es/': page('https://minegocio.es/', 200, {
          'x-content-type-options': 'nosniff',
        }),
      }),
    });
    expect(result).toMatchObject({
      domain: 'minegocio.es',
      finalUrl: 'https://minegocio.es/',
      scannedAt: NOW.toISOString(),
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    const cats = new Set(result.findings.map((f) => f.category));
    expect(cats).toEqual(new Set(['ssl', 'headers', 'email', 'privacy']));
    expect(result.notices[0]).toContain('orientativos');
    expect(result.findings.find((f) => f.id === 'email.spf')?.status).toBe('ok');
    expect(result.findings.find((f) => f.id === 'email.exposed')?.status).toBe('info');
    expect(result.findings.find((f) => f.id === 'headers.xcto')?.status).toBe('ok');
  });

  it('si no se puede cargar la web, las cabeceras salen como error y el SSL sigue', async () => {
    const result = await runScan('minegocio.es', {
      now: () => NOW,
      dns,
      probe,
      fetch: fetchFrom({ 'https://minegocio.es/': new ScanError('private_address', 'x') }),
    });
    expect(result.finalUrl).toBeNull();
    expect(result.findings.find((f) => f.id === 'headers.fetch')).toMatchObject({
      status: 'error',
    });
    expect(result.findings.find((f) => f.id === 'ssl.expiry')).toMatchObject({ status: 'ok' });
  });

  it('si el check SSL revienta, sale como error sin tumbar el informe', async () => {
    const result = await runScan('minegocio.es', {
      now: () => NOW,
      dns,
      probe: () => {
        throw new Error('bug');
      },
      fetch: fetchFrom({ 'https://minegocio.es/': page('https://minegocio.es/') }),
    });
    expect(result.findings.find((f) => f.id === 'ssl.certificate')).toMatchObject({
      status: 'error',
    });
    expect(result.findings.some((f) => f.category === 'headers')).toBe(true);
  });
});

describe('runScan con progreso', () => {
  it('avisa una vez por categoría con sus hallazgos', async () => {
    const seen: Array<[string, string[]]> = [];
    const result = await runScan(
      'minegocio.es',
      {
        now: () => NOW,
        dns,
        probe,
        fetch: fetchFrom({ 'https://minegocio.es/': page('https://minegocio.es/') }),
      },
      (category, findings) => seen.push([category, [...new Set(findings.map((f) => f.category))]]),
    );
    expect(seen.map(([c]) => c).sort()).toEqual(['email', 'headers', 'privacy', 'ssl']);
    for (const [category, cats] of seen) expect(cats).toEqual([category]);
    expect(result.findings.length).toBeGreaterThan(10);
  });
});

describe('runScan con navegador (fase 2)', () => {
  const home = {
    ...page('https://minegocio.es/'),
    setCookies: ['PHPSESSID=abc; Path=/'],
    redirects: [{ url: 'http://minegocio.es/', status: 301, setCookies: ['lang=es'] }],
  };
  const base = { now: () => NOW, dns, probe, fetch: fetchFrom({ 'https://minegocio.es/': home }) };

  it('añade privacy.cookies_js sin repetir las cookies del servidor', async () => {
    const domains: string[] = [];
    const result = await runScan('minegocio.es', {
      ...base,
      browser: async (domain) => {
        domains.push(domain);
        return {
          finalUrl: 'https://minegocio.es/',
          cookies: [
            { name: 'PHPSESSID', domain: 'minegocio.es' },
            { name: 'lang', domain: 'minegocio.es' },
            { name: '_fbp', domain: '.minegocio.es' },
          ],
          requests: [],
          blocked: 0,
        };
      },
    });
    expect(domains).toEqual(['minegocio.es']);
    const f = result.findings.find((x) => x.id === 'privacy.cookies_js');
    expect(f?.status).toBe('fail');
    expect(f?.detail).toContain('_fbp');
    expect(f?.detail).not.toContain('PHPSESSID');
  });

  it('si el navegador falla, sale como error y el resto de RGPD sigue', async () => {
    const result = await runScan('minegocio.es', {
      ...base,
      browser: async () => {
        throw new ScanError('network', 'navegador ocupado');
      },
    });
    expect(result.findings.find((x) => x.id === 'privacy.cookies_js')?.status).toBe('error');
    expect(result.findings.find((x) => x.id === 'privacy.cookies')?.status).toBe('ok');
  });

  it('si la web no carga, analiza las cookies del navegador sin excluir ninguna', async () => {
    const result = await runScan('minegocio.es', {
      now: () => NOW,
      dns,
      probe,
      fetch: fetchFrom({}),
      browser: async () => ({
        finalUrl: 'https://minegocio.es/',
        cookies: [{ name: '_ga', domain: '.minegocio.es' }],
        requests: [],
        blocked: 0,
      }),
    });
    expect(result.findings.find((x) => x.id === 'privacy.cookies_js')?.status).toBe('fail');
  });

  it('sin ENABLE_HEADLESS no se lanza el navegador', async () => {
    const result = await runScan('minegocio.es', base);
    expect(result.findings.some((x) => x.id === 'privacy.cookies_js')).toBe(false);
  });

  it('con ENABLE_HEADLESS=true se usa el navegador por defecto (null lo desactiva)', async () => {
    process.env.ENABLE_HEADLESS = 'true';
    try {
      const result = await runScan('minegocio.es', { ...base, browser: null });
      expect(result.findings.some((x) => x.id === 'privacy.cookies_js')).toBe(false);
    } finally {
      delete process.env.ENABLE_HEADLESS;
    }
  });
});
