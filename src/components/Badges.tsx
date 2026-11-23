import { GRADE_LABELS, type Grade } from '@/lib/scoring';
import type { FindingStatus } from '@/lib/types';

/** Colores con contraste AA sobre texto blanco. */
const GRADE_STYLES: Record<Grade, string> = {
  A: 'bg-emerald-700',
  B: 'bg-lime-700',
  C: 'bg-amber-700',
  D: 'bg-orange-700',
  E: 'bg-red-700',
  F: 'bg-red-900',
};

export function GradeBadge({
  grade,
  score,
  size = 'md',
}: {
  grade: Grade | null;
  score: number | null;
  size?: 'md' | 'xl';
}) {
  const box = size === 'xl' ? 'size-24 text-6xl rounded-3xl' : 'size-12 text-2xl rounded-xl';
  if (!grade) {
    return (
      <span
        className={`${box} inline-flex shrink-0 items-center justify-center bg-slate-500 font-bold text-white`}
        aria-label="Sin datos suficientes para dar una nota"
        title="Sin datos"
      >
        –
      </span>
    );
  }
  return (
    <span
      className={`${box} ${GRADE_STYLES[grade]} inline-flex shrink-0 items-center justify-center font-bold text-white print:border print:border-black print:text-black`}
      aria-label={`Nota ${grade}, ${GRADE_LABELS[grade]}, ${score} sobre 100`}
      title={`${score}/100`}
    >
      {grade}
    </span>
  );
}

const STATUS: Record<FindingStatus, { label: string; icon: string; className: string }> = {
  fail: {
    label: 'Fallo',
    icon: '✗',
    className: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100',
  },
  warning: {
    label: 'Aviso',
    icon: '!',
    className: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  },
  error: {
    label: 'Sin datos',
    icon: '?',
    className: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
  },
  info: {
    label: 'Info',
    icon: 'i',
    className: 'bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100',
  },
  ok: {
    label: 'Correcto',
    icon: '✓',
    className: 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100',
  },
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={`${s.className} inline-flex w-24 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold print:border print:border-black`}
    >
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}
