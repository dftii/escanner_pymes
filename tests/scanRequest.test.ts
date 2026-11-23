import { describe, expect, it } from 'vitest';
import { isScanError } from '@/lib/net/errors';
import { parseScanRequest } from '@/lib/scanRequest';

const codeOf = (body: unknown) => {
  try {
    parseScanRequest(body);
    return 'ok';
  } catch (error) {
    return isScanError(error) ? error.code : 'otro';
  }
};

describe('parseScanRequest', () => {
  it('devuelve el dominio normalizado', () => {
    expect(parseScanRequest({ domain: 'https://MiNegocio.es/', consent: true })).toEqual({
      domain: 'minegocio.es',
    });
  });

  it.each([
    [null, 'invalid_domain'],
    ['texto', 'invalid_domain'],
    [{ domain: 'a.es' }, 'invalid_domain'],
    [{ domain: 42, consent: true }, 'invalid_domain'],
    [{ domain: 'a.es', consent: false }, 'consent_required'],
    [{ domain: 'localhost', consent: true }, 'invalid_domain'],
    [{ domain: '10.0.0.1', consent: true }, 'ip_not_allowed'],
  ])('rechaza %j con %s', (body, code) => {
    expect(codeOf(body)).toBe(code);
  });
});
