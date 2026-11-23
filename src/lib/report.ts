import { sortBySeverity } from './findings';
import { scoreReport, type Grade } from './scoring';
import { CATEGORY_LABELS, type Category, type Finding } from './types';

/** Lo que el informe necesita del resultado (sin depender de módulos de Node). */
export type ReportData = {
  domain: string;
  scannedAt: string;
  findings: Finding[];
  notices: string[];
};

const ICON: Record<Finding['status'], string> = {
  fail: '✗',
  warning: '!',
  error: '?',
  info: 'i',
  ok: '✓',
};

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

const gradeText = (grade: Grade | null, score: number | null) =>
  grade ? `${grade} (${score}/100)` : 'sin datos';

/** Resumen en texto plano para el botón "Copiar resumen". */
export function summaryText(report: ReportData): string {
  const { global, categories } = scoreReport(report.findings);
  const problems = sortBySeverity(report.findings).filter(
    (f) => f.status === 'fail' || f.status === 'warning',
  );
  const lines = [
    `Informe de seguridad de ${report.domain}`,
    `Nota global: ${gradeText(global.grade, global.score)}`,
    `Fecha: ${formatDate(report.scannedAt)}`,
    '',
    ...(Object.keys(CATEGORY_LABELS) as Category[]).map(
      (c) => `${CATEGORY_LABELS[c]}: ${gradeText(categories[c].grade, categories[c].score)}`,
    ),
    '',
    problems.length > 0 ? 'Qué conviene arreglar:' : 'No hay problemas importantes.',
    ...problems.map((f) => `${ICON[f.status]} ${f.title}`),
    '',
    ...report.notices,
    'Generado con Escáner Pymes.',
  ];
  return lines.join('\n');
}
