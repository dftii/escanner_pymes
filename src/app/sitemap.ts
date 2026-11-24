import type { MetadataRoute } from 'next';
import { LOCALES, localePath } from '@/lib/i18n';
import { PUBLIC_PAGES, siteUrl } from '@/lib/site';

const HREFLANG = { es: 'es-ES', ca: 'ca-ES', en: 'en' } as const;

/** Cada página en los tres idiomas, con sus versiones alternativas (hreflang). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const abs = (path: string) => `${base}${path === '/' ? '' : path}`;
  return PUBLIC_PAGES.flatMap(({ path, priority, changeFrequency }) =>
    LOCALES.map((locale) => ({
      url: abs(localePath(locale, path)),
      priority,
      changeFrequency,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [HREFLANG[l], abs(localePath(l, path))])),
      },
    })),
  );
}
