import type { Category, Finding, FindingStatus } from './types';

/** Orden de gravedad para mostrar hallazgos: lo más urgente primero. */
export const SEVERITY_ORDER: Record<FindingStatus, number> = {
  fail: 0,
  warning: 1,
  error: 2,
  info: 3,
  ok: 4,
};

/** Devuelve una copia ordenada por gravedad, estable dentro de cada nivel. */
export function sortBySeverity(findings: readonly Finding[]): Finding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.finding.status] - SEVERITY_ORDER[b.finding.status] || a.index - b.index,
    )
    .map(({ finding }) => finding);
}

/** Agrupa hallazgos por categoría, conservando el orden de entrada. */
export function groupByCategory(findings: readonly Finding[]): Record<Category, Finding[]> {
  const groups: Record<Category, Finding[]> = { ssl: [], headers: [], email: [], privacy: [] };
  for (const finding of findings) groups[finding.category].push(finding);
  return groups;
}

/**
 * Construye el hallazgo que devuelve un check cuando no ha podido completarse
 * (timeout, DNS, error de red). Así un fallo aislado no rompe el informe.
 */
export function errorFinding(id: string, category: Category, cause: unknown): Finding {
  const reason = cause instanceof Error ? cause.message : String(cause);
  return {
    id,
    category,
    status: 'error',
    title: 'No hemos podido completar esta comprobación',
    detail: `La comprobación no respondió a tiempo o devolvió un error (${reason}).`,
    risk: 'Sin este dato el informe está incompleto, pero no indica por sí mismo un problema.',
    fix: ['Vuelve a lanzar el análisis dentro de unos minutos.'],
    evidence: { reason },
  };
}
