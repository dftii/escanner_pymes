/**
 * Idiomas de la web. El español es el de referencia: los catálogos de catalán
 * e inglés tienen que tener exactamente las mismas claves (lo comprueba
 * TypeScript con `messages()`), así que no puede faltar ninguna traducción.
 */
export const LOCALES = ['es', 'ca', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

/** Etiqueta BCP 47 para `<html lang>` y formatos de fecha. */
export const LOCALE_TAGS: Record<Locale, string> = { es: 'es-ES', ca: 'ca-ES', en: 'en-GB' };

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = string | ((...args: any[]) => string) | readonly string[];

/**
 * Catálogo de textos en los tres idiomas. Las claves y los parámetros salen
 * del español; catalán e inglés deben coincidir.
 */
export function messages<T extends Record<string, Message>>(catalog: {
  es: T;
  ca: NoInfer<T>;
  en: NoInfer<T>;
}): Record<Locale, T> {
  return catalog;
}

/** Ruta de una página en un idioma: el español va sin prefijo. */
export function localePath(locale: Locale, path = '/'): string {
  const clean = path === '/' ? '' : path;
  return locale === DEFAULT_LOCALE ? clean || '/' : `/${locale}${clean}`;
}

/** Separa el idioma de una ruta: `/ca/glosario` → `{ locale: 'ca', path: '/glosario' }`. */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: `/${rest.join('/')}`.replace(/\/$/, '') || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || '/' };
}

/** Une una lista: "a, b y c" / "a, b i c" / "a, b and c". */
export function joinList(items: readonly string[], locale: Locale): string {
  if (items.length <= 1) return items.join('');
  const and = { es: 'y', ca: 'i', en: 'and' }[locale];
  return `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`;
}
