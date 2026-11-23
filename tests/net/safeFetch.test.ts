import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ScanError } from '@/lib/net/errors';
import {
  assertSafeUrl,
  safeFetch,
  toScanError,
  USER_AGENT,
  type FetchLike,
} from '@/lib/net/safeFetch';

type Route = { status?: number; headers?: [string, string][]; body?: string };

/** fetch falso: responde según la URL, sin red. */
function fakeFetch(routes: Record<string, Route>) {
  const calls: { url: string; method: string; headers: Record<string, string> }[] = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers });
    const route = routes[url];
    if (!route) throw new TypeError(`sin ruta para ${url}`);
    return new Response(route.body ?? null, {
      status: route.status ?? 200,
      headers: route.headers ?? [],
    });
  };
  return { impl, calls };
}

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    expect(error).toBeInstanceOf(ScanError);
    return (error as ScanError).code;
  }
};

describe('assertSafeUrl', () => {
  it.each(['https://minegocio.es/', 'http://minegocio.es:80/x', 'https://8.8.8.8/'])(
    'acepta %s',
    (url) => {
      expect(assertSafeUrl(url).href).toBeTruthy();
    },
  );

  it.each([
    ['no es una url', 'bad_url'],
    ['ftp://minegocio.es/', 'bad_url'],
    ['file:///etc/passwd', 'bad_url'],
    ['https://minegocio.es:8443/', 'bad_url'],
    ['https://u:p@minegocio.es/', 'bad_url'],
    ['http://127.0.0.1/', 'private_address'],
    ['http://169.254.169.254/latest/meta-data', 'private_address'],
    ['http://[::ffff:10.0.0.1]/', 'private_address'],
    ['http://localhost/', 'invalid_domain'],
    ['http://router.local/', 'reserved_domain'],
  ])('rechaza %s con %s', (url, code) => {
    expect(() => assertSafeUrl(url)).toThrow(ScanError);
    try {
      assertSafeUrl(url);
    } catch (error) {
      expect((error as ScanError).code).toBe(code);
    }
  });
});

