'use client';

import { useEffect, useState } from 'react';
import { sortBySeverity } from '@/lib/findings';
import { formatDate, mailtoHref, summaryText, type ReportData } from '@/lib/report';
import { GRADE_LABELS, scoreReport } from '@/lib/scoring';
import { CATEGORY_LABELS, type Category } from '@/lib/types';
import { GradeBadge, ScoreRing } from './Badges';
import { ComparisonTable, CompetitorCompare } from './Comparison';
import { CountUp } from './CountUp';
import { FindingItem } from './FindingItem';
import { stagger } from './Motion';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export type SaveState = 'unavailable' | 'unsaved' | 'saved' | 'error';

export function ReportView({
  report,
  saveState = 'unavailable',
  onSave,
  previous = null,
}: {
  report: ReportData;
  /** Si el informe está guardado en el historial del navegador. */
  saveState?: SaveState;
  onSave?: () => void;
  /** Informe guardado anterior del mismo dominio, para ver la evolución. */
  previous?: ReportData | null;
}) {
  const { global, categories } = scoreReport(report.findings);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'error'>('idle');

  // Al imprimir, abre todos los hallazgos (los <details> cerrados no se imprimen).
  useEffect(() => {
    const closed: HTMLDetailsElement[] = [];
    const before = () => {
      document.querySelectorAll('details:not([open])').forEach((d) => {
        closed.push(d as HTMLDetailsElement);
        (d as HTMLDetailsElement).open = true;
      });
    };
    const after = () => {
      closed.splice(0).forEach((d) => (d.open = false));
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(report));
      setCopied('ok');
    } catch {
      setCopied('error');
    }
  };

  const problems = report.findings.filter((f) => f.status === 'fail' || f.status === 'warning');

  return (
    <article aria-labelledby="informe-titulo" className="flex flex-col gap-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-slate-200 p-6 sm:flex-row sm:items-center dark:border-slate-800">
        <span className="pop-in inline-flex shrink-0">
          <ScoreRing grade={global.grade} score={global.score} />
        </span>
        <div className="flex-1">
          <h2 id="informe-titulo" className="text-2xl font-bold break-all">
            {report.domain}
          </h2>
          <p className="mt-1 text-lg">
            {global.grade ? (
              <>
                Nota global: {GRADE_LABELS[global.grade]} (<CountUp value={global.score ?? 0} />
                /100)
              </>
            ) : (
              'No hemos podido calcular una nota global'
            )}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Analizado el {formatDate(report.scannedAt)} ·{' '}
            {problems.length === 0
              ? 'sin problemas importantes'
              : `${problems.length} ${problems.length === 1 ? 'cosa' : 'cosas'} que conviene arreglar`}
          </p>
        </div>
        <div className="flex flex-col gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="press bg-brand-700 hover:bg-brand-900 rounded-lg px-4 py-2 font-semibold text-white"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={copy}
            className="press rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Copiar resumen
          </button>
          <a
            href={mailtoHref(report)}
            className="press rounded-lg border border-slate-300 px-4 py-2 text-center font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Enviar por email
          </a>
          {saveState !== 'unavailable' && (
            <button
              type="button"
              onClick={onSave}
              disabled={saveState === 'saved'}
              className="press rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 disabled:cursor-default disabled:opacity-70 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {saveState === 'saved' ? (
                <span className="check-pop inline-block">Guardado ✓</span>
              ) : (
                'Guardar en este navegador'
              )}
            </button>
          )}
          <p
            role="status"
            className="min-h-5 text-center text-sm text-slate-600 dark:text-slate-400"
          >
            {copied === 'ok' && <span className="fade-in">Resumen copiado ✓</span>}
            {copied === 'error' && 'No se ha podido copiar'}
            {saveState === 'error' && 'No se ha podido guardar'}
          </p>
        </div>
      </header>

      {previous && (
        <section
          aria-labelledby="evolucion-titulo"
          className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
        >
          <h3 id="evolucion-titulo" className="mb-3 text-xl font-semibold">
            Evolución
          </h3>
          <ComparisonTable
            a={report}
            b={previous}
            labelA="Ahora"
            labelB={`Antes (${formatDate(previous.scannedAt)})`}
            caption={`Notas de ${report.domain} frente al último informe guardado`}
          />
        </section>
      )}

      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Nota por categoría">
        {CATEGORIES.map((c, i) => {
          const s = categories[c];
          return (
            <li key={c} className="rise-in" style={stagger(i + 2)}>
              <a
                href={`#cat-${c}`}
                className="bouncy flex items-center gap-4 rounded-xl border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
              >
                <span className="pop-in inline-flex shrink-0" style={stagger(i + 3)}>
                  <GradeBadge grade={s.grade} score={s.score} />
                </span>
                <span>
                  <span className="block font-semibold">{CATEGORY_LABELS[c]}</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    {s.counts.fail} fallos · {s.counts.warning} avisos · {s.counts.ok} correctos
                    {s.counts.error > 0 && ` · ${s.counts.error} sin datos`}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {CATEGORIES.map((c) => {
        const findings = sortBySeverity(report.findings.filter((f) => f.category === c));
        if (findings.length === 0) return null;
        return (
          <section
            key={c}
            id={`cat-${c}`}
            aria-labelledby={`cat-${c}-titulo`}
            className="reveal scroll-mt-4"
          >
            <h3 id={`cat-${c}-titulo`} className="mb-3 text-xl font-semibold">
              {CATEGORY_LABELS[c]}
            </h3>
            <ul className="flex flex-col gap-2">
              {findings.map((f) => (
                <FindingItem key={f.id} finding={f} />
              ))}
            </ul>
          </section>
        );
      })}

      <CompetitorCompare key={`${report.domain}-${report.scannedAt}`} report={report} />

      {report.notices.length > 0 && (
        <aside className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {report.notices.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </aside>
      )}
    </article>
  );
}
