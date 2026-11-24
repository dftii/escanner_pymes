import { headers } from 'next/headers';
import { jsonLd, SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site';

export const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: '¿Cuánto cuesta?',
    a: 'Nada. El análisis es gratuito y no hace falta registrarse ni dejar ningún dato.',
  },
  {
    q: '¿Es seguro y legal analizar mi web?',
    a: 'Sí. Solo hacemos comprobaciones pasivas, las mismas que haría un navegador o un servidor de correo: no probamos contraseñas ni buscamos fallos de forma agresiva. Analiza solo dominios tuyos o para los que tengas permiso.',
  },
  {
    q: '¿Guardáis mi dominio o el informe?',
    a: 'No. El informe se genera al momento y no se guarda en nuestros servidores. Si pulsas "Guardar en este navegador", se queda solo en tu navegador; y el enlace para compartir lleva el informe dentro de la propia dirección.',
  },
  {
    q: '¿Sustituye a una auditoría de seguridad profesional?',
    a: 'No. Es una revisión rápida de lo más importante y de los fallos más habituales en webs de pequeños negocios. Una auditoría profesional revisa mucho más (código, servidores, contraseñas…). Los resultados sobre cookies y RGPD son orientativos y no son asesoramiento legal.',
  },
  {
    q: 'Me han salido fallos, ¿qué hago?',
    a: 'Cada problema explica por qué importa y cómo arreglarlo paso a paso. Para el correo (SPF y DMARC) te damos el registro exacto para copiar en el panel de tu dominio. Si no te ves con ello, copia el resumen o el enlace del informe y pásaselo a tu informático o a tu empresa de hosting.',
  },
  {
    q: '¿Cada cuánto debería revisar mi web?',
    a: 'Después de cualquier cambio (nuevo diseño, cambio de hosting o de correo) y, como mínimo, cada pocos meses: los certificados caducan y los gestores de contenidos se quedan desactualizados sin avisar.',
  },
];

/** Preguntas frecuentes, con datos estructurados para buscadores (JSON-LD). */
export async function Faq() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: siteUrl(),
      description: SITE_DESCRIPTION,
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web',
      inLanguage: 'es-ES',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];
  return (
    <section aria-labelledby="faq-titulo" className="reveal print:hidden">
      <h2 id="faq-titulo" className="text-xl font-semibold">
        Preguntas frecuentes
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {FAQ.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{q}</span>
              <span
                aria-hidden="true"
                className="text-slate-500 transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm text-slate-700 dark:text-slate-300">{a}</p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
      />
    </section>
  );
}
