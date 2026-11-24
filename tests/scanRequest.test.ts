import { describe, expect, it } from 'vitest';
import { isScanError } from '@/lib/net/errors';
import { parseScanRequest, requestLocale } from '@/lib/scanRequest';

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
      locale: 'es',
    });
  });

  it('acepta el idioma y rechaza los desconocidos', () => {
    expect(parseScanRequest({ domain: 'a.es', consent: true, locale: 'ca' }).locale).toBe('ca');
    expect(() => parseScanRequest({ domain: 'a.es', consent: true, locale: 'fr' })).toThrow();
    expect(requestLocale({ locale: 'en' })).toBe('en');
    expect(requestLocale({ locale: 'fr' })).toBe('es');
    expect(requestLocale(null)).toBe('es');
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
