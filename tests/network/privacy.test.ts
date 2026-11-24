/**
 * Check de cookies y RGPD contra webs reales. Necesita Internet: `npm run test:network`.
 */
import { describe, expect, it } from 'vitest';
import { runScan } from '@/lib/scan';

describe('runScan con cookies y RGPD', () => {
  it('badssl.com: informe completo de las cuatro categorías sin errores de privacidad', async () => {
    const result = await runScan('badssl.com');
    expect(result.durationMs).toBeLessThan(20_000);
    expect(new Set(result.findings.map((f) => f.category))).toEqual(
      new Set(['ssl', 'headers', 'email', 'privacy']),
    );
    const privacy = result.findings.filter((f) => f.category === 'privacy');
    // Por ids y no por número: así añadir un check no rompe el test.
    expect(privacy.map((f) => f.id).sort()).toEqual(
      [
        'privacy.banner',
        'privacy.breaches',
        'privacy.cookie_policy',
        'privacy.cookies',
        'privacy.forms',
        'privacy.legal_notice',
        'privacy.privacy_policy',
        'privacy.trackers',
      ].sort(),
    );
    expect(privacy.filter((f) => f.status === 'error')).toEqual([]);
    // Have I Been Pwned responde de verdad y badssl.com no tiene filtraciones.
    expect(privacy.find((f) => f.id === 'privacy.breaches')?.status).toBe('ok');
    expect(result.findings.find((f) => f.id === 'ssl.mixed_content')?.status).not.toBe('error');
    // badssl.com no usa cookies ni seguimiento.
    expect(privacy.find((f) => f.id === 'privacy.trackers')?.status).toBe('ok');
  });

  it('github.com: detecta sus páginas legales', async () => {
    const result = await runScan('github.com');
    const privacyPolicy = result.findings.find((f) => f.id === 'privacy.privacy_policy');
    expect(privacyPolicy?.status).toBe('ok');
  });
});
