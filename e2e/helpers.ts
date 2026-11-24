import type { Page } from '@playwright/test';
import type { ReportData } from '@/lib/report';
import type { Finding } from '@/lib/types';

export const finding = (
  id: string,
  category: Finding['category'],
  status: Finding['status'],
  extra: Partial<Finding> = {},
): Finding => ({
  id,
  category,
  status,
  title: `Título de ${id}`,
  detail: 'Detalle del hallazgo.',
  risk: 'Riesgo del hallazgo.',
  fix: ['Primer paso', 'Segundo paso'],
  ...extra,
});

export const report = (domain: string, findings: Finding[], day = 24): ReportData => ({
  domain,
  scannedAt: new Date(Date.UTC(2026, 10, day, 10)).toISOString(),
  findings,
  notices: ['Los resultados sobre cookies y RGPD son orientativos.'],
});

export const SAMPLE = [
  finding('ssl.expiry', 'ssl', 'ok'),
  finding('headers.hsts', 'headers', 'warning', {
    detail: 'Falta HSTS: el navegador podría conectarse sin cifrar.',
  }),
  finding('email.spf', 'email', 'ok'),
  finding('email.dmarc', 'email', 'fail', {
    title: 'Falta la política DMARC',
    detail: 'minegocio.es no indica qué hacer con los correos falsos.',
    risk: 'Los emails falsos (phishing) llegan a tus clientes.',
    records: [
      {
        type: 'TXT',
        host: '_dmarc',
        fqdn: '_dmarc.minegocio.es',
        value: 'v=DMARC1; p=none; rua=mailto:dmarc@minegocio.es',
        label: 'Paso 1: observar',
      },
    ],
  }),
  finding('privacy.cookies', 'privacy', 'ok'),
  finding('privacy.banner', 'privacy', 'info'),
];

/**
 * Simula `/api/scan`: responde en orden con los informes de `byDomain` (o el
 * mismo siempre). Devuelve las peticiones recibidas.
 */
export async function mockScan(
  page: Page,
  byDomain: (domain: string, call: number) => ReportData | { status: number; message: string },
) {
  const calls: Array<{ domain: string; consent: boolean }> = [];
  await page.route('**/api/scan', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      domain: string;
      consent: boolean;
    };
    calls.push(body);
    const result = byDomain(body.domain, calls.length);
    if ('status' in result) {
      await route.fulfill({
        status: result.status,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: result.message } }),
      });
      return;
    }
    const events = [
      ...(['ssl', 'headers', 'email', 'privacy'] as const).map((category) => ({
        type: 'category',
        category,
        findings: [],
      })),
      { type: 'done', result: { ...result, finalUrl: null, durationMs: 1 } },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: events.map((e) => JSON.stringify(e)).join('\n') + '\n',
    });
  });
  return calls;
}

/** Rellena el formulario principal y lanza el análisis. */
export async function scan(page: Page, domain: string) {
  const form = page.locator('form').first();
  await form.getByLabel('Dominio de tu web').fill(domain);
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Analizar' }).click();
  await page.locator('#informe-titulo').waitFor();
}

/** Mensajes de error de la web (sin el aviso de rutas de Next, que también es role="alert"). */
export const alert = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
