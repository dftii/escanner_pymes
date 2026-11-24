import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { GLOSSARY } from '@/lib/glossary';

export const metadata: Metadata = {
  title: 'Glosario · Escáner Pymes',
  description:
    'Qué significan SSL, HSTS, CSP, SPF, DKIM, DMARC, RGPD y otros términos del informe de seguridad, explicado sin tecnicismos.',
};

const sorted = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'es'));

export default function Glosario() {
  return (
    <LegalPage title="Glosario">
      <p>Los términos del informe, explicados sin tecnicismos.</p>
      <dl className="flex flex-col gap-4">
        {sorted.map((entry) => (
          <div
            key={entry.id}
            id={entry.id}
            className="scroll-mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <dt className="font-semibold">{entry.term}</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </LegalPage>
  );
}
