import type { Finding } from '@/lib/types';
import { StatusBadge } from './Badges';
import { DnsRecords } from './DnsRecords';
import { GlossaryText } from './Glossary';

/** Un hallazgo desplegable: los problemas se muestran abiertos. */
export function FindingItem({ finding }: { finding: Finding }) {
  const isProblem = finding.status === 'fail' || finding.status === 'warning';
  // Cada término se explica una sola vez por hallazgo.
  const seen = new Set<string>();
  return (
    <li>
      <details
        open={isProblem}
        className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 print:break-inside-avoid"
      >
        <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl p-4 [&::-webkit-details-marker]:hidden">
          <StatusBadge status={finding.status} />
          <span className="flex-1 font-medium">{finding.title}</span>
          <span
            aria-hidden="true"
            className="text-slate-500 transition-transform group-open:rotate-180 print:hidden"
          >
            ▾
          </span>
        </summary>
        <div className="space-y-3 px-4 pb-4 text-sm text-slate-700 dark:text-slate-300">
          <p>
            <GlossaryText text={finding.detail} seen={seen} />
          </p>
          {finding.risk && finding.status !== 'ok' && (
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Por qué importa: </strong>
              <GlossaryText text={finding.risk} seen={seen} />
            </p>
          )}
          {finding.records && finding.records.length > 0 && (
            <DnsRecords records={finding.records} />
          )}
          {finding.fix.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Cómo arreglarlo:</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {finding.fix.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
