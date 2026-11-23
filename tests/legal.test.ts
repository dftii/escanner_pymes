import { describe, expect, it } from 'vitest';
import { DEFAULT_HOSTING, getLegalInfo } from '@/lib/legal';

describe('getLegalInfo', () => {
  it('lee los datos del titular de las variables de entorno', () => {
    expect(
      getLegalInfo({
        LEGAL_NOMBRE: ' Ana Pérez García ',
        LEGAL_NIF: '12345678Z',
        LEGAL_DOMICILIO: 'C/ Mayor 1, 28001 Madrid',
        LEGAL_EMAIL: 'legal@ejemplo.es',
        LEGAL_HOSTING: 'Netlify, Inc.',
        UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      }),
    ).toEqual({
      nombre: 'Ana Pérez García',
      nif: '12345678Z',
      domicilio: 'C/ Mayor 1, 28001 Madrid',
      email: 'legal@ejemplo.es',
      hosting: 'Netlify, Inc.',
      upstash: true,
    });
  });

  it('deja como pendientes los datos vacíos y usa Vercel por defecto', () => {
    expect(getLegalInfo({ LEGAL_NOMBRE: '   ' })).toEqual({
      nombre: null,
      nif: null,
      domicilio: null,
      email: null,
      hosting: DEFAULT_HOSTING,
      upstash: false,
    });
  });
});
