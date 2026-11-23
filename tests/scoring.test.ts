import { describe, expect, it } from 'vitest';
import { summaryText } from '@/lib/report';
import { gradeFor, pointsOf, scoreCategory, scoreReport, weightOf } from '@/lib/scoring';
import type { Finding } from '@/lib/types';

const f = (
  id: string,
  status: Finding['status'],
  fix: string[] = [],
  category = id.split('.')[0] as Finding['category'],
): Finding => ({ id, category, status, title: `T ${id}`, detail: '', risk: '', fix });

describe('pointsOf / gradeFor / weightOf', () => {
  it('puntos por estado', () => {
    expect(pointsOf(f('x.a', 'ok'))).toBe(100);
    expect(pointsOf(f('x.a', 'warning'))).toBe(50);
    expect(pointsOf(f('x.a', 'fail'))).toBe(0);
    expect(pointsOf(f('x.a', 'info'))).toBe(100);
    expect(pointsOf(f('x.a', 'info', ['mejora']))).toBe(80);
    expect(pointsOf(f('x.a', 'error'))).toBeNull();
  });

  it.each([
    [100, 'A'],
    [90, 'A'],
    [89, 'B'],
    [75, 'B'],
    [60, 'C'],
    [45, 'D'],
    [30, 'E'],
    [29, 'F'],
    [0, 'F'],
  ])('%i → %s', (score, grade) => {
    expect(gradeFor(score)).toBe(grade);
  });

  it('peso por defecto 1', () => {
    expect(weightOf('ssl.no_https')).toBe(5);
    expect(weightOf('desconocido')).toBe(1);
  });
});

describe('scoreCategory', () => {
  it('media ponderada', () => {
    // hsts (2) ok + csp (1) warning + xcto (1) fail → (200 + 50 + 0) / 4 = 62.5 → 63
    const r = scoreCategory([
      f('headers.hsts', 'ok'),
      f('headers.csp', 'warning'),
      f('headers.xcto', 'fail'),
    ]);
    expect(r).toMatchObject({ score: 63, grade: 'C' });
    expect(r.counts).toEqual({ ok: 1, warning: 1, fail: 1, info: 0, error: 0 });
  });

  it('un fallo crítico limita la categoría a D', () => {
    const findings = [
      f('ssl.expiry', 'fail'),
      ...['ssl.hostname', 'ssl.protocol', 'ssl.redirect', 'ssl.www', 'ssl.trust'].map((id) =>
        f(id, 'ok'),
      ),
    ];
    expect(scoreCategory(findings)).toMatchObject({ score: 59, grade: 'D' });
  });

  it('sin datos de al menos la mitad del peso no hay nota', () => {
    const r = scoreCategory([
      f('email.exposed', 'info'),
      f('email.spf', 'error'),
      f('email.dmarc', 'error'),
      f('email.dkim', 'error'),
    ]);
    expect(r).toMatchObject({ score: null, grade: null });
    expect(r.counts.error).toBe(3);
  });

  it('ignora errores y hallazgos de peso 0', () => {
    expect(scoreCategory([f('email.mx', 'info'), f('email.spf', 'error')])).toMatchObject({
      score: null,
      grade: null,
    });
    expect(
      scoreCategory([f('email.mx', 'ok'), f('email.spf', 'ok'), f('email.dmarc', 'error')]).score,
    ).toBe(100);
  });
});

describe('scoreReport', () => {
  it('nota global ponderada por categoría', () => {
    const r = scoreReport([
      f('ssl.trust', 'ok'), // ssl 100 × 0.3
      f('headers.hsts', 'fail'), // headers 0 × 0.2
      f('email.spf', 'ok'), // email 100 × 0.25
      f('privacy.banner', 'ok'), // privacy 100 × 0.25
    ]);
    expect(r.global).toEqual({ score: 80, grade: 'B' });
    expect(r.categories.headers).toMatchObject({ score: 0, grade: 'F' });
  });

  it('sin datos en ninguna categoría', () => {
    expect(scoreReport([f('ssl.trust', 'error')]).global).toEqual({ score: null, grade: null });
  });

  it('una categoría sin datos no cuenta en la global', () => {
    const r = scoreReport([f('ssl.trust', 'ok'), f('headers.hsts', 'error')]);
    expect(r.global).toEqual({ score: 100, grade: 'A' });
    expect(r.categories.headers.grade).toBeNull();
  });
});

describe('summaryText', () => {
  it('resume nota, categorías y problemas por gravedad', () => {
    const text = summaryText({
      domain: 'minegocio.es',
      scannedAt: '2026-11-23T11:00:00Z',
      notices: ['Aviso orientativo.'],
      findings: [
        f('headers.hsts', 'warning'),
        f('ssl.expiry', 'fail'),
        f('email.spf', 'ok'),
        f('privacy.banner', 'info'),
      ],
    });
    expect(text).toContain('Informe de seguridad de minegocio.es');
    expect(text).toMatch(/Nota global: [A-F] \(\d+\/100\)/);
    expect(text).toContain('23 de noviembre de 2026');
    expect(text).toContain('Cabeceras de seguridad: D (50/100)');
    expect(text.indexOf('✗ T ssl.expiry')).toBeLessThan(text.indexOf('! T headers.hsts'));
    expect(text).not.toContain('T email.spf');
    expect(text).toContain('Aviso orientativo.');
  });

  it('sin problemas y sin datos', () => {
    const text = summaryText({
      domain: 'a.es',
      scannedAt: '2026-11-23T11:00:00Z',
      notices: [],
      findings: [],
    });
    expect(text).toContain('No hay problemas importantes.');
    expect(text).toContain('Nota global: sin datos');
  });
});
