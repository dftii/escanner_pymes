import { describe, expect, it } from 'vitest';
import { checkHeaders } from '@/lib/checks/headers';
import type { Finding } from '@/lib/types';

const run = (headers: Record<string, string>, url = 'https://minegocio.es/') =>
  Object.fromEntries(
    checkHeaders({ url, headers: new Headers(headers) }).map((f) => [f.id, f]),
  ) as Record<string, Finding>;

const GOOD = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=()',
  server: 'nginx',
};

describe('checkHeaders', () => {
  it('una web bien configurada lo tiene todo en ok', () => {
    const f = run(GOOD);
    expect(Object.keys(f)).toHaveLength(7);
    for (const finding of Object.values(f)) {
      expect(finding.status, finding.id).toBe('ok');
      expect(finding.category).toBe('headers');
    }
  });

  it('una web sin cabeceras', () => {
    const f = run({});
    expect(f['headers.hsts']).toMatchObject({ status: 'warning' });
    expect(f['headers.csp']).toMatchObject({ status: 'warning' });
    expect(f['headers.xcto']).toMatchObject({ status: 'warning' });
    expect(f['headers.framing']).toMatchObject({ status: 'warning' });
    expect(f['headers.referrer']).toMatchObject({ status: 'info' });
    expect(f['headers.permissions']).toMatchObject({ status: 'info' });
    expect(f['headers.disclosure']).toMatchObject({ status: 'ok' });
    for (const id of ['headers.hsts', 'headers.csp', 'headers.xcto', 'headers.framing']) {
      expect(f[id]!.fix.length, id).toBeGreaterThan(0);
    }
  });

  describe('HSTS', () => {
    it('no aplica si la web va por http', () => {
      expect(run({}, 'http://minegocio.es/')['headers.hsts']).toMatchObject({ status: 'info' });
    });
    it.each([
      ['max-age=300', 'warning'],
      ['max-age="15552000"', 'ok'],
      ['includeSubDomains', 'warning'],
      ['MAX-AGE = 63072000; preload', 'ok'],
    ])('%s → %s', (value, status) => {
      expect(run({ 'strict-transport-security': value })['headers.hsts']).toMatchObject({ status });
    });
    it('explica un max-age ilegible', () => {
      expect(run({ 'strict-transport-security': 'preload' })['headers.hsts']!.detail).toContain(
        '¿?',
      );
    });
  });

  describe('CSP', () => {
    it.each([
      ["script-src 'self' 'unsafe-inline'", 'info'],
      ["default-src 'self' 'unsafe-inline'", 'info'],
      ["script-src 'self' 'unsafe-inline' 'nonce-abc'", 'ok'],
      ["script-src 'unsafe-inline' 'strict-dynamic'", 'ok'],
      ["img-src 'self'", 'ok'],
    ])('%s → %s', (value, status) => {
      expect(run({ 'content-security-policy': value })['headers.csp']).toMatchObject({ status });
    });
    it('solo en modo informe', () => {
      expect(
        run({ 'content-security-policy-report-only': "default-src 'self'" })['headers.csp'],
      ).toMatchObject({
        status: 'info',
      });
    });
  });

  it.each([
    [{ 'x-frame-options': 'DENY' }, 'ok'],
    [{ 'x-frame-options': 'sameorigin' }, 'ok'],
    [{ 'x-frame-options': 'ALLOW-FROM https://x.com' }, 'warning'],
    [{ 'content-security-policy': "frame-ancestors 'none'" }, 'ok'],
  ])('protección de marcos %j → %s', (headers, status) => {
    expect(run(headers)['headers.framing']).toMatchObject({ status });
  });

  it('x-content-type-options con otro valor', () => {
    expect(run({ 'x-content-type-options': 'sniff' })['headers.xcto']).toMatchObject({
      status: 'warning',
    });
  });

  it.each([
    ['unsafe-url', 'warning'],
    ['no-referrer, no-referrer-when-downgrade', 'warning'],
    ['no-referrer-when-downgrade, strict-origin', 'ok'],
    ['same-origin', 'ok'],
  ])('referrer-policy %s → %s', (value, status) => {
    expect(run({ 'referrer-policy': value })['headers.referrer']).toMatchObject({ status });
  });

  it('detecta versiones expuestas', () => {
    const f = run({ server: 'Apache/2.4.41 (Ubuntu)', 'x-powered-by': 'PHP/7.4.3' })[
      'headers.disclosure'
    ]!;
    expect(f.status).toBe('warning');
    expect(f.detail).toContain('Apache/2.4.41');
    expect(f.detail).toContain('PHP/7.4.3');
    expect(f.evidence).toEqual({ server: 'Apache/2.4.41 (Ubuntu)', 'x-powered-by': 'PHP/7.4.3' });
  });

  it('un Server sin versión no es un problema', () => {
    expect(run({ server: 'cloudflare' })['headers.disclosure']).toMatchObject({ status: 'ok' });
  });
});
