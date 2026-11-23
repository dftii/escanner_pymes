'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import type { ReportData } from '@/lib/report';
import { readEventStream } from '@/lib/scanStream';
import { CATEGORY_LABELS, type Category } from '@/lib/types';
import { ReportView } from './ReportView';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

type State =
  | { phase: 'idle' }
  | { phase: 'scanning'; domain: string; done: Category[] }
  | { phase: 'done'; report: ReportData }
  | { phase: 'error'; message: string };

export function Scanner() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const resultsRef = useRef<HTMLDivElement>(null);
  const domainId = useId();
  const consentId = useId();
  const errorId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const domain = String(data.get('domain') ?? '').trim();
    const consent = data.get('consent') === 'on';
    setState({ phase: 'scanning', domain, done: [] });

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ domain, consent }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? 'No hemos podido analizar el dominio.');
      }
      let finished = false;
      await readEventStream(res.body, (e) => {
        if (e.type === 'category') {
          setState((s) => (s.phase === 'scanning' ? { ...s, done: [...s.done, e.category] } : s));
        } else if (e.type === 'done') {
          finished = true;
          setState({ phase: 'done', report: e.result });
          requestAnimationFrame(() => resultsRef.current?.focus());
        } else {
          throw new Error(e.message);
        }
      });
      if (!finished) throw new Error('El análisis se ha interrumpido. Inténtalo de nuevo.');
    } catch (error) {
      setState({
        phase: 'error',
        message:
          error instanceof Error && error.message !== 'Failed to fetch'
            ? error.message
            : 'No hemos podido conectar con el servidor. Revisa tu conexión.',
      });
    }
  }

  const scanning = state.phase === 'scanning';

  return (
    <div className="flex flex-col gap-10">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900 print:hidden"
        aria-describedby={state.phase === 'error' ? errorId : undefined}
      >
        <label htmlFor={domainId} className="font-semibold">
          Dominio de tu web
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={domainId}
            name="domain"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={253}
            placeholder="minegocio.es"
            disabled={scanning}
            className="flex-1 rounded-lg border border-slate-400 bg-white px-4 py-3 text-lg dark:border-slate-600 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={scanning}
            className="bg-brand-700 hover:bg-brand-900 rounded-lg px-6 py-3 text-lg font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            {scanning ? 'Analizando…' : 'Analizar'}
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
            Confirmo que este dominio es mío o que tengo permiso para analizarlo.
          </label>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Solo hacemos comprobaciones pasivas, las mismas que haría un navegador: no probamos
          contraseñas ni buscamos fallos de forma agresiva. Úsalo de forma responsable. No guardamos
          el dominio: más detalles en la{' '}
          <a href="/privacidad" className="underline">
            política de privacidad
          </a>
          .
        </p>
      </form>

      <div aria-live="polite" aria-busy={scanning}>
        {state.phase === 'scanning' && (
          <section
            aria-label="Progreso del análisis"
            className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800"
          >
            <p className="font-semibold">Analizando {state.domain}…</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const done = state.done.includes(c);
                return (
                  <li key={c} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        done
                          ? 'inline-flex size-6 items-center justify-center rounded-full bg-emerald-700 text-sm text-white'
                          : 'border-t-brand-700 inline-block size-6 animate-spin rounded-full border-2 border-slate-300 motion-reduce:animate-none'
                      }
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span>
                      {CATEGORY_LABELS[c]}
                      <span className="sr-only">{done ? ': terminado' : ': en curso'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {state.phase === 'error' && (
          <p
            id={errorId}
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {state.message}
          </p>
        )}
      </div>

      {state.phase === 'done' && (
        <div ref={resultsRef} tabIndex={-1} className="outline-none">
          <ReportView report={state.report} />
        </div>
      )}
    </div>
  );
}
