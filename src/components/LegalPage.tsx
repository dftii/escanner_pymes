import Link from 'next/link';

/** Maquetación común de las páginas legales. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main
      id="contenido"
      className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc"
    >
      <Link href="/" className="text-brand-700 text-sm underline dark:text-blue-300">
        ← Volver al escáner
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
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
