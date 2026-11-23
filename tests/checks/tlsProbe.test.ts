import dns from 'node:dns';
import { readFileSync } from 'node:fs';
import net, { type AddressInfo, type LookupFunction } from 'node:net';
import tls from 'node:tls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { probeTls, TlsProbeError } from '@/lib/checks/tlsProbe';

/** Certificado autofirmado generado solo para estos tests. */
const fixture = (name: string) => readFileSync(new URL(`../fixtures/tls/${name}`, import.meta.url));

/** Lookup sin restricciones: aquí sí queremos conectar a localhost. */
const localLookup = dns.lookup as unknown as LookupFunction;

const sockets = new Set<net.Socket>();

const listen = async (server: net.Server) => {
  server.on('connection', (socket: net.Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
};

/** Cierra el servidor sin esperar a las conexiones que se quedaron colgadas. */
const close = (server: net.Server) => {
  for (const socket of sockets) socket.destroy();
  return new Promise<void>((resolve) => server.close(() => resolve()));
};

describe('probeTls contra servidores locales', () => {
  const servers: net.Server[] = [];
  let tlsPort: number;
  let garbagePort: number;
  let silentPort: number;

  beforeAll(async () => {
    const tlsServer = tls.createServer(
      { key: fixture('test-only-key.pem'), cert: fixture('test-only-cert.pem') },
      (socket) => socket.end(),
    );
    const garbage = net.createServer((socket) => socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'));
    const silent = net.createServer(() => {});
    servers.push(tlsServer, garbage, silent);
    [tlsPort, garbagePort, silentPort] = (await Promise.all(servers.map(listen))) as [
      number,
      number,
      number,
    ];
  });

  afterAll(async () => {
    await Promise.all(servers.map(close));
  });

  it('devuelve el certificado autofirmado sin rechazarlo', async () => {
    const probe = await probeTls('localhost', { port: tlsPort, lookup: localLookup });
    expect(probe.authorized).toBe(false);
    expect(probe.authorizationError).toBe('DEPTH_ZERO_SELF_SIGNED_CERT');
    expect(probe.protocol).toBe('TLSv1.3');
    expect(probe.cert?.subject.CN).toBe('localhost');
    expect(probe.cert?.subjectaltname).toBe('DNS:localhost');
  });

  it('clasifica un servidor que no habla TLS como fallo de handshake', async () => {
    const error = await probeTls('localhost', { port: garbagePort, lookup: localLookup }).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(TlsProbeError);
    expect((error as TlsProbeError).kind).toBe('handshake');
  });

  it('clasifica un puerto cerrado como rechazado', async () => {
    const closed = net.createServer();
    const port = await listen(closed);
    await close(closed);
    const error = await probeTls('localhost', { port, lookup: localLookup }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'refused', code: 'ECONNREFUSED' });
  });

  it('corta por timeout si el servidor no responde', async () => {
    const error = await probeTls('localhost', {
      port: silentPort,
      lookup: localLookup,
      timeoutMs: 150,
    }).catch((e) => e);
    expect(error).toMatchObject({ kind: 'timeout' });
  });

  it('con el lookup por defecto bloquea localhost antes de conectar', async () => {
    const error = await probeTls('localhost', { port: tlsPort }).catch((e) => e);
    expect(error).toMatchObject({ code: 'private_address' });
  });
});
