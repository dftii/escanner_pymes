import { describe, expect, it } from 'vitest';
import { checkHeaders } from '@/lib/checks/headers';
import { API_CSP, buildCsp, createNonce } from '@/lib/csp';

describe('CSP de la propia web', () => {
  it('en producción usa nonce y strict-dynamic, sin unsafe-inline ni unsafe-eval en scripts', () => {
    const csp = buildCsp('abc123');
    const scriptSrc = /script-src ([^;]*)/.exec(csp)![1]!;
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain('unsafe');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('en desarrollo permite eval y websockets (recarga en caliente)', () => {
    const csp = buildCsp('x', true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('nonce aleatorio en base64 de 16 bytes', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });

  it('la API no permite cargar nada', () => {
    expect(API_CSP).toBe("default-src 'none'; frame-ancestors 'none'");
  });

  it('la propia web aprueba su check de cabeceras', () => {
    const headers = new Headers({
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'content-security-policy': buildCsp(createNonce()),
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=()',
      server: 'Vercel',
    });
    for (const f of checkHeaders({ url: 'https://escaner.example/', headers })) {
      expect(f.status, f.id).toBe('ok');
    }
  });
});

describe('next.config', () => {
  it('aplica a la API la misma CSP que src/lib/csp.ts', async () => {
    const config = (await import('../next.config')).default;
    const rules = await config.headers!();
    const api = rules.find((r) => r.source === '/api/:path*');
    expect(api?.headers).toEqual([{ key: 'Content-Security-Policy', value: API_CSP }]);
    expect(config.poweredByHeader).toBe(false);
  });
});
