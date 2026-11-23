import { Scanner } from '@/components/Scanner';
import { CATEGORY_LABELS, type Category } from '@/lib/types';

const CATEGORY_HINTS: Record<Category, string> = {
  ssl: 'Si el candado de tu web es válido, cuándo caduca y si la versión sin cifrar lleva a la segura.',
  headers: 'Protecciones básicas que el navegador aplica a tu web.',
  email:
    'Si alguien podría enviar correos haciéndose pasar por ti y si tus emails están a la vista de robots.',
  privacy:
    'Si tu web pide permiso antes de instalar cookies y si tiene aviso legal y política de privacidad.',
};

export default function Home() {
  return (
    <main id="contenido" className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-4 print:hidden">
        <p className="text-brand-700 text-sm font-semibold tracking-wide uppercase dark:text-blue-300">
          Escáner Pymes
        </p>
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">
          Comprueba en un minuto si la web de tu negocio está bien protegida
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">
          Escribe tu dominio y te damos un informe claro, sin tecnicismos y con los pasos para
          arreglar cada problema. Gratis y sin registrarte.
        </p>
      </header>

      <Scanner />

      <section aria-labelledby="que-revisamos" className="print:hidden">
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
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                {CATEGORY_HINTS[category]}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
