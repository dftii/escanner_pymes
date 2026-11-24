import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import type { Locale } from '@/lib/i18n';
import { localeFrom, pageMetadata } from '@/lib/pageMeta';

type Props = { params: Promise<{ lang: string }> };

const TITLE: Record<Locale, string> = {
  es: 'Política de cookies',
  ca: 'Política de galetes',
  en: 'Cookie policy',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  return pageMetadata(locale, '/cookies', { title: TITLE[locale] });
}

export default async function Cookies({ params }: Props) {
  const locale = await localeFrom(params);
  return (
    <LegalPage title={TITLE[locale]} locale={locale}>
      {locale === 'es' && (
        <>
          <p>
            Escáner Pymes <strong>no instala cookies</strong>: ni de analítica, ni de publicidad, ni
            técnicas. Por eso no verás ningún banner de cookies.
          </p>
          <p>
            Tampoco cargamos scripts de terceros. La única vez que guardamos algo en tu navegador es
            cuando tú pulsas <strong>“Guardar en este navegador”</strong> en un informe: entonces se
            guarda ese informe en el almacenamiento local (localStorage) de tu navegador para que
            puedas volver a verlo y comparar la evolución. No sale de tu equipo, no lo vemos
            nosotros y no sirve para seguirte.
          </p>
          <p>
            Al ser algo que pides expresamente, está exento de consentimiento (artículo 22.2 de la
            LSSI-CE). Puedes borrarlo cuando quieras con “Borrar” o “Borrar todo el historial”, o
            borrando los datos del sitio en tu navegador.
          </p>
          <p>El idioma de la web va en la propia dirección (/ca, /en), no en una cookie.</p>
          <p>
            Si en el futuro añadimos alguna cookie, actualizaremos esta página y, si no es técnica,
            te pediremos permiso antes de instalarla, tal como exige el artículo 22.2 de la LSSI-CE.
          </p>
        </>
      )}
      {locale === 'ca' && (
        <>
          <p>
            Escáner Pymes <strong>no instal·la galetes</strong>: ni d&apos;analítica, ni de
            publicitat, ni tècniques. Per això no veuràs cap bàner de galetes.
          </p>
          <p>
            Tampoc no carreguem scripts de tercers. L&apos;única vegada que desem alguna cosa al teu
            navegador és quan tu prems <strong>“Desar en aquest navegador”</strong> en un informe:
            aleshores es desa aquest informe a l&apos;emmagatzematge local (localStorage) del teu
            navegador perquè el puguis tornar a veure i comparar-ne l&apos;evolució. No surt del teu
            equip, no el veiem nosaltres i no serveix per seguir-te.
          </p>
          <p>
            Com que ho demanes expressament, està exempt de consentiment (article 22.2 de la
            LSSI-CE). Ho pots esborrar quan vulguis amb “Esborrar” o “Esborrar tot
            l&apos;historial”, o esborrant les dades del lloc al teu navegador.
          </p>
          <p>L&apos;idioma del web va a la mateixa adreça (/ca, /en), no en una galeta.</p>
          <p>
            Si en el futur hi afegim alguna galeta, actualitzarem aquesta pàgina i, si no és
            tècnica, et demanarem permís abans d&apos;instal·lar-la, tal com exigeix l&apos;article
            22.2 de la LSSI-CE.
          </p>
        </>
      )}
      {locale === 'en' && (
        <>
          <p>
            Escáner Pymes <strong>sets no cookies</strong>: no analytics, no advertising and no
            technical cookies. That is why you will not see any cookie banner.
          </p>
          <p>
            We do not load third-party scripts either. The only time we store anything in your
            browser is when you click <strong>“Save in this browser”</strong> on a report: that
            report is then kept in your browser’s local storage (localStorage) so you can view it
            again and track progress. It never leaves your device, we never see it and it cannot be
            used to track you.
          </p>
          <p>
            As it is something you explicitly request, it is exempt from consent (article 22.2 of
            the Spanish LSSI-CE). You can delete it at any time with “Delete” or “Clear all
            history”, or by clearing the site data in your browser.
          </p>
          <p>The website language is part of the address (/ca, /en), not a cookie.</p>
          <p>
            If we ever add a cookie, we will update this page and, if it is not technical, ask for
            your permission before setting it, as required by article 22.2 of the LSSI-CE.
          </p>
        </>
      )}
    </LegalPage>
  );
}
