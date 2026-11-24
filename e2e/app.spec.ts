import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { alert, finding, mockScan, report, SAMPLE, scan } from './helpers';

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    // Las respuestas 4xx simuladas a propósito las registra el navegador; no son fallos.
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
      errors.push(m.text());
    }
  });
  page.on('pageerror', (e) => errors.push(e.message));
  // Al acabar cada test: ni un error en la consola (incluidas violaciones de la CSP).
  (page as unknown as { __errors: string[] }).__errors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as unknown as { __errors: string[] }).__errors).toEqual([]);
});

test('portada: titular, cinta con pausa, tarjetas y sin scroll horizontal @movil', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('bien protegida');
  await expect(page.getByRole('region', { name: 'Comprobaciones incluidas' })).toBeVisible();
  const pause = page.getByRole('button', { name: 'Pausar la animación' });
  await pause.click();
  await expect(page.getByRole('button', { name: 'Reanudar la animación' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Qué revisamos' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('análisis completo: progreso, nota, hallazgos y registro DNS recomendado', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const calls = await mockScan(page, () => report('minegocio.es', SAMPLE));
  await page.goto('/');
  await scan(page, 'minegocio.es');

  expect(calls).toEqual([{ domain: 'minegocio.es', consent: true }]);
  await expect(page.locator('#informe-titulo')).toHaveText('minegocio.es');
  await expect(page.getByText(/Nota global: /)).toBeVisible();
  await expect(page.getByText('Falta la política DMARC')).toBeVisible();

  // El registro recomendado se copia tal cual.
  const box = page.locator('text=Registro recomendado').locator('..');
  await box.getByRole('button', { name: 'Copiar el valor del registro' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'v=DMARC1; p=none; rua=mailto:dmarc@minegocio.es',
  );

  // "Enviar por email" abre el correo del usuario con el resumen y el registro.
  const href = await page.getByRole('link', { name: 'Enviar por email' }).getAttribute('href');
  expect(href).toMatch(/^mailto:\?subject=Informe%20de%20seguridad%20de%20minegocio\.es/);
  expect(decodeURIComponent(href!)).toContain('TXT _dmarc: v=DMARC1; p=none');
});

test('errores de la API se muestran como alerta', async ({ page }) => {
  await mockScan(page, () => ({ status: 429, message: 'Has hecho demasiados análisis.' }));
  await page.goto('/');
  const form = page.locator('form').first();
  await form.getByLabel('Dominio de tu web').fill('minegocio.es');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Analizar' }).click();
  await expect(alert(page)).toHaveText('Has hecho demasiados análisis.');
});

test('historial: guardar, recargar, evolución y borrar', async ({ page }) => {
  await mockScan(page, (domain, call) =>
    report(
      domain,
      call === 1
        ? SAMPLE
        : SAMPLE.map((f) => ({ ...f, status: 'ok' as const, records: undefined })),
      20 + call,
    ),
  );
  await page.goto('/');
  await scan(page, 'minegocio.es');
  await page.getByRole('button', { name: 'Guardar en este navegador' }).click();
  await expect(page.getByRole('button', { name: 'Guardado ✓' })).toBeDisabled();

  await page.reload();
  const history = page.getByRole('region', { name: 'Informes guardados en este navegador' });
  await expect(history.getByRole('listitem')).toHaveCount(1);

  await scan(page, 'minegocio.es');
  await expect(page.getByRole('heading', { name: 'Evolución' })).toBeVisible();

  await history.getByRole('button', { name: 'Borrar todo el historial' }).click();
  await expect(history).toHaveCount(0);
});

test('compararse con otra web', async ({ page }) => {
  await mockScan(page, (domain) =>
    report(
      domain,
      domain === 'competidor.es' ? SAMPLE.map((f) => ({ ...f, status: 'fail' as const })) : SAMPLE,
    ),
  );
  await page.goto('/');
  await scan(page, 'minegocio.es');
  const section = page.getByRole('region', { name: 'Compárate con otra web' });
  await section.getByRole('textbox').fill('competidor.es');
  await section.getByRole('checkbox').check();
  await section.getByRole('button', { name: 'Comparar' }).click();
  const table = section.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(6);
  await expect(table.getByText('Mejor').first()).toBeVisible();
});

test('compartir: el enlace abre el mismo informe y uno dañado da error', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockScan(page, () => report('minegocio.es', SAMPLE));
  await page.goto('/');
  await scan(page, 'minegocio.es');
  await page.getByRole('button', { name: 'Copiar enlace' }).click();
  await expect(page.getByText('Enlace copiado ✓')).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/#r=[\w-]+$/);

  const other = await context.newPage();
  let apiCalls = 0;
  await other.route('**/api/scan', (r) => {
    apiCalls++;
    return r.abort();
  });
  await other.goto(url);
  await expect(other.getByText('informe compartido')).toBeVisible();
  await expect(other.locator('#informe-titulo')).toHaveText('minegocio.es');
  expect(apiCalls).toBe(0);

  // Otra pestaña: cambiar solo el # en la misma no recarga la página.
  const broken = await context.newPage();
  await broken.goto(url.slice(0, -20) + 'roto');
  await expect(alert(broken)).toContainText('incompleto o dañado');
});

test('glosario: explicación al pasar el ratón y con el teclado', async ({ page }) => {
  await mockScan(page, () => report('minegocio.es', SAMPLE));
  await page.goto('/');
  await scan(page, 'minegocio.es');
  const term = page.locator('details').getByRole('button', { name: 'HSTS' });
  await term.hover();
  await expect(page.getByRole('tooltip', { name: /HSTS/ })).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip', { name: /HSTS/ })).toBeHidden();
  await term.focus();
  await expect(page.getByRole('tooltip', { name: /HSTS/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip', { name: /HSTS/ })).toBeHidden();

  await page.goto('/glosario');
  await expect(page.getByRole('heading', { name: 'Glosario' })).toBeVisible();
  await expect(page.locator('dt', { hasText: 'DMARC' })).toBeVisible();
});

test('glosario en el móvil: se abre al tocar @movil', async ({ page }) => {
  test.skip(!test.info().project.name.includes('movil'), 'solo en el móvil');
  await page.goto('/');
  const term = page.locator('button.cursor-help').first();
  await term.scrollIntoViewIfNeeded();
  await term.tap();
  await expect(page.getByRole('tooltip').first()).toBeVisible();
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('sin animaciones y sin botón de pausa', async ({ page }) => {
    await page.goto('/');
    const animation = await page
      .locator('.marquee-track')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
    await expect(page.getByRole('button', { name: 'Pausar la animación' })).toBeHidden();
  });
});

test.describe('accesibilidad (axe)', () => {
  // Se mide el diseño final: con animaciones, axe pillaría textos a mitad de su aparición.
  test.use({ reducedMotion: 'reduce' });
  for (const path of ['/', '/glosario', '/privacidad', '/aviso-legal', '/cookies']) {
    test(`sin fallos WCAG A/AA en ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test('sin fallos WCAG A/AA en un informe', async ({ page }) => {
    await mockScan(page, () =>
      report('minegocio.es', [...SAMPLE, finding('headers.csp', 'headers', 'error')]),
    );
    await page.goto('/');
    await scan(page, 'minegocio.es');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
