'use client';

import { formatDate, type ReportData } from '@/lib/report';
import { scoreReport } from '@/lib/scoring';
import { GradeBadge } from './Badges';

/** Informes guardados en este navegador. */
export function HistoryList({
  items,
  onOpen,
  onRemove,
  onClear,
}: {
  items: readonly ReportData[];
  onOpen: (report: ReportData) => void;
  onRemove: (report: ReportData) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="historial-titulo"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-6 dark:border-slate-800 print:hidden"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="historial-titulo" className="text-xl font-semibold">
          Informes guardados en este navegador
        </h2>
        <button type="button" onClick={onClear} className="text-sm underline">
          Borrar todo el historial
        </button>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Solo se guardan en tu navegador; no salen de tu equipo.
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((r) => {
          const { global } = scoreReport(r.findings);
          return (
            <li
              key={`${r.domain}-${r.scannedAt}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-900"
            >
              <GradeBadge grade={global.grade} score={global.score} />
              <span className="flex-1">
                <span className="block font-semibold break-all">{r.domain}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(r.scannedAt)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Ver<span className="sr-only"> el informe de {r.domain}</span>
              </button>
              <button type="button" onClick={() => onRemove(r)} className="text-sm underline">
                Borrar<span className="sr-only"> el informe de {r.domain}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
