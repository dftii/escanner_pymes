import http from 'node:http';
import net from 'node:net';
import type { Duplex } from 'node:stream';
import { isBlockedIp } from './ip';
import { createSafeLookup, systemResolver, type Resolver } from './lookup';

/**
 * Proxy HTTP local por el que sale TODO el tráfico del navegador headless.
 *
 * Chromium resuelve y conecta por su cuenta, así que no podemos confiar en
 * comprobar las URLs antes de pedirlas (un cambio de DNS entre la comprobación
 * y la conexión lo saltaría). En su lugar, el navegador se lanza con
 * `--proxy-server` apuntando aquí y es este proxy quien conecta, usando el
 * mismo `safeLookup` que `safeFetch`: la IP se valida en el momento exacto de
 * abrir el socket. Solo se permiten los puertos 80 y 443.
 */
export type EgressProxy = {
  /** `http://127.0.0.1:<puerto>`, para `--proxy-server`. */
  url: string;
  /** Conexiones rechazadas (IP interna, puerto no permitido o petición mal formada). */
  blocked: () => number;
  close: () => Promise<void>;
};

export type EgressProxyOptions = {
  resolver?: Resolver;
  /** Puertos de destino permitidos. Por defecto 80 y 443. */
  allowedPorts?: ReadonlySet<number>;
  /** Máximo de conexiones simultáneas hacia fuera. */
  maxConnections?: number;
  /** Tope de bytes descargados en total; al superarlo se cortan las conexiones. */
  maxBytes?: number;
  /**
   * Para tests: abre la conexión de salida. Por defecto `net.connect` con el
   * lookup seguro. Las comprobaciones de puerto e IP literal se hacen antes.
   */
  dial?: (host: string, port: number) => net.Socket;
};

const DEFAULT_PORTS: ReadonlySet<number> = new Set([80, 443]);

export async function startEgressProxy(options: EgressProxyOptions = {}): Promise<EgressProxy> {
  const lookup = createSafeLookup(options.resolver ?? systemResolver);
  const allowedPorts = options.allowedPorts ?? DEFAULT_PORTS;
  const maxConnections = options.maxConnections ?? 32;
  const maxBytes = options.maxBytes ?? 20 * 1024 * 1024;
  const dial =
    options.dial ?? ((host: string, port: number) => net.connect({ host, port, lookup }));

  let blocked = 0;
  let bytes = 0;
  let upstreams = 0;
  const sockets = new Set<Duplex>();

  const track = (socket: Duplex) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  };

  /** Valida host y puerto; las IPs literales no pasan por el lookup, se miran aquí. */
  const target = (host: string, port: number): { host: string; port: number } | null => {
    const bare = host.replace(/^\[|\]$/g, '');
    if (!bare || !allowedPorts.has(port)) return null;
    if (net.isIP(bare) && isBlockedIp(bare)) return null;
    return { host: bare, port };
  };

  /** Registra una conexión hacia fuera: cuenta bytes y conexiones abiertas. */
  const outbound = (socket: Duplex) => {
    track(socket);
    upstreams++;
    socket.on('close', () => upstreams--);
    socket.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        for (const s of sockets) s.destroy();
      }
    });
  };

  const server = http.createServer((req, res) => {
    // Peticiones http:// en claro: llegan con la URL absoluta.
    let url: URL;
    try {
      url = new URL(req.url ?? '');
    } catch {
      blocked++;
      res.writeHead(400).end();
      return;
    }
    const dest = url.protocol === 'http:' ? target(url.hostname, Number(url.port || 80)) : null;
    if (!dest || upstreams >= maxConnections) {
      blocked++;
      res.writeHead(403).end();
      return;
    }
    const headers = { ...req.headers };
    delete headers['proxy-connection'];
    delete headers['proxy-authorization'];
    const upstream = http.request(
      {
        host: dest.host,
        port: dest.port,
        method: req.method,
        path: `${url.pathname}${url.search}`,
        headers,
        // Un socket por petición (sin agente): así cada conexión se cuenta una sola vez.
        createConnection: () => dial(dest.host, dest.port),
      },
      (upRes) => {
        res.writeHead(upRes.statusCode ?? 502, upRes.headers);
        upRes.pipe(res);
      },
    );
    upstream.on('socket', outbound);
    upstream.on('error', (error: NodeJS.ErrnoException) => {
      if (error.name === 'ScanError') blocked++;
      // Se corta la conexión en vez de responder: así el navegador lo ve como
      // un fallo de red y no como una página cargada.
      res.destroy();
    });
    req.pipe(upstream);
  });

  // https:// y WebSockets: túnel CONNECT host:puerto.
  server.on('connect', (req: http.IncomingMessage, client: Duplex, head: Buffer) => {
    track(client);
    client.on('error', () => client.destroy());
    const match = /^(\[[^\]]+\]|[^:]+):(\d{1,5})$/.exec(req.url ?? '');
    const dest = match ? target(match[1]!, Number(match[2])) : null;
    if (!dest || upstreams >= maxConnections) {
      blocked++;
      client.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const upstream = dial(dest.host, dest.port);
    outbound(upstream);
    upstream.on('connect', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length > 0) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.on('error', (error) => {
      if (error.name === 'ScanError') blocked++;
      if (client.writable) client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      client.destroy();
    });
  });

  server.on('connection', (socket) => track(socket));

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const { port } = server.address() as net.AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    blocked: () => blocked,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}
