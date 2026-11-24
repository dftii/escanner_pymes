import { recordLine } from './dnsRecords';
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
    ...problems.flatMap((f) => [
      `${ICON[f.status]} ${f.title}`,
      // El primer registro recomendado (p. ej. el paso 1 de DMARC), listo para el informático.
      ...(f.records?.[0] ? [`   → ${recordLine(f.records[0])}`] : []),
    ]),
    '',
    ...report.notices,
    'Generado con Escáner Pymes.',
  ];
  return lines.join('\n');
}

/** Largo máximo del enlace mailto: algunos clientes de correo cortan a partir de ~2000. */
export const MAILTO_MAX = 1900;

/**
 * Enlace `mailto:` con el resumen del informe, para enviarlo desde el propio
 * programa de correo del usuario (no pasa por nuestro servidor). Si el resumen
 * es muy largo, se recorta y se avisa de que el PDF tiene el informe completo.
 */
export function mailtoHref(report: ReportData, to = ''): string {
  const subject = `Informe de seguridad de ${report.domain}`;
  const head = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=`;
  const full = summaryText(report);
  const encoded = encodeURIComponent(full);
  if (head.length + encoded.length <= MAILTO_MAX) return head + encoded;

  const tail = '\n…\n(Resumen recortado: descarga el PDF para ver el informe completo.)';
  const budget = MAILTO_MAX - head.length - encodeURIComponent(tail).length;
  const lines = full.split('\n');
  let body = '';
  for (const line of lines) {
    const next = body ? `${body}\n${line}` : line;
    if (encodeURIComponent(next).length > budget) break;
    body = next;
  }
  return head + encodeURIComponent(body + tail);
}

export type ComparisonRow = {
  key: Category | 'global';
  label: string;
  a: { grade: Grade | null; score: number | null };
  b: { grade: Grade | null; score: number | null };
  /** Quién sale mejor: `a`, `b`, `tie` o `null` si falta alguna nota. */
  better: 'a' | 'b' | 'tie' | null;
};

/** Compara las notas de dos informes, por categoría y en global. */
export function compareReports(a: ReportData, b: ReportData): ComparisonRow[] {
  const sa = scoreReport(a.findings);
  const sb = scoreReport(b.findings);
  const row = (
    key: ComparisonRow['key'],
    label: string,
    x: ComparisonRow['a'],
    y: ComparisonRow['b'],
  ): ComparisonRow => ({
    key,
    label,
    a: { grade: x.grade, score: x.score },
    b: { grade: y.grade, score: y.score },
    better:
      x.score === null || y.score === null
        ? null
        : x.score === y.score
          ? 'tie'
          : x.score > y.score
            ? 'a'
            : 'b',
  });
  return [
    row('global', 'Nota global', sa.global, sb.global),
    ...(Object.keys(CATEGORY_LABELS) as Category[]).map((c) =>
      row(c, CATEGORY_LABELS[c], sa.categories[c], sb.categories[c]),
    ),
  ];
}
