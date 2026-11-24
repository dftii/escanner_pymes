import { CheckMarquee } from '@/components/CheckMarquee';
import { GlossaryText } from '@/components/Glossary';
import { Scribble, stagger } from '@/components/Motion';
import { Scanner } from '@/components/Scanner';
import { CATEGORY_LABELS, type Category } from '@/lib/types';

const CATEGORY_ICONS: Record<Category, string> = {
  ssl: '🔒',
  headers: '🛡️',
  email: '✉️',
  privacy: '🍪',
};

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
      <header className="relative isolate flex flex-col gap-4 print:hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <span className="blob absolute -top-10 -left-16 size-56 rounded-full bg-blue-200/50 [--dx:40px] [--dy:24px] dark:bg-blue-900/30" />
          <span className="blob absolute top-4 right-4 size-48 rounded-full bg-amber-200/50 [--dx:-36px] [--dy:30px] dark:bg-amber-900/20" />
        </div>
        <p
          className="rise-in text-brand-700 text-sm font-semibold tracking-wide uppercase dark:text-blue-300"
          style={stagger(0)}
        >
          Escáner Pymes
        </p>
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">
          Comprueba en un minuto si la web de tu negocio está{' '}
          <span className="relative inline-block whitespace-nowrap">
            bien protegida
            <Scribble className="text-amber-400 dark:text-amber-500" />
          </span>
        </h1>
        <p className="rise-in text-lg text-slate-700 dark:text-slate-300" style={stagger(2)}>
          Escribe tu dominio y te damos un informe claro, sin tecnicismos y con los pasos para
          arreglar cada problema. Gratis y sin registrarte.
        </p>
        <div className="rise-in" style={stagger(3)}>
          <CheckMarquee />
        </div>
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
              className="bouncy reveal wiggle-hover rounded-xl border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
            >
              <h3 className="flex items-center gap-2 font-medium">
                <span aria-hidden="true" className="wiggle-target inline-block text-xl">
                  {CATEGORY_ICONS[category]}
                </span>
                {CATEGORY_LABELS[category]}
              </h3>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                <GlossaryText text={CATEGORY_HINTS[category]} />
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
