'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  browserStorage,
  clearHistory,
  isSaved,
  loadHistory,
  previousReport,
  removeReport,
  saveReport,
} from '@/lib/history';
import type { ReportData } from '@/lib/report';
import { requestScan } from '@/lib/scanClient';
import { decodeReport, sharedFromHash } from '@/lib/share';
import { CATEGORY_LABELS, type Category } from '@/lib/types';
import { HistoryList } from './History';
import { ReportView, type SaveState } from './ReportView';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

type State =
  | { phase: 'idle' }
  | { phase: 'scanning'; domain: string; done: Category[] }
  | { phase: 'done'; report: ReportData; shared?: boolean }
  | { phase: 'error'; message: string };

export function Scanner() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const resultsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const domainId = useId();
  const consentId = useId();
  const errorId = useId();

  // El historial se lee tras montar: en el servidor no hay localStorage.
  const [history, setHistory] = useState<ReportData[]>([]);
  const [storageOk, setStorageOk] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const storage = browserStorage();
    setStorageOk(!!storage);
    setHistory(loadHistory(storage));
  }, []);

  // Informe compartido en el enlace (#r=…): se descomprime y valida en el navegador.
  useEffect(() => {
    const encoded = sharedFromHash(window.location.hash);
    if (!encoded) return;
    let cancelled = false;
    decodeReport(encoded).then((report) => {
      if (cancelled) return;
      if (report) {
        setState({ phase: 'done', report, shared: true });
        requestAnimationFrame(() => resultsRef.current?.focus());
      } else {
        setState({
          phase: 'error',
          message:
            'El enlace del informe está incompleto o dañado. Pide que te lo vuelvan a enviar.',
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Quita el informe compartido de la URL (al analizar otro dominio). */
  function clearSharedHash() {
    if (sharedFromHash(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  function show(report: ReportData) {
    clearSharedHash();
    setSaveError(false);
    setState({ phase: 'done', report });
    requestAnimationFrame(() => resultsRef.current?.focus());
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const domain = String(data.get('domain') ?? '').trim();
    const consent = data.get('consent') === 'on';
    clearSharedHash();
    setState({ phase: 'scanning', domain, done: [] });

    try {
      const report = await requestScan(domain, consent, (category) =>
        setState((s) => (s.phase === 'scanning' ? { ...s, done: [...s.done, category] } : s)),
      );
      show(report);
    } catch (error) {
      setState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'No hemos podido analizar el dominio.',
      });
    }
  }

  const current = state.phase === 'done' ? state.report : null;
  const saveState: SaveState = !storageOk
    ? 'unavailable'
    : saveError
      ? 'error'
      : current && isSaved(history, current)
        ? 'saved'
        : 'unsaved';

  function onSave() {
    if (!current) return;
    const list = saveReport(browserStorage(), current);
    if (list) setHistory(list);
    setSaveError(!list);
  }

  const scanning = state.phase === 'scanning';

  return (
    <div className="flex flex-col gap-10">
      <form
        ref={formRef}
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
            className="press bg-brand-700 hover:bg-brand-900 rounded-lg px-6 py-3 text-lg font-semibold text-white disabled:cursor-wait disabled:opacity-70"
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
            <div
              role="progressbar"
              aria-label="Progreso del análisis"
              aria-valuemin={0}
              aria-valuemax={CATEGORIES.length}
              aria-valuenow={state.done.length}
              className="progress-shimmer relative mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            >
              <div
                className="progress-fill bg-brand-600 h-full rounded-full dark:bg-blue-400"
                style={{
                  transform: `scaleX(${Math.max(0.06, state.done.length / CATEGORIES.length)})`,
                }}
              />
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => {
                const done = state.done.includes(c);
                return (
                  <li key={c} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        done
                          ? 'check-pop inline-flex size-6 items-center justify-center rounded-full bg-emerald-700 text-sm text-white'
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
            className="shake-once rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
          >
            {state.message}
          </p>
        )}
      </div>

      {current && (
        <div ref={resultsRef} tabIndex={-1} className="outline-none">
          <ReportView
            report={current}
            saveState={saveState}
            onSave={onSave}
            previous={previousReport(history, current)}
            shared={state.phase === 'done' && !!state.shared}
            onRescan={() => {
              const input = formRef.current?.elements.namedItem('domain');
              if (input instanceof HTMLInputElement) {
                input.value = current.domain;
                input.focus();
              }
              formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          />
        </div>
      )}

      {!scanning && (
        <HistoryList
          items={history}
          onOpen={show}
          onRemove={(r) => setHistory(removeReport(browserStorage(), r))}
          onClear={() => {
            clearHistory(browserStorage());
            setHistory([]);
          }}
        />
      )}
    </div>
  );
}
