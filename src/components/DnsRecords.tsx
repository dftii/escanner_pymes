'use client';

import { useState } from 'react';
import type { DnsRecordSuggestion } from '@/lib/dnsRecords';
import { useUi } from './LocaleProvider';

function CopyButton({ text, what }: { text: string; what: string }) {
  const t = useUi();
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('ok');
          setTimeout(() => setState('idle'), 2000);
        } catch {
          setState('error');
        }
      }}
      className="press shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800 print:hidden"
    >
      <span aria-live="polite">
        {state === 'ok' ? (
          <span className="check-pop inline-block">{t.copied}</span>
        ) : state === 'error' ? (
          t.cannotCopy
        ) : (
          <>
            {t.copy}
            <span className="sr-only"> {what}</span>
          </>
        )}
      </span>
    </button>
  );
}

/** Registros DNS recomendados, listos para copiar en el panel del dominio. */
export function DnsRecords({ records }: { records: DnsRecordSuggestion[] }) {
  const t = useUi();
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {records.length > 1 ? t.recordMany : t.recordOne}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.recordHelp}</p>
      <ol className="mt-3 flex flex-col gap-3">
        {records.map((r) => (
          <li key={r.value} className="flex flex-col gap-2">
            {r.label && <p className="font-medium text-slate-900 dark:text-slate-100">{r.label}</p>}
            <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5">
              <dt className="text-xs text-slate-600 dark:text-slate-400">{t.recordType}</dt>
              <dd className="col-span-2 font-mono text-xs">{r.type}</dd>
              <dt className="text-xs text-slate-600 dark:text-slate-400">{t.recordName}</dt>
              <dd className="font-mono text-xs break-all">
                {r.host}
                {r.host !== r.fqdn && (
                  <span className="text-slate-500 dark:text-slate-400"> ({r.fqdn})</span>
                )}
              </dd>
              <dd>
                <CopyButton text={r.host} what={t.copyNameOf(r.host)} />
              </dd>
              <dt className="text-xs text-slate-600 dark:text-slate-400">{t.recordValue}</dt>
              <dd className="rounded bg-white px-2 py-1 font-mono text-xs break-all dark:bg-slate-950">
                {r.value}
              </dd>
              <dd>
                <CopyButton text={r.value} what={t.copyValueOf} />
              </dd>
            </dl>
            {r.note && <p className="text-xs text-slate-700 dark:text-slate-300">{r.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
