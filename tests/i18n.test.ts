import { describe, expect, it } from 'vitest';
import { MSG as BREACHES } from '@/lib/checks/breaches';
import { MSG as BROWSER } from '@/lib/checks/browserCookies';
import { MSG as CMS } from '@/lib/checks/cms';
import { EMAIL_MSG } from '@/lib/checks/emailDns.messages';
import { MSG as EXPOSURE } from '@/lib/checks/emailExposure';
import { MSG as HEADERS } from '@/lib/checks/headers';
import { MSG as MIXED } from '@/lib/checks/mixedContent';
import { localizeLabel, PRIVACY_MSG } from '@/lib/checks/privacy.messages';
import { SSL_MSG } from '@/lib/checks/ssl.messages';
import { fixFor, REMEDIATION, type RemediationId } from '@/lib/data/remediation';
import { MSG as DNS_RECORDS } from '@/lib/dnsRecords';
import { ERROR_MSG } from '@/lib/findings';
import { isLocale, joinList, localePath, LOCALES, splitLocalePath, type Locale } from '@/lib/i18n';
import { MSG as ERRORS } from '@/lib/net/errorMessages';

const CATALOGS = {
  BREACHES,
  BROWSER,
  CMS,
  EMAIL_MSG,
  EXPOSURE,
  HEADERS,
  MIXED,
  PRIVACY_MSG,
  SSL_MSG,
  DNS_RECORDS,
  ERROR_MSG,
  ERRORS,
} as Record<string, Record<Locale, Record<string, unknown>>>;

/** Llama a cada mensaje (con argumentos de prueba) y devuelve su texto. */
const render = (value: unknown): string => {
  if (typeof value === 'function') {
    const fn = value as (...a: unknown[]) => unknown;
    return String(fn(...Array.from({ length: Math.max(fn.length, 3) }, () => 2)));
  }
  return Array.isArray(value) ? value.join(' ') : String(value);
};

/** Textos que se escriben igual en otro idioma (revisados a mano). */
const SAME_AS_SPANISH = new Set([
  'EMAIL_MSG.ca.dmarcMissingTitle',
  'HEADERS.ca.xctoBadTitle',
  'PRIVACY_MSG.en.cookiesList',
]);

describe('catálogos de textos', () => {
  it('nada sin traducir salvo los textos que se escriben igual', () => {
    const same: string[] = [];
    for (const [name, catalog] of Object.entries(CATALOGS)) {
      for (const locale of ['ca', 'en'] as const) {
        for (const key of Object.keys(catalog.es)) {
          const es = render(catalog.es[key]);
          if (es && render(catalog[locale][key]) === es) same.push(`${name}.${locale}.${key}`);
        }
      }
    }
    expect(same.sort()).toEqual([...SAME_AS_SPANISH].sort());
  });

  for (const [name, catalog] of Object.entries(CATALOGS)) {
    it(`${name}: mismas claves en los tres idiomas y ningún texto vacío`, () => {
      const keys = Object.keys(catalog.es).sort();
      for (const locale of LOCALES) {
        expect(Object.keys(catalog[locale]).sort(), locale).toEqual(keys);
        for (const key of keys) {
          const text = render(catalog[locale][key]);
          // Los mensajes de error en español vienen de cada ScanError: su catálogo va vacío.
          if (locale !== 'es' || name !== 'ERRORS') {
            expect(text.trim().length, `${name}.${locale}.${key}`).toBeGreaterThan(0);
          }
        }
      }
    });
  }

  it('pasos para arreglar en los tres idiomas, con el mismo número de pasos', () => {
    for (const id of Object.keys(REMEDIATION) as RemediationId[]) {
      const es = fixFor(id, 'es');
      for (const locale of ['ca', 'en'] as const) {
        const other = fixFor(id, locale);
        expect(other, `${id} ${locale}`).toHaveLength(es.length);
        expect(other, `${id} ${locale}`).not.toEqual(es);
      }
    }
  });

  it('etiquetas de cookies', () => {
    expect(localizeLabel('Sesión del servidor', 'en')).toBe('Server session');
    expect(localizeLabel('Sesión del servidor', 'es')).toBe('Sesión del servidor');
    expect(localizeLabel('Google Analytics', 'ca')).toBe('Google Analytics');
  });
});

describe('utilidades de idioma', () => {
  it('isLocale', () => {
    expect(isLocale('ca')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('localePath y splitLocalePath', () => {
    expect(localePath('es', '/')).toBe('/');
    expect(localePath('es', '/glosario')).toBe('/glosario');
    expect(localePath('ca', '/')).toBe('/ca');
    expect(localePath('en', '/glosario')).toBe('/en/glosario');
    expect(splitLocalePath('/ca/glosario')).toEqual({ locale: 'ca', path: '/glosario' });
    expect(splitLocalePath('/en')).toEqual({ locale: 'en', path: '/' });
    expect(splitLocalePath('/es/glosario')).toEqual({ locale: 'es', path: '/es/glosario' });
    expect(splitLocalePath('/glosario')).toEqual({ locale: 'es', path: '/glosario' });
  });

  it('joinList', () => {
    expect(joinList(['a'], 'es')).toBe('a');
    expect(joinList(['a', 'b', 'c'], 'es')).toBe('a, b y c');
    expect(joinList(['a', 'b'], 'ca')).toBe('a i b');
    expect(joinList(['a', 'b'], 'en')).toBe('a and b');
  });
});

describe('textos de la interfaz', () => {
  it('UI: mismas claves, sin vacíos, y plurales correctos', async () => {
    const { UI } = await import('@/lib/ui');
    const keys = Object.keys(UI.es).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(UI[locale]).sort()).toEqual(keys);
      for (const key of keys) expect(render(UI[locale][key as keyof typeof UI.es])).not.toBe('');
      expect(UI[locale].marqueeItems).toHaveLength(UI.es.marqueeItems.length);
    }
    expect(UI.es.counts(1, 1, 1)).toBe('1 fallo · 1 aviso · 1 correcto');
    expect(UI.ca.counts(2, 1, 0)).toBe('2 errors · 1 avís · 0 correctes');
    expect(UI.en.counts(0, 2, 1)).toBe('0 failed · 2 warnings · 1 passed');
    expect(UI.en.thingsToFix(1)).toBe('1 thing to fix');
  });
});
