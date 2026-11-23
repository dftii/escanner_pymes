import type { LookupFunction } from 'node:net';
import tls, { type DetailedPeerCertificate } from 'node:tls';
import { isScanError } from '../net/errors';
import { createSafeLookup } from '../net/lookup';

export type TlsProbe = {
  /** La cadena es de confianza (no comprueba el nombre; eso va aparte). */
  authorized: boolean;
  /** Código de OpenSSL, p. ej. `CERT_HAS_EXPIRED`, o `null`. */
  authorizationError: string | null;
  /** Versión negociada, p. ej. `TLSv1.3`. */
  protocol: string | null;
  cert: DetailedPeerCertificate | null;
};

export type TlsFailureKind = 'refused' | 'handshake' | 'timeout' | 'other';

/** Fallo al conectar por TLS, clasificado para el informe. */
export class TlsProbeError extends Error {
  readonly kind: TlsFailureKind;
  readonly code: string | undefined;
  constructor(kind: TlsFailureKind, code: string | undefined, message: string) {
    super(message);
    this.name = 'TlsProbeError';
    this.kind = kind;
    this.code = code;
  }
}

export type ProbeOptions = {
  port?: number;
  timeoutMs?: number;
  /** Por defecto, el lookup seguro (bloquea IPs internas al conectar). */
  lookup?: LookupFunction;
};

const REFUSED = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH']);

/**
 * Abre una conexión TLS al puerto 443 y devuelve el certificado y la versión.
 * No rechaza certificados inválidos: los queremos ver para explicarlos.
 * Acepta TLS 1.0+ para poder detectar servidores anticuados.
 */
export function probeTls(host: string, options: ProbeOptions = {}): Promise<TlsProbe> {
  const { port = 443, timeoutMs = 8_000 } = options;
  const lookup = options.lookup ?? (createSafeLookup() as unknown as LookupFunction);

  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      lookup,
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
      ciphers: 'DEFAULT:@SECLEVEL=0',
      ALPNProtocols: ['http/1.1'],
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new TlsProbeError('timeout', 'ETIMEDOUT', 'La conexión segura ha tardado demasiado.'));
    }, timeoutMs);

    socket.once('secureConnect', () => {
      clearTimeout(timer);
      const cert = socket.getPeerCertificate(true);
      const error = socket.authorizationError as unknown as { code?: string } | string | null;
      resolve({
        authorized: socket.authorized,
        authorizationError: error
          ? typeof error === 'string'
            ? error
            : (error.code ?? String(error))
          : null,
        protocol: socket.getProtocol(),
        cert: cert && Object.keys(cert).length > 0 ? cert : null,
      });
      socket.end();
    });

    socket.once('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      socket.destroy();
      if (isScanError(error)) return reject(error);
      reject(classify(error));
    });
  });
}

function classify(error: NodeJS.ErrnoException): TlsProbeError {
  const code = error.code;
  if (code && REFUSED.has(code)) {
    return new TlsProbeError('refused', code, 'La web no acepta conexiones seguras (puerto 443).');
  }
  if (code === 'ETIMEDOUT') {
    return new TlsProbeError('timeout', code, 'La conexión segura ha tardado demasiado.');
  }
  if (
    code === 'EPROTO' ||
    code?.startsWith('ERR_SSL') ||
    /handshake|ssl|tls/i.test(error.message)
  ) {
    return new TlsProbeError(
      'handshake',
      code,
      'La web no ha podido establecer una conexión segura.',
    );
  }
  return new TlsProbeError('other', code, error.message);
}
