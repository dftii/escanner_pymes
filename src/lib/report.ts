import { recordLine } from './dnsRecords';
import { sortBySeverity } from './findings';
import { scoreReport, type Grade } from './scoring';
import { messages, type Locale } from './i18n';
import { CATEGORY_NAMES, formatDateTime } from './labels';
import { CATEGORIES, type Category, type Finding } from './types';

const MSG = messages({
  es: {
    title: (d: string) => `Informe de seguridad de ${d}`,
    global: 'Nota global',
    date: 'Fecha',
    noData: 'sin datos',
    toFix: 'Qué conviene arreglar:',
    noProblems: 'No hay problemas importantes.',
    footer: 'Generado con Escáner Pymes.',
    truncated: '(Resumen recortado: descarga el PDF para ver el informe completo.)',
  },
  ca: {
    title: (d: string) => `Informe de seguretat de ${d}`,
    global: 'Nota global',
    date: 'Data',
    noData: 'sense dades',
    toFix: 'Què convé arreglar:',
    noProblems: 'No hi ha problemes importants.',
    footer: 'Generat amb Escáner Pymes.',
    truncated: "(Resum retallat: descarrega el PDF per veure l'informe complet.)",
  },
  en: {
    title: (d: string) => `Security report for ${d}`,
    global: 'Overall grade',
    date: 'Date',
    noData: 'no data',
    toFix: 'What to fix:',
    noProblems: 'No major problems.',
    footer: 'Generated with Escáner Pymes.',
    truncated: '(Summary shortened: download the PDF to see the full report.)',
  },
});

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

export const formatDate = (iso: string, locale: Locale = 'es') => formatDateTime(iso, locale);

/** Resumen en texto plano para el botón "Copiar resumen". */
export function summaryText(report: ReportData, locale: Locale = 'es'): string {
  const m = MSG[locale];
  const gradeText = (grade: Grade | null, score: number | null) =>
    grade ? `${grade} (${score}/100)` : m.noData;
  const { global, categories } = scoreReport(report.findings);
  const problems = sortBySeverity(report.findings).filter(
    (f) => f.status === 'fail' || f.status === 'warning',
  );
  const lines = [
    m.title(report.domain),
    `${m.global}: ${gradeText(global.grade, global.score)}`,
    `${m.date}: ${formatDate(report.scannedAt, locale)}`,
    '',
    ...CATEGORIES.map(
      (c) => `${CATEGORY_NAMES[locale][c]}: ${gradeText(categories[c].grade, categories[c].score)}`,
    ),
    '',
    problems.length > 0 ? m.toFix : m.noProblems,
    ...problems.flatMap((f) => [
      `${ICON[f.status]} ${f.title}`,
      // El primer registro recomendado (p. ej. el paso 1 de DMARC), listo para el informático.
      ...(f.records?.[0] ? [`   → ${recordLine(f.records[0])}`] : []),
    ]),
    '',
    ...report.notices,
    m.footer,
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
export function mailtoHref(report: ReportData, to = '', locale: Locale = 'es'): string {
  const subject = MSG[locale].title(report.domain);
  const head = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=`;
  const full = summaryText(report, locale);
  const encoded = encodeURIComponent(full);
  if (head.length + encoded.length <= MAILTO_MAX) return head + encoded;

  const tail = `\n…\n${MSG[locale].truncated}`;
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
export function compareReports(
  a: ReportData,
  b: ReportData,
  locale: Locale = 'es',
): ComparisonRow[] {
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
    row('global', MSG[locale].global, sa.global, sb.global),
    ...CATEGORIES.map((c) => row(c, CATEGORY_NAMES[locale][c], sa.categories[c], sb.categories[c])),
  ];
}
