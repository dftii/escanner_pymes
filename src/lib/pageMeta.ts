import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, localePath, type Locale } from './i18n';
import { SITE_NAME } from './site';

/** Idioma de la ruta (`[lang]`). El middleware solo deja pasar idiomas válidos. */
export async function localeFrom(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

export const SITE_TAGLINE: Record<Locale, string> = {
  es: 'Revisa la seguridad de tu web',
  ca: 'Revisa la seguretat del teu web',
  en: 'Check your website’s security',
};

export const SITE_DESCRIPTIONS: Record<Locale, string> = {
  es: 'Informe gratuito y automático sobre el certificado SSL, las cabeceras de seguridad, la protección del correo y las cookies de la web de tu negocio.',
  ca: 'Informe gratuït i automàtic sobre el certificat SSL, les capçaleres de seguretat, la protecció del correu i les galetes del web del teu negoci.',
  en: 'A free, automatic report on the SSL certificate, security headers, email protection and cookies of your business website.',
};

const OG_LOCALE: Record<Locale, string> = { es: 'es_ES', ca: 'ca_ES', en: 'en_GB' };
const HREFLANG: Record<Locale, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en' };

/** Metadatos de una página: canónica, versiones en otros idiomas y Open Graph. */
export function pageMetadata(
  locale: Locale,
  path: string,
  extra: { title?: string; description?: string } = {},
): Metadata {
  const description = extra.description ?? SITE_DESCRIPTIONS[locale];
  const languages = Object.fromEntries([
    ...LOCALES.map((l) => [HREFLANG[l], localePath(l, path)]),
    ['x-default', localePath('es', path)],
  ]);
  return {
    ...(extra.title ? { title: extra.title } : {}),
    description,
    alternates: { canonical: localePath(locale, path), languages },
    openGraph: {
      type: 'website',
      locale: OG_LOCALE[locale],
      siteName: SITE_NAME,
      title: extra.title
        ? `${extra.title} · ${SITE_NAME}`
        : `${SITE_NAME} · ${SITE_TAGLINE[locale]}`,
      description,
      url: localePath(locale, path),
      // Al definir openGraph aquí se pierde la imagen por defecto: se vuelve a poner.
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', images: ['/opengraph-image'] },
  };
}
