import type { DetailedPeerCertificate } from 'node:tls';
import { describe, expect, it } from 'vitest';
import { checkHttpRedirect, checkSsl, issuerName } from '@/lib/checks/ssl';
import { TlsProbeError, type TlsProbe } from '@/lib/checks/tlsProbe';
import { ScanError } from '@/lib/net/errors';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';
import type { Finding } from '@/lib/types';

const NOW = new Date('2026-11-23T12:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toUTCString();

const cert = (
  names: string[],
  validToDays = 60,
  issuer: Record<string, string> = { O: "Let's Encrypt", CN: 'R11' },
) =>
  ({
    subject: { CN: names[0] },
    issuer,
    subjectaltname: names.map((n) => `DNS:${n}`).join(', '),
    valid_to: inDays(validToDays),
  }) as unknown as DetailedPeerCertificate;

const ok = (c: DetailedPeerCertificate, protocol = 'TLSv1.3'): TlsProbe => ({
  authorized: true,
  authorizationError: null,
  protocol,
  cert: c,
});

/** fetch simulado: http://dominio/ redirige a https. */
const redirectingFetch = (location = 'https://minegocio.es/') =>
  (async () =>
    ({
      url: 'http://minegocio.es/',
      status: 301,
      headers: new Headers({ location }),
      setCookies: [],
      redirects: [],
      body: '',
      truncated: false,
    }) satisfies SafeResponse) as unknown as typeof safeFetch;

const byId = (findings: Finding[]) => Object.fromEntries(findings.map((f) => [f.id, f]));

const run = (probes: Record<string, TlsProbe | Error>, fetch = redirectingFetch()) =>
  checkSsl('minegocio.es', {
    now: () => NOW,
    fetch,
    probe: async (host) => {
      const p = probes[host];
      if (!p) throw new ScanError('domain_not_found', 'no existe');
      if (p instanceof Error) throw p;
      return p;
    },
  });

const both = ['minegocio.es', 'www.minegocio.es'];

describe('checkSsl', () => {
  it('todo correcto', async () => {
    const f = byId(
      await run({ 'minegocio.es': ok(cert(both)), 'www.minegocio.es': ok(cert(both)) }),
    );
    expect(Object.values(f).every((x) => x.status === 'ok')).toBe(true);
    expect(Object.keys(f).sort()).toEqual(
      ['ssl.expiry', 'ssl.hostname', 'ssl.protocol', 'ssl.redirect', 'ssl.trust', 'ssl.www'].sort(),
    );
    expect(f['ssl.trust']!.detail).toContain("Let's Encrypt");
    expect(f['ssl.expiry']!.title).toContain('60 días');
  });

  it.each([
    [-3, 'fail', 'caducado'],
    [5, 'fail', 'caduca en 5 días'],
    [1, 'fail', 'caduca en 1 día'],
    [15, 'warning', 'caduca en 15 días'],
    [40, 'ok', 'válido 40 días'],
  ])('caducidad a %i días → %s', async (days, status, text) => {
    const f = byId(await run({ 'minegocio.es': ok(cert(both, days)) }));
    expect(f['ssl.expiry']).toMatchObject({ status });
    expect(f['ssl.expiry']!.title).toContain(text);
  });

  it('un certificado caducado no se cuenta dos veces', async () => {
    const f = byId(
      await run({
        'minegocio.es': {
          ...ok(cert(both, -1)),
          authorized: false,
          authorizationError: 'CERT_HAS_EXPIRED',
        },
      }),
    );
    expect(f['ssl.trust']).toBeUndefined();
    expect(f['ssl.untrusted']).toBeUndefined();
    expect(f['ssl.expiry']!.detail).toContain('hace 1 día');
  });

  it.each([
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'ssl.untrusted', 'autofirmado'],
    ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ssl.chain', 'cadena'],
    ['CERT_REVOKED', 'ssl.untrusted', 'no es de confianza'],
  ])('certificado no fiable (%s)', async (code, id, text) => {
    const f = byId(
      await run({
        'minegocio.es': { ...ok(cert(both)), authorized: false, authorizationError: code },
      }),
    );
    expect(f[id]).toMatchObject({ status: 'fail' });
    expect(f[id]!.title).toContain(text);
  });

  it('detecta un certificado de otro dominio', async () => {
    const f = byId(await run({ 'minegocio.es': ok(cert(['otro.com'])) }));
    expect(f['ssl.hostname']).toMatchObject({ status: 'fail' });
    expect(f['ssl.hostname']!.detail).toContain('otro.com');
  });

  it('avisa si la versión con www no está cubierta', async () => {
    const f = byId(
      await run({
        'minegocio.es': ok(cert(['minegocio.es'])),
        'www.minegocio.es': ok(cert(['minegocio.es'])),
      }),
    );
    expect(f['ssl.www']).toMatchObject({ status: 'warning' });
  });

  it('avisa si www existe pero no tiene HTTPS, y calla si no existe o tarda', async () => {
    const refused = new TlsProbeError('refused', 'ECONNREFUSED', 'x');
    const timeout = new TlsProbeError('timeout', 'ETIMEDOUT', 'x');
    const main = ok(cert(both));
    expect(
      byId(await run({ 'minegocio.es': main, 'www.minegocio.es': refused }))['ssl.www'],
    ).toMatchObject({
      status: 'warning',
    });
    expect(
      byId(await run({ 'minegocio.es': main, 'www.minegocio.es': timeout }))['ssl.www'],
    ).toBeUndefined();
    expect(byId(await run({ 'minegocio.es': main }))['ssl.www']).toBeUndefined();
  });

  it('comprueba el dominio sin www cuando se escribe con www', async () => {
    const seen: string[] = [];
    await checkSsl('www.minegocio.es', {
      now: () => NOW,
      fetch: redirectingFetch('https://www.minegocio.es/'),
      probe: async (host) => {
        seen.push(host);
        return ok(cert(both));
      },
    });
    expect(seen.sort()).toEqual(['minegocio.es', 'www.minegocio.es']);
  });

  it.each([
    ['TLSv1.2', 'ok'],
    ['TLSv1.1', 'fail'],
    ['TLSv1', 'fail'],
  ])('protocolo %s → %s', async (protocol, status) => {
    const f = byId(await run({ 'minegocio.es': ok(cert(both), protocol) }));
    expect(f['ssl.protocol']).toMatchObject({ status });
  });

  it('protocolo desconocido', async () => {
    const f = byId(await run({ 'minegocio.es': { ...ok(cert(both)), protocol: null } }));
    expect(f['ssl.protocol']!.detail).toContain('desconocido');
  });

  it.each(['refused', 'handshake'] as const)('sin HTTPS (%s) da un único fallo', async (kind) => {
    const findings = await run({ 'minegocio.es': new TlsProbeError(kind, 'X', 'x') });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ id: 'ssl.no_https', status: 'fail' });
  });

  it('sin certificado da fallo de HTTPS', async () => {
    const findings = await run({ 'minegocio.es': { ...ok(cert(both)), cert: null } });
    expect(findings[0]).toMatchObject({ id: 'ssl.no_https' });
  });

  it('timeout en el puerto 443 da un hallazgo de error, no de fallo', async () => {
    const f = byId(await run({ 'minegocio.es': new TlsProbeError('timeout', 'ETIMEDOUT', 'x') }));
    expect(f['ssl.certificate']).toMatchObject({ status: 'error' });
    expect(f['ssl.redirect']).toMatchObject({ status: 'ok' });
  });

  it('un error en la redirección no rompe el resto', async () => {
    const failing = (async () => {
      throw new ScanError('timeout', 'lento');
    }) as unknown as typeof safeFetch;
    const f = byId(await run({ 'minegocio.es': ok(cert(both)) }, failing));
    expect(f['ssl.redirect']).toMatchObject({ status: 'error' });
    expect(f['ssl.expiry']).toMatchObject({ status: 'ok' });
  });

  it('issuerName recurre al CN o a un texto genérico', () => {
    expect(issuerName(cert(both, 10, { CN: 'Mi CA' }))).toBe('Mi CA');
    expect(issuerName({ issuer: {} } as unknown as DetailedPeerCertificate)).toBe(
      'un emisor desconocido',
    );
  });
});

