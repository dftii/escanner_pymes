import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { DEFAULT_SITE_URL, jsonLd, siteUrl } from '@/lib/site';

describe('siteUrl', () => {
  it('prioriza NEXT_PUBLIC_SITE_URL, luego Vercel, luego la de serie', () => {
    expect(
      siteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://seguro.es/',
        VERCEL_PROJECT_PRODUCTION_URL: 'x.vercel.app',
      }),
    ).toBe('https://seguro.es');
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'mi-app.vercel.app' })).toBe(
      'https://mi-app.vercel.app',
    );
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'https://mi-app.vercel.app/' })).toBe(
      'https://mi-app.vercel.app',
    );
    expect(siteUrl({})).toBe(DEFAULT_SITE_URL);
  });
});

describe('robots y sitemap', () => {
  it('robots bloquea la API y apunta al sitemap', () => {
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: '*', allow: '/', disallow: '/api/' }]);
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it('sitemap con las páginas públicas en los tres idiomas y sus alternativas', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toHaveLength(15);
    expect(urls.every((u) => u.startsWith('https://'))).toBe(true);
    expect(urls).toContain(`${siteUrl()}/glosario`);
    expect(urls).toContain(`${siteUrl()}/ca/glosario`);
    expect(urls).toContain(`${siteUrl()}/en`);
    expect(entries[0]!.alternates?.languages).toEqual({
      'es-ES': siteUrl(),
      'ca-ES': `${siteUrl()}/ca`,
      en: `${siteUrl()}/en`,
    });
  });
});

describe('jsonLd', () => {
  it('no deja cerrar la etiqueta <script>', () => {
    expect(jsonLd({ a: '</script><script>alert(1)</script>' })).not.toContain('<');
    expect(JSON.parse(jsonLd({ a: '<b>' }))).toEqual({ a: '<b>' });
  });
});