describe('safeFetch (fetch simulado)', () => {
  it('devuelve cuerpo, cabeceras y cookies', async () => {
    const { impl, calls } = fakeFetch({
      'https://minegocio.es/': {
        body: '<h1>Hola</h1>',
        headers: [
          ['content-type', 'text/html'],
          ['set-cookie', 'a=1; Path=/'],
          ['set-cookie', '_ga=2; Path=/'],
        ],
      },
    });
    const res = await safeFetch('https://minegocio.es/', { fetchImpl: impl });
    expect(res).toMatchObject({
      url: 'https://minegocio.es/',
      status: 200,
      body: '<h1>Hola</h1>',
      truncated: false,
    });
    expect(res.setCookies).toEqual(['a=1; Path=/', '_ga=2; Path=/']);
    expect(res.redirects).toEqual([]);
    expect(calls[0]!.headers['user-agent']).toBe(USER_AGENT);
  });

  it('sigue redirecciones relativas y guarda las cookies de cada salto', async () => {
    const { impl, calls } = fakeFetch({
      'http://minegocio.es/': { status: 301, headers: [['location', 'https://minegocio.es/']] },
      'https://minegocio.es/': {
        status: 302,
        headers: [
          ['location', '/inicio'],
          ['set-cookie', 'sess=1'],
        ],
      },
      'https://minegocio.es/inicio': { body: 'ok' },
    });
    const res = await safeFetch('http://minegocio.es/', { fetchImpl: impl });
    expect(res.url).toBe('https://minegocio.es/inicio');
    expect(res.redirects.map((r) => [r.status, r.url])).toEqual([
      [301, 'http://minegocio.es/'],
      [302, 'https://minegocio.es/'],
    ]);
    expect(res.redirects[1]!.setCookies).toEqual(['sess=1']);
    expect(calls).toHaveLength(3);
  });

  it('no sigue una redirección hacia una IP interna', async () => {
    const { impl } = fakeFetch({
      'https://minegocio.es/': { status: 302, headers: [['location', 'http://169.254.169.254/']] },
    });
    expect(await codeOf(safeFetch('https://minegocio.es/', { fetchImpl: impl }))).toBe(
      'private_address',
    );
  });

  it('corta tras demasiadas redirecciones', async () => {
    const routes: Record<string, Route> = {};
    for (let i = 0; i < 10; i++) {
      routes[`https://minegocio.es/${i}`] = { status: 307, headers: [['location', `/${i + 1}`]] };
    }
    const { impl } = fakeFetch(routes);
    expect(
      await codeOf(safeFetch('https://minegocio.es/0', { fetchImpl: impl, maxRedirects: 5 })),
    ).toBe('too_many_redirects');
  });

  it('cambia a GET en 303 y mantiene HEAD en 301', async () => {
    const a = fakeFetch({
      'https://minegocio.es/': { status: 301, headers: [['location', '/b']] },
      'https://minegocio.es/b': { body: 'cuerpo' },
    });
    const head = await safeFetch('https://minegocio.es/', { fetchImpl: a.impl, method: 'HEAD' });
    expect(a.calls.map((c) => c.method)).toEqual(['HEAD', 'HEAD']);
    expect(head.body).toBe('');

    const b = fakeFetch({
      'https://minegocio.es/': { status: 303, headers: [['location', '/b']] },
      'https://minegocio.es/b': { body: 'cuerpo' },
    });
    await safeFetch('https://minegocio.es/', { fetchImpl: b.impl, method: 'HEAD' });
    expect(b.calls.map((c) => c.method)).toEqual(['HEAD', 'GET']);
  });

  it('devuelve un 3xx sin Location como respuesta final', async () => {
    const { impl } = fakeFetch({ 'https://minegocio.es/': { status: 304 } });
    expect((await safeFetch('https://minegocio.es/', { fetchImpl: impl })).status).toBe(304);
  });

  it('corta el cuerpo al superar maxBytes', async () => {
    const { impl } = fakeFetch({ 'https://minegocio.es/': { body: 'x'.repeat(5000) } });
    const res = await safeFetch('https://minegocio.es/', { fetchImpl: impl, maxBytes: 1000 });
    expect(res.body).toHaveLength(1000);
    expect(res.truncated).toBe(true);
  });

  it('lee cuerpos en varios trozos por debajo del límite', async () => {
    const impl: FetchLike = async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('ño'));
          controller.enqueue(new TextEncoder().encode('ño'));
          controller.close();
        },
      });
      return new Response(stream);
    };
    const res = await safeFetch('https://minegocio.es/', { fetchImpl: impl });
    expect(res).toMatchObject({ body: 'ñoño', truncated: false });
  });

  it('traduce un fallo de red', async () => {
    const impl: FetchLike = async () => {
      throw new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') });
    };
    expect(await codeOf(safeFetch('https://minegocio.es/', { fetchImpl: impl }))).toBe('network');
  });

  it('traduce un error al leer el cuerpo', async () => {
    const impl: FetchLike = async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error('reset'));
          },
        }),
      );
    expect(await codeOf(safeFetch('https://minegocio.es/', { fetchImpl: impl }))).toBe('network');
  });

  it('respeta el timeout', async () => {
    const impl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      });
    expect(
      await codeOf(safeFetch('https://minegocio.es/', { fetchImpl: impl, timeoutMs: 20 })),
    ).toBe('timeout');
  });
});

describe('toScanError', () => {
  it('encuentra un ScanError en la cadena de cause', () => {
    const inner = new ScanError('private_address', 'x');
    expect(toScanError(new TypeError('fetch failed', { cause: inner }))).toBe(inner);
  });

  it('reconoce AbortError', () => {
    expect(toScanError(Object.assign(new Error('a'), { name: 'AbortError' })).code).toBe('timeout');
  });

  it('acepta valores que no son Error', () => {
    expect(toScanError(undefined).code).toBe('network');
  });
});

describe('safeFetch con undici real (sin salir a Internet)', () => {
  let server: Server;
  let port: number;
  const hits = vi.fn();

  beforeAll(async () => {
    server = createServer((_req, res) => {
      hits();
      res.end('no deberías ver esto');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('bloquea en el momento de conectar un dominio que resuelve a 127.0.0.1 (DNS rebinding)', async () => {
    const resolver = async () => [{ address: '127.0.0.1', family: 4 }];
    const code = await codeOf(safeFetch('http://rebind.ejemplo.com/', { resolver }));
    expect(code).toBe('private_address');
    expect(hits).not.toHaveBeenCalled();
  });

  it('nunca conecta a una IP interna escrita directamente', async () => {
    expect(await codeOf(safeFetch(`http://127.0.0.1:${port}/`))).toBe('bad_url');
    expect(await codeOf(safeFetch('http://127.0.0.1/'))).toBe('private_address');
    expect(hits).not.toHaveBeenCalled();
  });
});