describe('checkHttpRedirect', () => {
  const fetchFrom = (routes: Record<string, { status: number; location?: string } | Error>) =>
    (async (url: string) => {
      const r = routes[url];
      if (!r) throw new Error(`sin ruta ${url}`);
      if (r instanceof Error) throw r;
      return {
        url,
        status: r.status,
        headers: new Headers(r.location ? { location: r.location } : {}),
        setCookies: [],
        redirects: [],
        body: '',
        truncated: false,
      };
    }) as unknown as typeof safeFetch;

  it('ok si acaba en https tras varios saltos por http', async () => {
    const f = await checkHttpRedirect(
      'minegocio.es',
      fetchFrom({
        'http://minegocio.es/': { status: 301, location: 'http://www.minegocio.es/' },
        'http://www.minegocio.es/': { status: 302, location: 'https://www.minegocio.es/' },
      }),
    );
    expect(f).toMatchObject({ status: 'ok' });
    expect(f.detail).toContain('https://www.minegocio.es');
  });

  it('falla si la web se sirve por http', async () => {
    const f = await checkHttpRedirect(
      'minegocio.es',
      fetchFrom({ 'http://minegocio.es/': { status: 200 } }),
    );
    expect(f).toMatchObject({ status: 'fail', id: 'ssl.redirect' });
  });

  it('falla si encadena redirecciones http sin llegar a https', async () => {
    const routes: Record<string, { status: number; location: string }> = {};
    for (let i = 0; i < 6; i++)
      routes[`http://minegocio.es/${i || ''}`] = { status: 301, location: `/${i + 1}` };
    const f = await checkHttpRedirect('minegocio.es', fetchFrom(routes));
    expect(f).toMatchObject({ status: 'fail' });
  });

  it('ok si no responde por http', async () => {
    const f = await checkHttpRedirect(
      'minegocio.es',
      fetchFrom({ 'http://minegocio.es/': new ScanError('network', 'x') }),
    );
    expect(f).toMatchObject({ status: 'ok', title: 'No hay versión sin cifrar de tu web' });
  });

  it('propaga otros errores', async () => {
    await expect(
      checkHttpRedirect(
        'minegocio.es',
        fetchFrom({ 'http://minegocio.es/': new ScanError('timeout', 'x') }),
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('checkSsl en subdominios', () => {
  it('no comprueba la variante www de un subdominio', async () => {
    const probed: string[] = [];
    const f = byId(
      await checkSsl('tienda.minegocio.es', {
        now: () => NOW,
        fetch: redirectingFetch(),
        probe: async (host) => {
          probed.push(host);
          return ok(cert(['tienda.minegocio.es']));
        },
      }),
    );
    expect(probed).toEqual(['tienda.minegocio.es']);
    expect(f['ssl.www']).toBeUndefined();
    expect(f['ssl.expiry']).toBeDefined();
  });

  it('sí la comprueba en un dominio .com.es', async () => {
    const probed: string[] = [];
    await checkSsl('minegocio.com.es', {
      now: () => NOW,
      fetch: redirectingFetch(),
      probe: async (host) => {
        probed.push(host);
        return ok(cert(['minegocio.com.es', 'www.minegocio.com.es']));
      },
    });
    expect(probed.sort()).toEqual(['minegocio.com.es', 'www.minegocio.com.es']);
  });
});
