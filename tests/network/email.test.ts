/**
 * Tests de correo con DNS real. Necesitan Internet: `npm run test:network`.
 * Solo se comprueba lo que es estable en estos dominios.
 */
import { describe, expect, it } from 'vitest';
import { checkEmailDns } from '@/lib/checks/emailDns';
import { runScan } from '@/lib/scan';
import type { Finding } from '@/lib/types';

const byId = (findings: Finding[]) => Object.fromEntries(findings.map((f) => [f.id, f]));

describe('checkEmailDns con DNS real', () => {
  it('google.com: MX de Google, SPF válido y DMARC en reject', async () => {
    const f = byId(await checkEmailDns('google.com'));
    expect(f['email.mx']).toMatchObject({
      status: 'ok',
      title: 'Recibes el correo en Google Workspace',
    });
    expect(['ok', 'info']).toContain(f['email.spf']?.status);
    expect(f['email.dmarc']).toMatchObject({ status: 'ok' });
    expect(f['email.dmarc']!.title).toContain('reject');
  });

  it('github.com: SPF dentro del límite de consultas y DMARC que bloquea', async () => {
    const f = byId(await checkEmailDns('www.github.com'));
    expect(f['email.spf']?.status).not.toBe('error');
    expect((f['email.spf']?.evidence as { lookups: number }).lookups).toBeGreaterThan(0);
    // github.com usa "quarantine"; aceptamos cualquier política que bloquee.
    expect(f['email.dmarc']).toMatchObject({ status: 'ok' });
  });

  it('un dominio inexistente no rompe nada', async () => {
    const f = byId(await checkEmailDns('no-existe-zzqx-123456.es'));
    expect(f['email.mx']).toMatchObject({ status: 'info' });
    expect(f['email.spf']).toMatchObject({ status: 'fail' });
    expect(f['email.dmarc']).toMatchObject({ status: 'fail' });
  });
});

describe('runScan con correo', () => {
  it('badssl.com: informe con la categoría de correo en menos de 20 s', async () => {
    const result = await runScan('badssl.com');
    expect(result.durationMs).toBeLessThan(20_000);
    expect([...new Set(result.findings.map((f) => f.category))]).toEqual(
      expect.arrayContaining(['ssl', 'headers', 'email']),
    );
    expect(result.findings.find((f) => f.id === 'email.exposed')?.status).not.toBe('error');
  });
});
