import http from 'node:http';
import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { startEgressProxy, type EgressProxy } from '@/lib/net/egressProxy';

let proxy: EgressProxy | null = null;
let server: http.Server | null = null;
afterEach(async () => {
  await proxy?.close();
  await new Promise((r) => (server ? server.close(r) : r(null)));
  proxy = server = null;
});

const port = (p: EgressProxy) => Number(new URL(p.url).port);

/** Servidor HTTP local que hace de "Internet" en los tests. */
async function localOrigin(): Promise<number> {
  server = http.createServer((req, res) => {
    res.setHeader('x-host', req.headers.host ?? '');
    res.end(`ok ${req.url}`);
  });
  await new Promise<void>((r) => server!.listen(0, '127.0.0.1', r));
  return (server.address() as net.AddressInfo).port;
}

/** Lanza un CONNECT y devuelve la primera línea de la respuesta del proxy. */
function connect(p: EgressProxy, target: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const s = net.connect(port(p), '127.0.0.1', () =>
      s.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`),
    );
    s.once('data', (d) => {
      resolve(d.toString().split('\r\n')[0]!);
      s.destroy();
    });
    s.on('error', reject);
  });
}

/** Petición http:// en claro a través del proxy. */
function viaProxy(p: EgressProxy, url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: port(p), path: url, headers: { host: 'x' } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const privateResolver = async () => [{ address: '10.0.0.5', family: 4 }];
const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }];

describe('startEgressProxy', () => {
  it('rechaza CONNECT a IPs internas literales', async () => {
    proxy = await startEgressProxy();
    expect(await connect(proxy, '127.0.0.1:443')).toContain('403');
    expect(await connect(proxy, '[::1]:443')).toContain('403');
    expect(await connect(proxy, '169.254.169.254:80')).toContain('403');
    expect(proxy.blocked()).toBe(3);
  });

  it('rechaza puertos que no son 80 ni 443', async () => {
    proxy = await startEgressProxy({ resolver: publicResolver });
    expect(await connect(proxy, 'minegocio.es:22')).toContain('403');
    expect(await connect(proxy, 'basura')).toContain('403');
    expect(proxy.blocked()).toBe(2);
  });

  it('rechaza dominios que resuelven a IPs internas (validación al conectar)', async () => {
    proxy = await startEgressProxy({ resolver: privateResolver });
    expect(await connect(proxy, 'interno.minegocio.es:443')).toContain('502');
    expect(proxy.blocked()).toBe(1);
    await expect(viaProxy(proxy, 'http://interno.minegocio.es/')).rejects.toThrow();
    expect(proxy.blocked()).toBe(2);
  });

  it('rechaza http:// a IP interna y peticiones que no son de proxy', async () => {
    proxy = await startEgressProxy();
    expect((await viaProxy(proxy, 'http://10.1.2.3/')).status).toBe(403);
    expect((await viaProxy(proxy, '/relativa')).status).toBe(400);
    expect((await viaProxy(proxy, 'ftp://minegocio.es/')).status).toBe(403);
  });

  it('reenvía http:// y CONNECT permitidos con el conector configurado', async () => {
    const origin = await localOrigin();
    const dialed: string[] = [];
    proxy = await startEgressProxy({
      dial: (host, p) => {
        dialed.push(`${host}:${p}`);
        return net.connect(origin, '127.0.0.1');
      },
    });
    const res = await viaProxy(proxy, 'http://minegocio.es/hola?x=1');
    expect(res).toEqual({ status: 200, body: 'ok /hola?x=1' });
    expect(await connect(proxy, 'minegocio.es:443')).toContain('200');
    expect(dialed).toEqual(['minegocio.es:80', 'minegocio.es:443']);
    expect(proxy.blocked()).toBe(0);
  });

  it('limita las conexiones simultáneas', async () => {
    const origin = await localOrigin();
    proxy = await startEgressProxy({
      maxConnections: 1,
      dial: () => net.connect(origin, '127.0.0.1'),
    });
    const first = net.connect(port(proxy), '127.0.0.1');
    await new Promise<void>((r) => {
      first.write('CONNECT a.es:443 HTTP/1.1\r\n\r\n');
      first.once('data', () => r());
    });
    expect(await connect(proxy, 'b.es:443')).toContain('403');
    first.destroy();
  });

  it('corta todo al superar el tope de bytes', async () => {
    const origin = await localOrigin();
    proxy = await startEgressProxy({
      maxBytes: 5,
      dial: () => net.connect(origin, '127.0.0.1'),
    });
    await expect(viaProxy(proxy, 'http://minegocio.es/una-respuesta-larga')).rejects.toThrow();
  });
});
