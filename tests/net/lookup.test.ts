import type { LookupAddress } from 'node:dns';
import { describe, expect, it } from 'vitest';
import { ScanError } from '@/lib/net/errors';
import { createSafeLookup, resolvePublic, systemResolver, type Resolver } from '@/lib/net/lookup';

const fixed =
  (...addresses: LookupAddress[]): Resolver =>
  async () =>
    addresses;

const failing =
  (code: string): Resolver =>
  async () => {
    throw Object.assign(new Error(code), { code });
  };

const v4 = (address: string): LookupAddress => ({ address, family: 4 });
const v6 = (address: string): LookupAddress => ({ address, family: 6 });

describe('resolvePublic', () => {
  it('devuelve las IPs si todas son públicas', async () => {
    await expect(
      resolvePublic('a.es', fixed(v4('8.8.8.8'), v6('2606:4700::1'))),
    ).resolves.toHaveLength(2);
  });

  it('rechaza el dominio si alguna IP es interna', async () => {
    await expect(resolvePublic('a.es', fixed(v4('8.8.8.8'), v4('10.0.0.1')))).rejects.toMatchObject(
      {
        code: 'private_address',
      },
    );
  });

  it.each(['ENOTFOUND', 'ENODATA'])('traduce %s a domain_not_found', async (code) => {
    await expect(resolvePublic('a.es', failing(code))).rejects.toMatchObject({
      code: 'domain_not_found',
      httpStatus: 404,
    });
  });

  it('trata una respuesta vacía como dominio inexistente', async () => {
    await expect(resolvePublic('a.es', fixed())).rejects.toMatchObject({
      code: 'domain_not_found',
    });
  });

  it('traduce otros errores de DNS a network', async () => {
    await expect(resolvePublic('a.es', failing('ESERVFAIL'))).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('el resolutor del sistema resuelve localhost (y se bloquea)', async () => {
    await expect(resolvePublic('localhost', systemResolver)).rejects.toMatchObject({
      code: 'private_address',
    });
  });
});

describe('createSafeLookup', () => {
  const call = (resolver: Resolver, options: Parameters<ReturnType<typeof createSafeLookup>>[1]) =>
    new Promise<{ error: unknown; address: unknown; family: unknown }>((resolve) => {
      const cb = (error: unknown, address: unknown, family?: unknown) =>
        resolve({ error, address, family });
      if (typeof options === 'function') createSafeLookup(resolver)('a.es', cb);
      else createSafeLookup(resolver)('a.es', options, cb);
    });

  const pub = fixed(v4('8.8.8.8'), v6('2606:4700::1'));

  it('devuelve una sola dirección por defecto', async () => {
    expect(await call(pub, {})).toEqual({ error: null, address: '8.8.8.8', family: 4 });
  });

  it('acepta la firma sin opciones', async () => {
    const result = await call(pub, (() => {}) as never);
    expect(result).toMatchObject({ error: null, address: '8.8.8.8' });
  });

  it('respeta all: true', async () => {
    const { address } = await call(pub, { all: true });
    expect(address).toHaveLength(2);
  });

  it('filtra por familia', async () => {
    expect(await call(pub, { family: 6 })).toMatchObject({ address: '2606:4700::1', family: 6 });
    expect(await call(pub, { family: 'IPv6' })).toMatchObject({ family: 6 });
    expect(await call(fixed(v4('8.8.8.8')), { family: 6 })).toMatchObject({ address: '8.8.8.8' });
  });

  it('devuelve el ScanError si la IP es interna', async () => {
    const { error } = await call(fixed(v4('127.0.0.1')), {});
    expect(error).toBeInstanceOf(ScanError);
    expect(error).toMatchObject({ code: 'private_address' });
    const all = await call(fixed(v4('127.0.0.1')), { all: true });
    expect(all.address).toEqual([]);
  });
});
