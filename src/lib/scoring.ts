import type { Category, Finding, FindingStatus } from './types';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type Score = { score: number; grade: Grade } | { score: null; grade: null };

export type CategoryScore = Score & { counts: Record<FindingStatus, number> };

export type ReportScore = {
  global: Score;
  categories: Record<Category, CategoryScore>;
};

/** Umbral mínimo de puntos para cada nota. */
export const GRADE_THRESHOLDS: ReadonlyArray<[Grade, number]> = [
  ['A', 90],
  ['B', 75],
  ['C', 60],
  ['D', 45],
  ['E', 30],
  ['F', 0],
];

export const GRADE_LABELS: Record<Grade, string> = {
  A: 'Muy bien',
  B: 'Bien',
  C: 'Mejorable',
  D: 'Deficiente',
  E: 'Mal',
  F: 'Muy mal',
};

/** Peso de cada categoría en la nota global. */
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  ssl: 0.3,
  headers: 0.2,
  email: 0.25,
  privacy: 0.25,
};

/**
 * Importancia de cada comprobación dentro de su categoría.
 * 0 = solo informativa (no puntúa). Las de peso ≥ 3 son críticas: si fallan,
 * la categoría no puede pasar de D.
 */
export const FINDING_WEIGHTS: Record<string, number> = {
  'ssl.no_https': 5,
  'ssl.trust': 3,
  'ssl.untrusted': 3,
  'ssl.chain': 3,
  'ssl.expiry': 3,
  'ssl.hostname': 3,
  'ssl.redirect': 2,
  'ssl.protocol': 2,
  'ssl.www': 1,
  'headers.hsts': 2,
  'headers.csp': 1,
  'headers.xcto': 1,
  'headers.framing': 1,
  'headers.referrer': 0.5,
  'headers.permissions': 0.5,
  'headers.disclosure': 1,
  'email.mx': 0,
  'email.spf': 3,
  'email.dmarc': 3,
  'email.dkim': 1.5,
  'email.exposed': 1,
  'privacy.cookies': 3,
  'privacy.cookies_js': 3,
  'privacy.trackers': 3,
  'privacy.banner': 3,
  'privacy.legal_notice': 2,
  'privacy.privacy_policy': 2,
  'privacy.cookie_policy': 1.5,
  'privacy.forms': 1.5,
};

const CRITICAL_WEIGHT = 3;
const CRITICAL_CAP = 59;
/** Parte mínima (por peso) de la categoría con datos para dar nota. */
const MIN_COVERAGE = 0.5;

export const weightOf = (id: string) => FINDING_WEIGHTS[id] ?? 1;

/** Puntos de un hallazgo (0-100), o `null` si no puntúa (error). */
export function pointsOf(finding: Finding): number | null {
  switch (finding.status) {
    case 'ok':
      return 100;
    case 'warning':
      return 50;
    case 'fail':
      return 0;
    // Un "info" con pasos de mejora resta un poco; sin pasos es neutro.
    case 'info':
      return finding.fix.length > 0 ? 80 : 100;
    case 'error':
      return null;
  }
}

export function gradeFor(score: number): Grade {
  return GRADE_THRESHOLDS.find(([, min]) => score >= min)![0];
}

const emptyCounts = (): Record<FindingStatus, number> => ({
  ok: 0,
  warning: 0,
  fail: 0,
  info: 0,
  error: 0,
});

export function scoreCategory(findings: readonly Finding[]): CategoryScore {
  const counts = emptyCounts();
  let weighted = 0;
  let totalWeight = 0;
  let possibleWeight = 0;
  let criticalFail = false;
  for (const f of findings) {
    counts[f.status]++;
    const points = pointsOf(f);
    const weight = weightOf(f.id);
    possibleWeight += weight;
    if (points === null || weight === 0) continue;
    weighted += points * weight;
    totalWeight += weight;
    if (f.status === 'fail' && weight >= CRITICAL_WEIGHT) criticalFail = true;
  }
  // Sin datos de al menos la mitad (por peso) no damos nota: sería engañosa.
  if (totalWeight === 0 || totalWeight < possibleWeight * MIN_COVERAGE) {
    return { score: null, grade: null, counts };
  }
  let score = Math.round(weighted / totalWeight);
  if (criticalFail) score = Math.min(score, CRITICAL_CAP);
  return { score, grade: gradeFor(score), counts };
}

/** Nota por categoría y global (media ponderada de las categorías con datos). */
export function scoreReport(findings: readonly Finding[]): ReportScore {
  const categories = {} as Record<Category, CategoryScore>;
  let weighted = 0;
  let totalWeight = 0;
  for (const category of Object.keys(CATEGORY_WEIGHTS) as Category[]) {
    const result = scoreCategory(findings.filter((f) => f.category === category));
    categories[category] = result;
    if (result.score !== null) {
      weighted += result.score * CATEGORY_WEIGHTS[category];
      totalWeight += CATEGORY_WEIGHTS[category];
    }
  }
  if (totalWeight === 0) return { global: { score: null, grade: null }, categories };
  const score = Math.round(weighted / totalWeight);
  return { global: { score, grade: gradeFor(score) }, categories };
}
