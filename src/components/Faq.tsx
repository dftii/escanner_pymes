import { LOCALE_TAGS, localePath, type Locale } from '@/lib/i18n';
import { SITE_DESCRIPTIONS } from '@/lib/pageMeta';
import { jsonLd, SITE_NAME, siteUrl } from '@/lib/site';
import { UI } from '@/lib/ui';

export const FAQ: Record<Locale, ReadonlyArray<{ q: string; a: string }>> = {
  es: [
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
  ],
  ca: [
    {
      q: 'Quant costa?',
      a: "Res. L'anàlisi és gratuïta i no cal registrar-se ni deixar cap dada.",
    },
    {
      q: 'És segur i legal analitzar el meu web?',
      a: 'Sí. Només fem comprovacions passives, les mateixes que faria un navegador o un servidor de correu: no provem contrasenyes ni busquem errors de manera agressiva. Analitza només dominis teus o per als quals tinguis permís.',
    },
    {
      q: "Deseu el meu domini o l'informe?",
      a: "No. L'informe es genera al moment i no es desa als nostres servidors. Si prems \"Desar en aquest navegador\", es queda només al teu navegador; i l'enllaç per compartir porta l'informe dins de la mateixa adreça.",
    },
    {
      q: 'Substitueix una auditoria de seguretat professional?',
      a: 'No. És una revisió ràpida del més important i dels errors més habituals en webs de petits negocis. Una auditoria professional revisa molt més (codi, servidors, contrasenyes…). Els resultats sobre galetes i RGPD són orientatius i no són assessorament legal.',
    },
    {
      q: "M'han sortit errors, què faig?",
      a: "Cada problema explica per què és important i com arreglar-lo pas a pas. Per al correu (SPF i DMARC) et donem el registre exacte per copiar al tauler del teu domini. Si no t'hi veus capaç, copia el resum o l'enllaç de l'informe i passa'l al teu informàtic o a la teva empresa d'allotjament.",
    },
    {
      q: 'Cada quant hauria de revisar el meu web?',
      a: "Després de qualsevol canvi (disseny nou, canvi d'allotjament o de correu) i, com a mínim, cada pocs mesos: els certificats caduquen i els gestors de continguts queden desactualitzats sense avisar.",
    },
  ],
  en: [
    {
      q: 'How much does it cost?',
      a: 'Nothing. The scan is free and you do not need to sign up or leave any details.',
    },
    {
      q: 'Is it safe and legal to scan my website?',
      a: 'Yes. We only run passive checks, the same a browser or mail server would: we do not try passwords or probe for flaws aggressively. Only scan domains you own or have permission to scan.',
    },
    {
      q: 'Do you store my domain or the report?',
      a: 'No. The report is generated on the spot and is not stored on our servers. If you click "Save in this browser", it stays only in your browser; and the share link carries the report inside the address itself.',
    },
    {
      q: 'Does it replace a professional security audit?',
      a: 'No. It is a quick review of the most important points and the most common problems on small business websites. A professional audit covers much more (code, servers, passwords…). The cookie and GDPR results are a guide only and are not legal advice.',
    },
    {
      q: 'I got some failures. What should I do?',
      a: 'Each problem explains why it matters and how to fix it step by step. For email (SPF and DMARC) we give you the exact record to copy into your domain dashboard. If you are not confident doing it, copy the summary or the report link and send it to your IT person or hosting company.',
    },
    {
      q: 'How often should I check my website?',
      a: 'After any change (new design, new host or email provider) and at least every few months: certificates expire and content management systems fall out of date without warning.',
    },
  ],
};

/**
 * Preguntas frecuentes, con datos estructurados para buscadores (JSON-LD).
 * El JSON-LD es un bloque de datos que el navegador no ejecuta, así que la CSP
 * no le aplica y no necesita nonce.
 */
export function Faq({ locale }: { locale: Locale }) {
  const items = FAQ[locale];
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${siteUrl()}${localePath(locale, '/') === '/' ? '' : localePath(locale, '/')}`,
      description: SITE_DESCRIPTIONS[locale],
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web',
      inLanguage: LOCALE_TAGS[locale],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];
  return (
    <section aria-labelledby="faq-titulo" className="reveal print:hidden">
      <h2 id="faq-titulo" className="text-xl font-semibold">
        {UI[locale].faqTitle}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {items.map(({ q, a }) => (
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    </section>
  );
}
