import { describe, expect, it } from 'vitest';
import { normalizeDomain } from '@/lib/net/domain';
import { ScanError } from '@/lib/net/errors';

const codeOf = (input: string) => {
  try {
    normalizeDomain(input);
    return 'ok';
  } catch (error) {
    expect(error).toBeInstanceOf(ScanError);
    return (error as ScanError).code;
  }
};

describe('normalizeDomain', () => {
  it.each([
    ['minegocio.es', 'minegocio.es'],
    ['  MiNegocio.ES  ', 'minegocio.es'],
    ['https://www.minegocio.es/contacto?x=1#form', 'www.minegocio.es'],
    ['http://minegocio.es:8080', 'minegocio.es'],
    ['minegocio.es.', 'minegocio.es'],
    ['minegocio.es/aviso-legal', 'minegocio.es'],
    ['peluquería.es', 'xn--peluquera-n5a.es'],
    ['tienda.xn--p1ai', 'tienda.xn--p1ai'],
    ['sub.dominio.co.uk', 'sub.dominio.co.uk'],
  ])('normaliza %s → %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([
    ['', 'invalid_domain'],
    ['   ', 'invalid_domain'],
    ['mi negocio.es', 'invalid_domain'],
    ['minegocio', 'invalid_domain'],
    ['ftp://minegocio.es', 'invalid_domain'],
    ['https://user:pass@minegocio.es', 'invalid_domain'],
    ['-malo.es', 'invalid_domain'],
    ['minegocio.e5', 'invalid_domain'],
    ['a'.repeat(64) + '.es', 'invalid_domain'],
    [`${'a'.repeat(60)}.`.repeat(5) + 'es', 'invalid_domain'],
    ['x'.repeat(3000), 'invalid_domain'],
    ['http://[', 'invalid_domain'],
    ['127.0.0.1', 'ip_not_allowed'],
    ['http://[::1]/', 'ip_not_allowed'],
    ['8.8.8.8', 'ip_not_allowed'],
    ['localhost', 'invalid_domain'],
    ['app.localhost', 'reserved_domain'],
    ['servidor.local', 'reserved_domain'],
    ['intranet.corp', 'reserved_domain'],
    ['ejemplo.test', 'reserved_domain'],
    ['1.0.0.127.in-addr.arpa', 'reserved_domain'],
  ])('rechaza %j con %s', (input, code) => {
    expect(codeOf(input)).toBe(code);
  });
});
