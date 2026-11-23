import { createHash, randomBytes } from 'node:crypto';

/** 5 análisis cada 10 minutos por IP. */
export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } as const;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Momento (ms epoch) en que se reinicia la ventana. */
  resetAt: number;
};

export interface RateLimiter {
  hit(key: string): Promise<RateLimitResult>;
}

type LimiterConfig = { max: number; windowMs: number; now?: () => number };

/**
 * Ventana fija en memoria. En Vercel cada instancia tiene la suya, así que es
 * un mínimo razonable; para un límite global hay que configurar Upstash.
 */
export function createMemoryLimiter({ max, windowMs, now = Date.now }: LimiterConfig): RateLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return {
    async hit(key) {
      const t = now();
      if (windows.size > 10_000) {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
      }
      let w = windows.get(key);
      if (!w || w.resetAt <= t) {
        w = { count: 0, resetAt: t + windowMs };
        windows.set(key, w);
      }
      w.count += 1;
      return { allowed: w.count <= max, remaining: Math.max(0, max - w.count), resetAt: w.resetAt };
    },
  };
}

type UpstashConfig = LimiterConfig & {
  url: string;
  token: string;
  fetchImpl?: typeof fetch;
  fallback?: RateLimiter;
};

/**
 * Ventana fija compartida en Upstash Redis (API REST, sin dependencias).
 * Si Upstash falla se usa el limitador de respaldo en memoria para no dejar
 * la herramienta ni bloqueada ni sin límite.
 */
export function createUpstashLimiter({
  url,
  token,
  max,
  windowMs,
  now = Date.now,
  fetchImpl = fetch,
  fallback = createMemoryLimiter({ max, windowMs, now }),
}: UpstashConfig): RateLimiter {
  const endpoint = `${url.replace(/\/$/, '')}/pipeline`;
  return {
    async hit(key) {
      const redisKey = `rl:scan:${key}`;
      try {
        const res = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify([
            ['INCR', redisKey],
            ['PEXPIRE', redisKey, String(windowMs), 'NX'],
            ['PTTL', redisKey],
          ]),
          signal: AbortSignal.timeout(2_000),
        });
        if (!res.ok) throw new Error(`Upstash ${res.status}`);
        const data = (await res.json()) as Array<{ result?: number; error?: string }>;
        const count = Number(data[0]?.result);
        const ttl = Number(data[2]?.result);
        if (!Number.isFinite(count)) throw new Error('Respuesta de Upstash no válida');
        return {
          allowed: count <= max,
          remaining: Math.max(0, max - count),
          resetAt: now() + (ttl > 0 ? ttl : windowMs),
        };
      } catch {
        return fallback.hit(key);
      }
    },
  };
}

/**
 * Hash de la IP con sal: el almacén nunca ve la IP en claro.
 * La sal sale de `RATE_LIMIT_SALT`; sin ella se deriva del token de Upstash o,
 * si no hay Upstash, se genera una aleatoria por proceso.
 */
export function hashKey(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/** IP del cliente según las cabeceras que pone Vercel (o `unknown`). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}

type Env = Record<string, string | undefined>;

let singleton: { limiter: RateLimiter; salt: string } | undefined;

/** Limitador de la aplicación: Upstash si está configurado, si no memoria. */
export function getRateLimiter(env: Env = process.env): { limiter: RateLimiter; salt: string } {
  if (singleton) return singleton;
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  // Con Upstash la sal tiene que ser la misma en todas las instancias.
  const salt =
    env.RATE_LIMIT_SALT ||
    (token
      ? createHash('sha256').update(`salt:${token}`).digest('hex')
      : randomBytes(16).toString('hex'));
  const limiter =
    url && token
      ? createUpstashLimiter({ url, token, ...RATE_LIMIT })
      : createMemoryLimiter(RATE_LIMIT);
  singleton = { limiter, salt };
  return singleton;
}
