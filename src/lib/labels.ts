import { LOCALE_TAGS, type Locale } from './i18n';
import type { Grade } from './scoring';
import type { Category } from './types';

/** Nombre de cada categoría del informe. */
export const CATEGORY_NAMES: Record<Locale, Record<Category, string>> = {
  es: {
    ssl: 'Certificado SSL',
    headers: 'Cabeceras de seguridad',
    email: 'Correo y suplantación',
    privacy: 'Cookies y RGPD',
  },
  ca: {
    ssl: 'Certificat SSL',
    headers: 'Capçaleres de seguretat',
    email: 'Correu i suplantació',
    privacy: 'Galetes i RGPD',
  },
  en: {
    ssl: 'SSL certificate',
    headers: 'Security headers',
    email: 'Email and spoofing',
    privacy: 'Cookies and GDPR',
  },
};

/** Qué significa cada nota. */
export const GRADE_NAMES: Record<Locale, Record<Grade, string>> = {
  es: { A: 'Muy bien', B: 'Bien', C: 'Mejorable', D: 'Deficiente', E: 'Mal', F: 'Muy mal' },
  ca: { A: 'Molt bé', B: 'Bé', C: 'Millorable', D: 'Deficient', E: 'Malament', F: 'Molt malament' },
  en: { A: 'Very good', B: 'Good', C: 'Could be better', D: 'Poor', E: 'Bad', F: 'Very bad' },
};

/** Fecha y hora de un informe en el idioma del usuario (hora de Madrid). */
export function formatDateTime(iso: string, locale: Locale = 'es'): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(iso));
}
