/** Nombre y URL pública de la web, para SEO (canónicas, sitemap, Open Graph). */
export const SITE_NAME = 'Escáner Pymes';

export const SITE_DESCRIPTION =
  'Informe gratuito y automático sobre el certificado SSL, las cabeceras de seguridad, la protección del correo y las cookies de la web de tu negocio.';

/** URL de producción por defecto (Vercel). */
export const DEFAULT_SITE_URL = 'https://escanner-pymes.vercel.app';

type Env = Record<string, string | undefined>;

/**
 * URL pública: `NEXT_PUBLIC_SITE_URL` si se define (p. ej. con un dominio
 * propio), si no la de producción que expone Vercel, y si no la por defecto.
 */
export function siteUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return DEFAULT_SITE_URL;
}

/** Páginas públicas para el sitemap. */
export const PUBLIC_PAGES = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/glosario', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacidad', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/aviso-legal', priority: 0.2, changeFrequency: 'yearly' },
] as const;

/** JSON-LD seguro para meter en un <script>: sin "<" que pueda cerrar la etiqueta. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
