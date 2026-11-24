'use client';

import { useId, useState, type FormEvent } from 'react';
import { compareReports, type ReportData } from '@/lib/report';
import { requestScan } from '@/lib/scanClient';
import { GradeBadge } from './Badges';

/** Tabla de notas de dos informes, lado a lado. */
export function ComparisonTable({
  a,
  b,
  labelA,
  labelB,
  caption,
}: {
  a: ReportData;
  b: ReportData;
  labelA: string;
  labelB: string;
  caption: string;
}) {
  const rows = compareReports(a, b);
  return (
    <table className="fade-in w-full border-collapse text-left">
      <caption className="mb-2 text-left text-sm text-slate-600 dark:text-slate-400">
        {caption}
      </caption>
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800">
          <th scope="col" className="py-2 pr-2 font-semibold">
            Categoría
          </th>
          <th scope="col" className="px-2 py-2 font-semibold break-all">
            {labelA}
          </th>
          <th scope="col" className="py-2 pl-2 font-semibold break-all">
            {labelB}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
            <th scope="row" className="py-2 pr-2 font-normal">
              {r.label}
            </th>
            {(['a', 'b'] as const).map((side) => (
              <td key={side} className="px-2 py-2">
                <span className="flex items-center gap-2">
                  <GradeBadge grade={r[side].grade} score={r[side].score} />
                  {r.better === side && (
                    <span className="pop-in inline-block text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Mejor
                    </span>
                  )}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type CompareState =
  | { phase: 'idle' }
  | { phase: 'scanning'; domain: string }
  | { phase: 'done'; other: ReportData }
  | { phase: 'error'; message: string };

/** Analiza otro dominio (p. ej. un competidor) y compara las notas. */
export function CompetitorCompare({ report }: { report: ReportData }) {
  const [state, setState] = useState<CompareState>({ phase: 'idle' });
  const domainId = useId();
  const consentId = useId();
  const titleId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const domain = String(data.get('domain') ?? '').trim();
    setState({ phase: 'scanning', domain });
    try {
      const other = await requestScan(domain, data.get('consent') === 'on');
      setState({ phase: 'done', other });
    } catch (error) {
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'No hemos podido analizar el dominio.',
      });
    }
  }

  const scanning = state.phase === 'scanning';
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-6 dark:border-slate-800 print:hidden"
    >
      <h3 id={titleId} className="text-xl font-semibold">
        Compárate con otra web
      </h3>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor={domainId} className="text-sm">
          Escribe otro dominio, por ejemplo el de un competidor o una web de referencia de tu
          sector.
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={domainId}
            name="domain"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={253}
            placeholder="otranegocio.es"
            disabled={scanning}
            className="flex-1 rounded-lg border border-slate-400 bg-white px-4 py-2 dark:border-slate-600 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={scanning}
            className="press rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {scanning ? 'Analizando…' : 'Comparar'}
          </button>
        </div>
        <div className="flex items-start gap-3">
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            required
            disabled={scanning}
            className="mt-1 size-5 shrink-0"
          />
          <label htmlFor={consentId} className="text-sm text-slate-700 dark:text-slate-300">
            Confirmo que tengo permiso para analizar este dominio. Solo se hacen comprobaciones
            pasivas, las mismas que haría un navegador, y cuenta para el límite de análisis.
          </label>
        </div>
      </form>
      <div aria-live="polite" aria-busy={scanning}>
        {scanning && <p>Analizando {state.domain}…</p>}
        {state.phase === 'error' && (
          <p role="alert" className="text-red-800 dark:text-red-300">
            {state.message}
          </p>
        )}
        {state.phase === 'done' && (
          <ComparisonTable
            a={report}
            b={state.other}
            labelA={report.domain}
            labelB={state.other.domain}
            caption={`Notas de ${report.domain} frente a ${state.other.domain}`}
          />
        )}
      </div>
    </section>
  );
}
