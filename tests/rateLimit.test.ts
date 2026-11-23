import { describe, expect, it, vi } from 'vitest';
import {
  clientIp,
  createMemoryLimiter,
  createUpstashLimiter,
  hashKey,
  RATE_LIMIT,
  type RateLimiter,
} from '@/lib/rateLimit';

describe('createMemoryLimiter', () => {
  it('permite 5 peticiones y bloquea la sexta hasta que se reinicia la ventana', async () => {
    let t = 1_000;
    const limiter = createMemoryLimiter({ max: 5, windowMs: 600_000, now: () => t });
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await limiter.hit('ip'));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false]);
    expect(results[4]!.remaining).toBe(0);
    expect(results[0]!.resetAt).toBe(601_000);

    expect((await limiter.hit('otra-ip')).allowed).toBe(true);

    t = 601_000;
    expect(await limiter.hit('ip')).toMatchObject({ allowed: true, remaining: 4 });
  });

  it('limpia entradas caducadas cuando crece mucho', async () => {
    let t = 0;
    const limiter = createMemoryLimiter({ max: 1, windowMs: 10, now: () => t });
    for (let i = 0; i <= 10_001; i++) await limiter.hit(`k${i}`);
    t = 100;
    expect((await limiter.hit('k0')).allowed).toBe(true);
  });
});

describe('createUpstashLimiter', () => {
  const okResponse = (count: number, ttl: number) =>
    new Response(JSON.stringify([{ result: count }, { result: 1 }, { result: ttl }]));

  it('usa el pipeline de Upstash con la clave y el token', async () => {
    const fetchImpl = vi.fn(async () => okResponse(6, 30_000));
    const limiter = createUpstashLimiter({
      url: 'https://redis.example/',
      token: 'tok',
      max: 5,
      windowMs: 600_000,
      now: () => 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await limiter.hit('abc')).toEqual({ allowed: false, remaining: 0, resetAt: 30_000 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://redis.example/pipeline');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)[0]).toEqual(['INCR', 'rl:scan:abc']);
  });

  it('usa la ventana completa si el TTL no es válido', async () => {
    const limiter = createUpstashLimiter({
      url: 'https://redis.example',
      token: 't',
      max: 5,
      windowMs: 1000,
      now: () => 0,
      fetchImpl: (async () => okResponse(1, -1)) as unknown as typeof fetch,
    });
    expect(await limiter.hit('k')).toEqual({ allowed: true, remaining: 4, resetAt: 1000 });
  });

  it.each([
    ['HTTP 500', async () => new Response('x', { status: 500 })],
    ['JSON raro', async () => new Response(JSON.stringify([{ error: 'x' }]))],
    ['red caída', async () => Promise.reject(new Error('down'))],
  ])('recurre al respaldo si Upstash falla (%s)', async (_name, impl) => {
    const fallback: RateLimiter = {
      hit: vi.fn(async () => ({ allowed: true, remaining: 9, resetAt: 1 })),
    };
    const limiter = createUpstashLimiter({
      url: 'https://redis.example',
      token: 't',
      ...RATE_LIMIT,
      fetchImpl: impl as unknown as typeof fetch,
      fallback,
    });
    expect(await limiter.hit('k')).toMatchObject({ remaining: 9 });
    expect(fallback.hit).toHaveBeenCalledWith('k');
  });
});

describe('hashKey', () => {
  it('no contiene la IP y depende de la sal', () => {
    const a = hashKey('203.0.113.5', 's1');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain('203');
    expect(hashKey('203.0.113.5', 's1')).toBe(a);
    expect(hashKey('203.0.113.5', 's2')).not.toBe(a);
  });
});

describe('clientIp', () => {
  it('usa la primera IP de x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }))).toBe('1.2.3.4');
  });
  it('recurre a x-real-ip y después a unknown', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});

describe('getRateLimiter', () => {
  const load = async () => {
    vi.resetModules();
    return (await import('@/lib/rateLimit')).getRateLimiter;
  };

  it('usa memoria sin Upstash y reutiliza la instancia', async () => {
    const getRateLimiter = await load();
    const a = getRateLimiter({});
    expect(a.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(getRateLimiter({ RATE_LIMIT_SALT: 'otra' })).toBe(a);
  });

  it('con Upstash deriva una sal estable del token', async () => {
    const env = { UPSTASH_REDIS_REST_URL: 'https://r', UPSTASH_REDIS_REST_TOKEN: 'tok' };
    const first = (await load())(env).salt;
    const second = (await load())(env).salt;
    expect(first).toBe(second);
  });

  it('respeta RATE_LIMIT_SALT', async () => {
    expect((await load())({ RATE_LIMIT_SALT: 'fija' }).salt).toBe('fija');
  });
});
