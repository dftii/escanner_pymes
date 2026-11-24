import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { glossaryFor } from '@/lib/glossary';
import { localeFrom, pageMetadata } from '@/lib/pageMeta';
import { UI } from '@/lib/ui';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  return pageMetadata(locale, '/glosario', {
    title: UI[locale].glossary,
    description: UI[locale].glossaryDescription,
  });
}

export default async function Glosario({ params }: Props) {
  const locale = await localeFrom(params);
  return (
    <LegalPage title={UI[locale].glossary} locale={locale} legal={false}>
      <p>{UI[locale].glossaryIntro}</p>
      <dl className="flex flex-col gap-4">
        {glossaryFor(locale).map((entry) => (
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
