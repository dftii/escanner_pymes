import Link from 'next/link';
import { localePath, type Locale } from '@/lib/i18n';
import { UI } from '@/lib/ui';

/** Maquetación común de las páginas legales. */
export function LegalPage({
  title,
  locale,
  legal = true,
  children,
}: {
  title: string;
  locale: Locale;
  /** Texto legal: en otros idiomas se avisa de que manda la versión en castellano. */
  legal?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      id="contenido"
      className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc"
    >
      <Link
        href={localePath(locale, '/')}
        className="link-grow text-brand-700 text-sm dark:text-blue-300"
      >
        {UI[locale].back}
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      {legal && locale !== 'es' && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {locale === 'ca'
            ? 'Traducció orientativa: en cas de discrepància, preval la versió en castellà.'
            : 'Courtesy translation: in case of any discrepancy, the Spanish version prevails.'}
        </p>
      )}
      {children}
    </main>
  );
}

/**
 * Dato del titular leído de una variable de entorno. Si falta, se muestra
 * resaltado con el nombre de la variable para que no pase desapercibido.
 */
export function Dato({ value, variable }: { value: string | null; variable: string }) {
  if (value) return <>{value}</>;
  return (
    <mark
      className="rounded bg-amber-200 px-1 text-amber-950"
      title={`Falta la variable de entorno ${variable}`}
    >
      [pendiente: {variable}]
    </mark>
  );
}
