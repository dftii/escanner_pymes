import type { Finding } from '@/lib/types';
import { StatusBadge } from './Badges';

/** Un hallazgo desplegable: los problemas se muestran abiertos. */
export function FindingItem({ finding }: { finding: Finding }) {
  const isProblem = finding.status === 'fail' || finding.status === 'warning';
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
          <p>{finding.detail}</p>
          {finding.risk && finding.status !== 'ok' && (
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Por qué importa: </strong>
              {finding.risk}
            </p>
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
