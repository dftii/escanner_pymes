/**
 * Tests contra webs reales. Necesitan Internet: `npm run test:network`.
 * badssl.com mantiene subdominios con cada tipo de error de certificado.
 */
import { describe, expect, it } from 'vitest';
import { checkSsl } from '@/lib/checks/ssl';
import { runScan } from '@/lib/scan';
import type { Finding } from '@/lib/types';

const byId = (findings: Finding[]) => Object.fromEntries(findings.map((f) => [f.id, f]));

describe('checkSsl con webs reales', () => {
  it('google.com: certificado válido, TLS moderno y www cubierto', async () => {
    const f = byId(await checkSsl('google.com'));
    expect(f['ssl.trust']?.status).toBe('ok');
    expect(f['ssl.expiry']?.status).not.toBe('fail');
    expect(f['ssl.hostname']?.status).toBe('ok');
    expect(f['ssl.www']?.status).toBe('ok');
    expect(f['ssl.protocol']?.status).toBe('ok');
    // Google sirve http://www.google.com sin cifrar (se apoya en la lista HSTS
    // precargada de los navegadores), así que aquí solo exigimos una respuesta clara.
    expect(f['ssl.redirect']?.status).not.toBe('error');
  });

  it('github.com: http redirige a https', async () => {
    const f = byId(await checkSsl('github.com'));
    expect(f['ssl.redirect']).toMatchObject({ status: 'ok' });
  });

  it('expired.badssl.com: caducado', async () => {
    const f = byId(await checkSsl('expired.badssl.com'));
    expect(f['ssl.expiry']).toMatchObject({
      status: 'fail',
      title: 'El certificado está caducado',
    });
  });

  it('wrong.host.badssl.com: certificado de otro dominio', async () => {
    const f = byId(await checkSsl('wrong.host.badssl.com'));
    expect(f['ssl.hostname']).toMatchObject({ status: 'fail' });
  });

  it('self-signed.badssl.com: autofirmado', async () => {
    const f = byId(await checkSsl('self-signed.badssl.com'));
    expect(f['ssl.untrusted']).toMatchObject({ status: 'fail' });
    expect(f['ssl.untrusted']!.title).toContain('autofirmado');
  });

  it('incomplete-chain.badssl.com: falta la cadena', async () => {
    const f = byId(await checkSsl('incomplete-chain.badssl.com'));
    expect(f['ssl.chain']).toMatchObject({ status: 'fail' });
  });

  it('untrusted-root.badssl.com: raíz no reconocida', async () => {
    const f = byId(await checkSsl('untrusted-root.badssl.com'));
    expect(f['ssl.untrusted'] ?? f['ssl.chain']).toMatchObject({ status: 'fail' });
  });
});

describe('runScan completo', () => {
  it('expired.badssl.com: revisa las cabeceras aunque el certificado esté caducado', async () => {
    const result = await runScan('expired.badssl.com');
    expect(result.finalUrl).toBe('https://expired.badssl.com/');
    expect(result.findings.find((f) => f.id === 'headers.fetch')).toBeUndefined();
    expect(result.findings.find((f) => f.id === 'headers.xcto')).toBeDefined();
    expect(result.findings.find((f) => f.id === 'ssl.expiry')).toMatchObject({ status: 'fail' });
  });

  it('badssl.com genera un informe con SSL y cabeceras en menos de 20 s', async () => {
    const result = await runScan('badssl.com');
    expect(result.durationMs).toBeLessThan(20_000);
    expect(result.finalUrl).toMatch(/^https:\/\/badssl\.com\//);
    const categories = new Set(result.findings.map((f) => f.category));
    expect(categories).toEqual(new Set(['ssl', 'headers']));
  });
});
