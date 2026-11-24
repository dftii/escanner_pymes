import { describe, expect, it } from 'vitest';
import { GLOSSARY, splitGlossary } from '@/lib/glossary';

const terms = (text: string, seen?: Set<string>) =>
  splitGlossary(text, seen).flatMap((p) =>
    typeof p === 'string' ? [] : [`${p.text}→${p.entry.id}`],
  );

describe('splitGlossary', () => {
  it('marca siglas y palabras, solo la primera vez', () => {
    expect(terms('Falta DMARC. Sin DMARC ni SPF, el phishing es fácil.')).toEqual([
      'DMARC→dmarc',
      'SPF→spf',
      'phishing→phishing',
    ]);
  });

  it('reconstruye el texto original', () => {
    const text = 'Las cookies de Google Analytics necesitan permiso (RGPD y LSSI-CE).';
    expect(
      splitGlossary(text)
        .map((p) => (typeof p === 'string' ? p : p.text))
        .join(''),
    ).toBe(text);
    expect(terms(text)).toEqual(['cookies→cookie', 'RGPD→rgpd', 'LSSI-CE→lssi']);
  });

  it('las siglas no cuentan en minúsculas ni dentro de otras palabras o direcciones', () => {
    expect(terms('csp, mx y spf en minúscula')).toEqual([]);
    expect(terms('TLSv1.3, HSTSX, dmarc@minegocio.es, _dmarc.minegocio.es, /wp-content/')).toEqual(
      [],
    );
    expect(terms('Las Cookies y los PLUGINS')).toEqual(['Cookies→cookie', 'PLUGINS→plugin']);
  });

  it('comparte lo ya explicado entre párrafos', () => {
    const seen = new Set<string>();
    expect(terms('Falta HSTS.', seen)).toEqual(['HSTS→hsts']);
    expect(terms('Activa HSTS y CSP.', seen)).toEqual(['CSP→csp']);
  });

  it('todas las entradas tienen formas y definición', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length);
    for (const e of GLOSSARY) {
      expect(e.match.length).toBeGreaterThan(0);
      expect(e.definition.length).toBeGreaterThan(40);
    }
  });
});
