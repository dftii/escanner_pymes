import type { Metadata } from 'next';
import { Dato, LegalPage } from '@/components/LegalPage';
import type { Locale } from '@/lib/i18n';
import { getLegalInfo, LEGAL_ENV_VARS as V } from '@/lib/legal';
import { localeFrom, pageMetadata } from '@/lib/pageMeta';

type Props = { params: Promise<{ lang: string }> };

const TITLE: Record<Locale, string> = { es: 'Aviso legal', ca: 'Avís legal', en: 'Legal notice' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  return pageMetadata(locale, '/aviso-legal', { title: TITLE[locale] });
}

export default async function AvisoLegal({ params }: Props) {
  const locale = await localeFrom(params);
  const legal = getLegalInfo();
  const owner = (labels: [string, string, string, string]) => (
    <ul>
      <li>
        {labels[0]}: <Dato value={legal.nombre} variable={V.nombre} />
      </li>
      <li>
        {labels[1]}: <Dato value={legal.nif} variable={V.nif} />
      </li>
      <li>
        {labels[2]}: <Dato value={legal.domicilio} variable={V.domicilio} />
      </li>
      <li>
        {labels[3]}: <Dato value={legal.email} variable={V.email} />
      </li>
    </ul>
  );
  return (
    <LegalPage title={TITLE[locale]} locale={locale}>
      {locale === 'es' && (
        <>
          <p>
            En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
            información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de
            este sitio web:
          </p>
          {owner(['Titular', 'NIF', 'Domicilio', 'Email de contacto'])}
          <h2>Objeto</h2>
          <p>
            Escáner Pymes es una herramienta gratuita que realiza comprobaciones pasivas sobre un
            dominio (certificado SSL, cabeceras de seguridad, configuración del correo y cookies) y
            genera un informe orientativo.
          </p>
          <h2>Uso responsable</h2>
          <p>
            Solo debes analizar dominios que sean tuyos o para los que tengas permiso. Las
            comprobaciones son las mismas que haría un navegador o un servidor de correo, sin
            pruebas intrusivas.
          </p>
          <h2>Responsabilidad</h2>
          <p>
            El informe es orientativo y puede contener errores u omisiones. En particular, los
            resultados sobre cookies y RGPD no sustituyen el asesoramiento legal. El titular no se
            responsabiliza de las decisiones que se tomen a partir de él.
          </p>
        </>
      )}
      {locale === 'ca' && (
        <>
          <p>
            En compliment de l&apos;article 10 de la Llei 34/2002, de serveis de la societat de la
            informació i de comerç electrònic (LSSI-CE), s&apos;informa de les dades del titular
            d&apos;aquest lloc web:
          </p>
          {owner(['Titular', 'NIF', 'Domicili', 'Correu de contacte'])}
          <h2>Objecte</h2>
          <p>
            Escáner Pymes és una eina gratuïta que fa comprovacions passives sobre un domini
            (certificat SSL, capçaleres de seguretat, configuració del correu i galetes) i genera un
            informe orientatiu.
          </p>
          <h2>Ús responsable</h2>
          <p>
            Només has d&apos;analitzar dominis que siguin teus o per als quals tinguis permís. Les
            comprovacions són les mateixes que faria un navegador o un servidor de correu, sense
            proves intrusives.
          </p>
          <h2>Responsabilitat</h2>
          <p>
            L&apos;informe és orientatiu i pot contenir errors o omissions. En particular, els
            resultats sobre galetes i RGPD no substitueixen l&apos;assessorament legal. El titular
            no es fa responsable de les decisions que es prenguin a partir d&apos;aquest informe.
          </p>
        </>
      )}
      {locale === 'en' && (
        <>
          <p>
            In accordance with article 10 of Spanish Law 34/2002 on information society services and
            electronic commerce (LSSI-CE), the details of the owner of this website are:
          </p>
          {owner(['Owner', 'Tax ID (NIF)', 'Address', 'Contact email'])}
          <h2>Purpose</h2>
          <p>
            Escáner Pymes is a free tool that runs passive checks on a domain (SSL certificate,
            security headers, email configuration and cookies) and produces a report for guidance.
          </p>
          <h2>Responsible use</h2>
          <p>
            Only scan domains you own or have permission to scan. The checks are the same a browser
            or mail server would make, with no intrusive testing.
          </p>
          <h2>Liability</h2>
          <p>
            The report is for guidance only and may contain errors or omissions. In particular, the
            cookie and GDPR results are not legal advice. The owner is not responsible for decisions
            made on the basis of the report.
          </p>
        </>
      )}
    </LegalPage>
  );
}
