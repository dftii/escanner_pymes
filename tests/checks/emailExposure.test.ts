import { describe, expect, it } from 'vitest';
import { checkEmailExposure } from '@/lib/checks/emailExposure';
import { ScanError } from '@/lib/net/errors';
import type { SafeResponse, safeFetch } from '@/lib/net/safeFetch';

const page = (url: string, body: string): SafeResponse => ({
  url,
  status: 200,
  headers: new Headers(),
  setCookies: [],
  redirects: [],
  body,
  truncated: false,
});

const fetchFrom = (pages: Record<string, string | Error>) => {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const body = pages[url];
    if (body === undefined || body instanceof Error) throw body ?? new ScanError('network', 'x');
    return page(url, body);
  }) as unknown as typeof safeFetch;
  return { impl, calls };
};

const HOME = 'https://minegocio.es/';

describe('checkEmailExposure', () => {
  it('sin emails visibles: info con recordatorio de la LSSI', async () => {
    const f = await checkEmailExposure(page(HOME, '<p>Hola</p>'), { fetch: fetchFrom({}).impl });
    expect(f).toMatchObject({ id: 'email.exposed', category: 'email', status: 'info' });
    expect(f.detail).toContain('LSSI');
    expect(f.detail).toContain('1 página');
  });

  it('emails protegidos por Cloudflare: ok', async () => {
    const f = await checkEmailExposure(page(HOME, '<span data-cfemail="x"></span>'), {
      fetch: fetchFrom({}).impl,
    });
    expect(f).toMatchObject({ status: 'ok' });
  });

  it('solo buzones genéricos del dominio: info', async () => {
    const f = await checkEmailExposure(
      page(HOME, '<p>info@minegocio.es · atencion.al.cliente@minegocio.es</p>'),
      {
        fetch: fetchFrom({}).impl,
      },
    );
    expect(f).toMatchObject({
      status: 'info',
      title: 'Hay 2 direcciones de email visibles para robots',
    });
    expect(f.fix.length).toBeGreaterThan(0);
  });

  it('revisa las páginas de contacto y avisa de direcciones personales y gratuitas', async () => {
    const { impl, calls } = fetchFrom({
      'https://minegocio.es/contacto': '<a href="mailto:ana.garcia@minegocio.es">Ana</a>',
      'https://minegocio.es/aviso-legal': '<p>Titular: minegocio@gmail.com</p>',
      'https://minegocio.es/privacidad': new ScanError('timeout', 'lento'),
    });
    const home = page(
      HOME,
      '<a href="/contacto">Contacto</a><a href="/aviso-legal">Aviso legal</a><a href="/privacidad">Privacidad</a><p>info@minegocio.es</p>',
    );
    const f = await checkEmailExposure(home, { fetch: impl });
    expect(calls).toHaveLength(3);
    expect(f.status).toBe('warning');
    expect(f.title).toBe('Hay 3 direcciones de email visibles para robots');
    expect(f.detail).toContain('Parecen personales: ana.garcia@minegocio.es, minegocio@gmail.com');
    expect(f.detail).toContain('minegocio@gmail.com es de un proveedor gratuito');
    expect(f.evidence).toMatchObject({
      emails: {
        'info@minegocio.es': ['/'],
        'ana.garcia@minegocio.es': ['/contacto'],
        'minegocio@gmail.com': ['/aviso-legal'],
      },
    });
    expect((f.evidence as { pagesScanned: string[] }).pagesScanned).toHaveLength(3);
  });

  it('un solo email gratuito usa singular', async () => {
    const f = await checkEmailExposure(page(HOME, '<p>info@gmail.com</p>'), {
      fetch: fetchFrom({}).impl,
    });
    expect(f.title).toBe('Hay 1 dirección de email visible para robots');
    expect(f.detail).toContain('info@gmail.com es de un proveedor gratuito');
    expect(f.status).toBe('warning');
  });
});
