import { describe, expect, it } from 'vitest';
import { mixedContentFinding, scanMixedContent } from '@/lib/checks/mixedContent';

const page = (
  body: string,
  url = 'https://minegocio.es/',
  headers: Record<string, string> = {},
) => ({
  url,
  body,
  headers: new Headers(headers),
});

describe('scanMixedContent', () => {
  it('separa recursos activos y pasivos y descarta https y rutas relativas', () => {
    const scan = scanMixedContent([
      page(`
        <script src="http://cdn.ejemplo.com/app.js"></script>
        <script src="https://cdn.ejemplo.com/ok.js"></script>
        <script src="//cdn.ejemplo.com/relativo.js"></script>
        <link rel="preload stylesheet" href="http://cdn.ejemplo.com/estilo.css">
        <link rel="icon" href="http://cdn.ejemplo.com/favicon.ico">
        <iframe src=" http://mapas.ejemplo.com/"></iframe>
        <img src="http://fotos.ejemplo.com/a.jpg">
        <img src="/b.jpg" srcset="http://fotos.ejemplo.com/c.jpg 2x, https://fotos.ejemplo.com/d.jpg 3x">
        <video poster="http://fotos.ejemplo.com/p.jpg"><source src="http://v.ejemplo.com/v.mp4"></video>
      `),
    ]);
    expect(scan.active.sort()).toEqual([
      'http://cdn.ejemplo.com/app.js',
      'http://cdn.ejemplo.com/estilo.css',
      'http://mapas.ejemplo.com/',
    ]);
    expect(scan.passive.sort()).toEqual([
      'http://fotos.ejemplo.com/a.jpg',
      'http://fotos.ejemplo.com/c.jpg',
      'http://fotos.ejemplo.com/p.jpg',
      'http://v.ejemplo.com/v.mp4',
    ]);
    expect(scan.pages).toBe(1);
  });

  it('ignora páginas http y las que piden upgrade-insecure-requests', () => {
    const bad = '<script src="http://x.es/a.js"></script>';
    expect(scanMixedContent([page(bad, 'http://minegocio.es/')]).pages).toBe(0);
    const viaHeader = scanMixedContent([
      page(bad, undefined, {
        'content-security-policy': "default-src 'self'; upgrade-insecure-requests",
      }),
    ]);
    expect(viaHeader).toMatchObject({ active: [], upgraded: true });
    const viaMeta = scanMixedContent([
      page(`<meta http-equiv="content-security-policy" content="upgrade-insecure-requests">${bad}`),
    ]);
    expect(viaMeta.upgraded).toBe(true);
  });
});

describe('mixedContentFinding', () => {
  it('null si no hay páginas https', () => {
    expect(mixedContentFinding([page('', 'http://minegocio.es/')])).toBeNull();
  });

  it('fallo con recursos activos, resumiendo la lista', () => {
    const scripts = [1, 2, 3, 4, 5]
      .map((i) => `<script src="http://x.es/${i}.js"></script>`)
      .join('');
    const f = mixedContentFinding([page(scripts)])!;
    expect(f).toMatchObject({ id: 'ssl.mixed_content', category: 'ssl', status: 'fail' });
    expect(f.detail).toContain('y 2 más');
    expect(f.fix.length).toBeGreaterThan(0);
  });

  it('aviso con solo imágenes', () => {
    const f = mixedContentFinding([page('<img src="http://x.es/a.jpg">')])!;
    expect(f.status).toBe('warning');
    expect(f.detail).toContain('http://x.es/a.jpg');
  });

  it('ok sin nada inseguro (o con upgrade-insecure-requests)', () => {
    expect(
      mixedContentFinding([page('<img src="/a.jpg">'), page('', 'https://minegocio.es/b')]),
    ).toMatchObject({
      status: 'ok',
      detail: expect.stringContaining('2 páginas'),
    });
    const up = mixedContentFinding([
      page('<img src="http://x.es/a.jpg">', undefined, {
        'content-security-policy': 'upgrade-insecure-requests',
      }),
    ])!;
    expect(up.status).toBe('ok');
    expect(up.detail).toContain('upgrade-insecure-requests');
  });
});
