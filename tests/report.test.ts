import { describe, expect, it } from 'vitest';
import { compareReports, MAILTO_MAX, mailtoHref, type ReportData } from '@/lib/report';
import type { Finding } from '@/lib/types';

const finding = (
  id: string,
  category: Finding['category'],
  status: Finding['status'],
): Finding => ({
  id,
  category,
  status,
  title: `Título de ${id}`,
  detail: '',
  risk: '',
  fix: [],
});

const report = (domain: string, findings: Finding[]): ReportData => ({
  domain,
  scannedAt: '2026-11-23T12:00:00Z',
  findings,
  notices: [],
});

describe('mailtoHref', () => {
  it('pone asunto y resumen, y el destinatario si lo hay', () => {
    const href = mailtoHref(
      report('minegocio.es', [finding('ssl.expiry', 'ssl', 'fail')]),
      ' a@b.es ',
    );
    expect(
      href.startsWith('mailto:a%40b.es?subject=Informe%20de%20seguridad%20de%20minegocio.es&body='),
    ).toBe(true);
    const body = decodeURIComponent(href.split('&body=')[1]!);
    expect(body).toContain('Nota global');
    expect(body).toContain('✗ Título de ssl.expiry');
    expect(body).not.toContain('recortado');
  });

  it('recorta los resúmenes largos sin pasarse del límite', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      finding(`privacy.x${i}`, 'privacy', 'warning'),
    );
    const href = mailtoHref(report('minegocio.es', many));
    expect(href.length).toBeLessThanOrEqual(MAILTO_MAX);
    expect(decodeURIComponent(href.split('&body=')[1]!)).toContain('Resumen recortado');
  });
});

describe('compareReports', () => {
  it('compara global y categorías y dice quién sale mejor', () => {
    const a = report('a.es', [
      finding('ssl.expiry', 'ssl', 'ok'),
      finding('headers.hsts', 'headers', 'fail'),
    ]);
    const b = report('b.es', [
      finding('ssl.expiry', 'ssl', 'fail'),
      finding('headers.hsts', 'headers', 'fail'),
    ]);
    const rows = Object.fromEntries(compareReports(a, b).map((r) => [r.key, r]));
    expect(Object.keys(rows)).toEqual(['global', 'ssl', 'headers', 'email', 'privacy']);
    expect(rows.ssl!.better).toBe('a');
    expect(rows.headers!.better).toBe('tie');
    expect(rows.email!.better).toBeNull();
    expect(rows.global!.label).toBe('Nota global');
    expect(compareReports(b, a).find((r) => r.key === 'ssl')!.better).toBe('b');
  });
});

describe('summaryText con registros recomendados', () => {
  it('añade el primer registro bajo el problema', async () => {
    const { summaryText } = await import('@/lib/report');
    const text = summaryText(
      report('minegocio.es', [
        {
          ...finding('email.dmarc', 'email', 'fail'),
          records: [
            { type: 'TXT', host: '_dmarc', fqdn: '_dmarc.minegocio.es', value: 'v=DMARC1; p=none' },
            {
              type: 'TXT',
              host: '_dmarc',
              fqdn: '_dmarc.minegocio.es',
              value: 'v=DMARC1; p=reject',
            },
          ],
        },
      ]),
    );
    expect(text).toContain('✗ Título de email.dmarc\n   → TXT _dmarc: v=DMARC1; p=none');
    expect(text).not.toContain('p=reject');
  });
});
