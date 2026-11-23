import type { DetailedPeerCertificate } from 'node:tls';
import { describe, expect, it } from 'vitest';
import { ScanError } from '@/lib/net/errors';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';
import { fetchHomepage, runScan } from '@/lib/scan';

const NOW = new Date('2026-11-23T12:00:00Z');

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
    expect(cats).toEqual(new Set(['ssl', 'headers']));
    expect(result.findings.find((f) => f.id === 'headers.xcto')?.status).toBe('ok');
  });

  it('si no se puede cargar la web, las cabeceras salen como error y el SSL sigue', async () => {
    const result = await runScan('minegocio.es', {
      now: () => NOW,
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
