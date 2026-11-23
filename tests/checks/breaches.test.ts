import { describe, expect, it } from 'vitest';
import {
  breachesFinding,
  checkBreaches,
  HIBP_BREACHES_URL,
  parseBreaches,
  type Breach,
} from '@/lib/checks/breaches';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';

const NOW = new Date('2026-11-23T12:00:00Z');

const breach = (over: Partial<Breach> = {}): Breach => ({
  name: 'MiNegocio',
  title: 'Mi Negocio',
  breachDate: '2025-03-01',
  pwnCount: 12345,
  dataClasses: ['Email addresses', 'Passwords'],
  isVerified: true,
  ...over,
});

const response = (body: string, status = 200): SafeResponse => ({
  url: HIBP_BREACHES_URL,
  status,
  headers: new Headers(),
  setCookies: [],
  redirects: [],
  body,
  truncated: false,
});

describe('parseBreaches', () => {
  it('lee los campos de la API y descarta entradas raras', () => {
    expect(
      parseBreaches([
        {
          Name: 'Adobe',
          Title: 'Adobe',
          BreachDate: '2013-10-04',
          PwnCount: 152445165,
          DataClasses: ['Email addresses', 'Passwords', 7],
          IsVerified: true,
        },
        { Name: 'Raro' },
        { nada: 1 },
        null,
      ]),
    ).toEqual([
      {
        name: 'Adobe',
        title: 'Adobe',
        breachDate: '2013-10-04',
        pwnCount: 152445165,
        dataClasses: ['Email addresses', 'Passwords'],
        isVerified: true,
      },
      {
        name: 'Raro',
        title: 'Raro',
        breachDate: '',
        pwnCount: 0,
        dataClasses: [],
        isVerified: true,
      },
    ]);
  });

  it('rechaza lo que no es una lista', () => {
    expect(() => parseBreaches({})).toThrow('Respuesta inesperada');
  });
});

describe('breachesFinding', () => {
  it('ok sin filtraciones (o solo sin verificar)', () => {
    expect(breachesFinding('minegocio.es', [], NOW).status).toBe('ok');
    expect(breachesFinding('minegocio.es', [breach({ isVerified: false })], NOW).status).toBe('ok');
  });

  it('aviso con una filtración reciente, mencionando las contraseñas', () => {
    const f = breachesFinding('minegocio.es', [breach()], NOW);
    expect(f).toMatchObject({
      id: 'privacy.breaches',
      category: 'privacy',
      status: 'warning',
      title: 'Tu web aparece en una filtración de datos pública',
    });
    expect(f.detail).toBe(
      'Según Have I Been Pwned: Mi Negocio (2025, 12.345 cuentas: emails, contraseñas).',
    );
    expect(f.risk).toContain('contraseñas');
    expect(f.fix.length).toBeGreaterThan(0);
  });

  it('informativo si todas son antiguas', () => {
    const f = breachesFinding(
      'minegocio.es',
      [
        breach({ breachDate: '2015-01-01', dataClasses: ['Names'] }),
        breach({ breachDate: '', dataClasses: [] }),
      ],
      NOW,
    );
    expect(f.status).toBe('info');
    expect(f.title).toBe('Tu web aparece en 2 filtraciones de datos públicas');
    expect(f.detail).toContain('fecha desconocida');
    expect(f.risk).not.toContain('contraseñas');
  });
});

describe('checkBreaches', () => {
  const fetchWith = (res: SafeResponse, seen: string[] = []) =>
    (async (url: string) => {
      seen.push(url);
      return res;
    }) as unknown as typeof safeFetch;

  it('consulta el dominio sin www', async () => {
    const seen: string[] = [];
    const f = await checkBreaches('www.minegocio.es', {
      fetch: fetchWith(response('[]'), seen),
      now: () => NOW,
    });
    expect(seen).toEqual([`${HIBP_BREACHES_URL}?domain=minegocio.es`]);
    expect(f.status).toBe('ok');
  });

  it('error claro si la API falla o responde basura', async () => {
    await expect(
      checkBreaches('minegocio.es', { fetch: fetchWith(response('', 429)) }),
    ).rejects.toThrow('HTTP 429');
    await expect(
      checkBreaches('minegocio.es', { fetch: fetchWith(response('<html>')) }),
    ).rejects.toThrow('Respuesta inesperada');
  });
});
