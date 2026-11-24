import { messages, type Locale } from './i18n';
import type { Category, Finding, FindingStatus } from './types';

export const ERROR_MSG = messages({
  es: {
    title: 'No hemos podido completar esta comprobación',
    detail: (reason: string) =>
      `La comprobación no respondió a tiempo o devolvió un error (${reason}).`,
    detailGeneric: 'La comprobación no respondió a tiempo o devolvió un error.',
    risk: 'Sin este dato el informe está incompleto, pero no indica por sí mismo un problema.',
    fix: 'Vuelve a lanzar el análisis dentro de unos minutos.',
  },
  ca: {
    title: 'No hem pogut completar aquesta comprovació',
    detail: (reason: string) =>
      `La comprovació no va respondre a temps o va retornar un error (${reason}).`,
    detailGeneric: 'La comprovació no va respondre a temps o va retornar un error.',
    risk: "Sense aquesta dada l'informe està incomplet, però no indica per si mateix cap problema.",
    fix: "Torna a llançar l'anàlisi d'aquí a uns minuts.",
  },
  en: {
    title: 'We could not complete this check',
    detail: (reason: string) => `The check timed out or returned an error (${reason}).`,
    detailGeneric: 'The check timed out or returned an error.',
    risk: 'Without this data the report is incomplete, but it does not point to a problem by itself.',
    fix: 'Run the scan again in a few minutes.',
  },
});

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
export function errorFinding(
  id: string,
  category: Category,
  cause: unknown,
  locale: Locale = 'es',
): Finding {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const m = ERROR_MSG[locale];
  return {
    id,
    category,
    status: 'error',
    title: m.title,
    // Los mensajes internos de error están en español: en otros idiomas, el texto genérico.
    detail: locale === 'es' ? m.detail(reason) : m.detailGeneric,
    risk: m.risk,
    fix: [m.fix],
    evidence: { reason },
  };
}
