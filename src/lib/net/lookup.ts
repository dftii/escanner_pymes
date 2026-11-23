import dns from 'node:dns';
import type { LookupAddress } from 'node:dns';
import { ScanError } from './errors';
import { isBlockedIp } from './ip';

/** Resuelve un nombre a todas sus IPs. Inyectable para tests. */
export type Resolver = (hostname: string) => Promise<LookupAddress[]>;

export const systemResolver: Resolver = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

const NOT_FOUND_CODES = new Set(['ENOTFOUND', 'ENODATA', 'EAI_NONAME', 'EAI_NODATA']);

/**
 * Resuelve el dominio y exige que TODAS sus IPs sean públicas.
 * Si alguna es interna se rechaza el dominio entero: así no hay forma de
 * colar una IP privada mezclada con otras públicas.
 *
 * @throws {ScanError} `domain_not_found`, `private_address` o `network`.
 */
export async function resolvePublic(
  hostname: string,
  resolver: Resolver = systemResolver,
): Promise<LookupAddress[]> {
  let addresses: LookupAddress[];
  try {
    addresses = await resolver(hostname);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code && NOT_FOUND_CODES.has(code)) throw notFound();
    throw new ScanError(
      'network',
      'No hemos podido consultar el DNS del dominio. Inténtalo de nuevo en unos minutos.',
      502,
    );
  }
  if (addresses.length === 0) throw notFound();
  if (addresses.some((a) => isBlockedIp(a.address))) {
    throw new ScanError(
      'private_address',
      'Ese dominio apunta a una dirección interna o reservada, así que no podemos analizarlo.',
    );
  }
  return addresses;
}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

/**
 * Función compatible con `dns.lookup` para pasarla a `net`/`tls`/undici.
 * La comprobación ocurre justo en el momento de conectar, por lo que un
 * cambio de DNS entre la validación y la conexión (DNS rebinding) no sirve.
 */
export function createSafeLookup(resolver: Resolver = systemResolver) {
  return function safeLookup(
    hostname: string,
    options: { all?: boolean; family?: number | string } | LookupCallback,
    maybeCallback?: LookupCallback,
  ): void {
    const callback = (typeof options === 'function' ? options : maybeCallback)!;
    const opts = typeof options === 'function' ? {} : options;
    const wanted = opts.family === 6 || opts.family === 'IPv6' ? 6 : opts.family === 4 ? 4 : 0;

    resolvePublic(hostname, resolver).then(
      (addresses) => {
        const filtered = wanted ? addresses.filter((a) => a.family === wanted) : addresses;
        const list = filtered.length > 0 ? filtered : addresses;
        if (opts.all) callback(null, list);
        else callback(null, list[0]!.address, list[0]!.family);
      },
      (error: Error) => callback(error as NodeJS.ErrnoException, opts.all ? [] : ''),
    );
  };
}

function notFound(): ScanError {
  return new ScanError(
    'domain_not_found',
    'No encontramos ese dominio. Revisa que esté bien escrito y que la web esté publicada.',
    404,
  );
}
