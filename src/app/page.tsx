import { CATEGORY_LABELS, type Category } from '@/lib/types';

const CATEGORY_HINTS: Record<Category, string> = {
  ssl: 'Si el candado de tu web es válido y cuándo caduca.',
  headers: 'Protecciones básicas que el navegador aplica a tu web.',
  email: 'Si alguien podría enviar correos haciéndose pasar por ti.',
  privacy: 'Si tu web pide permiso antes de instalar cookies.',
};

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-brand-700 text-sm font-semibold tracking-wide uppercase dark:text-blue-300">
          Escáner Pymes
        </p>
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">
          Comprueba en un minuto si la web de tu negocio está bien protegida
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          Escribe tu dominio y te damos un informe claro, sin tecnicismos y con los pasos para
          arreglar cada problema.
        </p>
      </header>

      <section
        aria-labelledby="proximamente"
        className="border-brand-600/30 bg-brand-50 rounded-2xl border p-6 dark:border-blue-400/30 dark:bg-slate-900"
      >
        <h2 id="proximamente" className="text-lg font-semibold">
          En construcción
        </h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          El formulario de análisis estará disponible muy pronto.
        </p>
      </section>

      <section aria-labelledby="que-revisamos">
        <h2 id="que-revisamos" className="text-xl font-semibold">
          Qué revisamos
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
            <li
              key={category}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <h3 className="font-medium">{CATEGORY_LABELS[category]}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {CATEGORY_HINTS[category]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
        Solo hacemos comprobaciones pasivas, las mismas que haría un navegador. No guardamos los
        dominios que analizas.
      </footer>
    </main>
  );
}
