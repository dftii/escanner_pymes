import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { normalizeDomain } from './domain';
import { ScanError, isScanError } from './errors';
import { isBlockedIp } from './ip';
import { createSafeLookup, systemResolver, type Resolver } from './lookup';

export const SAFE_FETCH_DEFAULTS = {
  timeoutMs: 8_000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 5,
} as const;

export const USER_AGENT =
  'Mozilla/5.0 (compatible; EscanerPymes/0.1; analisis pasivo de seguridad)';

const ALLOWED_PORTS = new Set(['', '80', '443']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type RedirectHop = { url: string; status: number; setCookies: string[] };

export type SafeResponse = {
  /** URL final tras seguir las redirecciones. */
  url: string;
  status: number;
  headers: Headers;
  /** `Set-Cookie` de la respuesta final. */
  setCookies: string[];
  /** Saltos de redirección previos, con sus propias cookies. */
  redirects: RedirectHop[];
  body: string;
  /** `true` si el cuerpo superaba `maxBytes` y se ha cortado. */
  truncated: boolean;
};

type RequestInitLike = {
  method: string;
  headers: Record<string, string>;
  redirect: 'manual';
  signal: AbortSignal;
  dispatcher?: Agent;
};
export type FetchLike = (url: string, init: RequestInitLike) => Promise<Response>;

export type SafeFetchOptions = {
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  /** Para tests: resolutor DNS alternativo. */
  resolver?: Resolver;
  /** Para tests: implementación de fetch alternativa (se salta el Agent). */
  fetchImpl?: FetchLike;
};

const agents = new WeakMap<Resolver, Agent>();

function agentFor(resolver: Resolver): Agent {
  let agent = agents.get(resolver);
  if (!agent) {
    agent = new Agent({
      connect: { lookup: createSafeLookup(resolver), timeout: SAFE_FETCH_DEFAULTS.timeoutMs },
      headersTimeout: SAFE_FETCH_DEFAULTS.timeoutMs,
      bodyTimeout: SAFE_FETCH_DEFAULTS.timeoutMs,
    });
    agents.set(resolver, agent);
  }
  return agent;
}

/**
 * Comprueba que una URL (inicial o de redirección) se puede visitar:
 * solo http/https, puertos 80/443, sin IPs internas ni dominios reservados.
 */
export function assertSafeUrl(input: string | URL): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ScanError('bad_url', 'La web nos ha enviado a una dirección no válida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScanError('bad_url', 'La web nos ha enviado a una dirección que no es http/https.');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new ScanError('bad_url', 'Solo analizamos webs en los puertos estándar (80 y 443).');
  }
  if (url.username || url.password) {
    throw new ScanError('bad_url', 'La dirección incluye credenciales y no la seguimos.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new ScanError(
        'private_address',
        'La web redirige a una dirección interna o reservada; no la seguimos.',
      );
    }
  } else {
    normalizeDomain(host);
  }
  return url;
}

/**
 * `fetch` endurecido para el escáner:
 * - valida cada salto de redirección (máx. 5) con {@link assertSafeUrl};
 * - valida las IPs en el momento de conectar (anti DNS rebinding);
 * - corta a los 8 s y lee como mucho 2 MB de cuerpo.
 *
 * @throws {ScanError} con mensaje para el usuario.
 */
export async function safeFetch(
  input: string,
  options: SafeFetchOptions = {},
): Promise<SafeResponse> {
  const timeoutMs = options.timeoutMs ?? SAFE_FETCH_DEFAULTS.timeoutMs;
  const maxBytes = options.maxBytes ?? SAFE_FETCH_DEFAULTS.maxBytes;
  const maxRedirects = options.maxRedirects ?? SAFE_FETCH_DEFAULTS.maxRedirects;
  const doFetch: FetchLike = options.fetchImpl ?? (undiciFetch as unknown as FetchLike);
  const dispatcher = options.fetchImpl ? undefined : agentFor(options.resolver ?? systemResolver);

  let method: string = options.method ?? 'GET';
  let current = assertSafeUrl(input);
  const redirects: RedirectHop[] = [];

  for (;;) {
    const signal = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await doFetch(current.href, {
        method,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'accept-language': 'es-ES,es;q=0.9',
          ...options.headers,
        },
        redirect: 'manual',
        signal,
        ...(dispatcher ? { dispatcher } : {}),
      });
    } catch (error) {
      throw toScanError(error);
    }

    const location = response.headers.get('location');
    if (REDIRECT_STATUSES.has(response.status) && location) {
      await response.body?.cancel().catch(() => {});
      redirects.push({
        url: current.href,
        status: response.status,
        setCookies: response.headers.getSetCookie(),
      });
      if (redirects.length > maxRedirects) {
        throw new ScanError(
          'too_many_redirects',
          `La web encadena más de ${maxRedirects} redirecciones; revisa su configuración.`,
        );
      }
      current = assertSafeUrl(new URL(location, current));
      if (response.status === 303 || (response.status <= 302 && method !== 'HEAD')) {
        method = 'GET';
      }
      continue;
    }

    let body = '';
    let truncated = false;
    if (method !== 'HEAD') {
      try {
        ({ body, truncated } = await readLimited(response, maxBytes));
      } catch (error) {
        throw toScanError(error);
      }
    }

    return {
      url: current.href,
      status: response.status,
      headers: response.headers,
      setCookies: response.headers.getSetCookie(),
      redirects,
      body,
      truncated,
    };
  }
}

async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: '', truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = maxBytes - size;
    if (value.byteLength >= room) {
      // Al llegar al límite dejamos de leer: puede que hubiera más, se marca como cortado.
      chunks.push(value.subarray(0, room));
      size += room;
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder('utf-8').decode(merged), truncated };
}

/** Busca un ScanError en la cadena de `cause` o traduce el error de red. */
export function toScanError(error: unknown): ScanError {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (isScanError(current)) return current;
    current = (current as { cause?: unknown }).cause;
  }
  const name = (error as { name?: string } | undefined)?.name;
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new ScanError(
      'timeout',
      'La web ha tardado demasiado en responder (más de 8 segundos).',
      504,
    );
  }
  return new ScanError(
    'network',
    'No hemos podido conectar con la web. Comprueba que está en línea.',
    502,
  );
}
