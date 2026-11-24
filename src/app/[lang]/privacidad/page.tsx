import type { Metadata } from 'next';
import { Dato, LegalPage } from '@/components/LegalPage';
import type { Locale } from '@/lib/i18n';
import { getLegalInfo, LEGAL_ENV_VARS as V } from '@/lib/legal';
import { localeFrom, pageMetadata } from '@/lib/pageMeta';

type Props = { params: Promise<{ lang: string }> };

const TITLE: Record<Locale, string> = {
  es: 'Política de privacidad',
  ca: 'Política de privadesa',
  en: 'Privacy policy',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  return pageMetadata(locale, '/privacidad', { title: TITLE[locale] });
}

export default async function Privacidad({ params }: Props) {
  const locale = await localeFrom(params);
  const legal = getLegalInfo();
  const name = <Dato value={legal.nombre} variable={V.nombre} />;
  const nif = <Dato value={legal.nif} variable={V.nif} />;
  const email = <Dato value={legal.email} variable={V.email} />;
  return (
    <LegalPage title={TITLE[locale]} locale={locale}>
      {locale === 'es' && (
        <>
          <p>
            Esta política explica qué datos trata Escáner Pymes, conforme al Reglamento (UE)
            2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).
          </p>
          <h2>Responsable</h2>
          <p>
            {name}, con NIF {nif} y contacto en {email}.
          </p>
          <h2>Qué datos tratamos</h2>
          <ul>
            <li>
              <strong>El dominio que escribes</strong>: se usa solo durante el análisis para generar
              el informe. No se guarda ni se registra.
            </li>
            <li>
              <strong>Tu dirección IP</strong>: para limitar el número de análisis (5 cada 10
              minutos) se guarda un resumen cifrado e irreversible (hash con sal) durante 10
              minutos. Nunca se guarda la IP en claro.
            </li>
          </ul>
          <p>No pedimos registro, no usamos cookies de seguimiento y no creamos perfiles.</p>
          <p>
            Si pulsas “Guardar en este navegador”, el informe se guarda solo en tu navegador;
            nosotros no lo recibimos. “Enviar por email” abre tu propio programa de correo con el
            resumen: el email no pasa por nuestros servidores.
          </p>
          <h2>Finalidad y base legal</h2>
          <p>
            Prestar el servicio que solicitas y protegerlo frente a abusos, sobre la base del
            interés legítimo (art. 6.1.f RGPD) en mantener un servicio gratuito, seguro y
            disponible.
          </p>
          <h2>Destinatarios</h2>
          <p>
            La web se aloja en {legal.hosting}, que actúa como encargado del tratamiento.
            {legal.upstash &&
              ' El resumen cifrado de la IP se guarda temporalmente en Upstash, Inc., también como encargado del tratamiento.'}{' '}
            Para comprobar si la web analizada aparece en filtraciones públicas, se consulta su
            nombre de dominio (nunca tu IP ni datos personales) en Have I Been Pwned. No se ceden
            datos a terceros.
          </p>
          <h2>Tus derechos</h2>
          <p>
            Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y
            portabilidad escribiendo a {email}. Si crees que no hemos atendido bien tu solicitud,
            puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
          </p>
        </>
      )}
      {locale === 'ca' && (
        <>
          <p>
            Aquesta política explica quines dades tracta Escáner Pymes, d&apos;acord amb el
            Reglament (UE) 2016/679 (RGPD) i la Llei orgànica 3/2018 (LOPDGDD).
          </p>
          <h2>Responsable</h2>
          <p>
            {name}, amb NIF {nif} i contacte a {email}.
          </p>
          <h2>Quines dades tractem</h2>
          <ul>
            <li>
              <strong>El domini que escrius</strong>: es fa servir només durant l&apos;anàlisi per
              generar l&apos;informe. No es desa ni es registra.
            </li>
            <li>
              <strong>La teva adreça IP</strong>: per limitar el nombre d&apos;anàlisis (5 cada 10
              minuts) es desa un resum xifrat i irreversible (hash amb sal) durant 10 minuts. Mai no
              es desa la IP en clar.
            </li>
          </ul>
          <p>No demanem registre, no fem servir galetes de seguiment i no creem perfils.</p>
          <p>
            Si prems “Desar en aquest navegador”, l&apos;informe es desa només al teu navegador;
            nosaltres no el rebem. “Enviar per correu” obre el teu propi programa de correu amb el
            resum: el correu no passa pels nostres servidors.
          </p>
          <h2>Finalitat i base legal</h2>
          <p>
            Prestar el servei que sol·licites i protegir-lo contra abusos, sobre la base de
            l&apos;interès legítim (art. 6.1.f RGPD) a mantenir un servei gratuït, segur i
            disponible.
          </p>
          <h2>Destinataris</h2>
          <p>
            El web s&apos;allotja a {legal.hosting}, que actua com a encarregat del tractament.
            {legal.upstash &&
              ' El resum xifrat de la IP es desa temporalment a Upstash, Inc., també com a encarregat del tractament.'}{' '}
            Per comprovar si el web analitzat apareix en filtracions públiques, es consulta el seu
            nom de domini (mai la teva IP ni dades personals) a Have I Been Pwned. No es cedeixen
            dades a tercers.
          </p>
          <h2>Els teus drets</h2>
          <p>
            Pots exercir els drets d&apos;accés, rectificació, supressió, oposició, limitació i
            portabilitat escrivint a {email}. Si creus que no hem atès bé la teva sol·licitud, pots
            reclamar davant l&apos;Agència Espanyola de Protecció de Dades (aepd.es).
          </p>
        </>
      )}
      {locale === 'en' && (
        <>
          <p>
            This policy explains what data Escáner Pymes processes, in accordance with Regulation
            (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD).
          </p>
          <h2>Controller</h2>
          <p>
            {name}, tax ID {nif}, contact: {email}.
          </p>
          <h2>What data we process</h2>
          <ul>
            <li>
              <strong>The domain you type</strong>: it is used only during the scan to produce the
              report. It is not stored or logged.
            </li>
            <li>
              <strong>Your IP address</strong>: to limit the number of scans (5 every 10 minutes),
              an encrypted, irreversible digest (salted hash) is kept for 10 minutes. The IP itself
              is never stored.
            </li>
          </ul>
          <p>We do not require sign-up, use tracking cookies or build profiles.</p>
          <p>
            If you click “Save in this browser”, the report is stored only in your browser; we never
            receive it. “Send by email” opens your own email program with the summary: the email
            does not go through our servers.
          </p>
          <h2>Purpose and legal basis</h2>
          <p>
            Providing the service you request and protecting it from abuse, on the basis of
            legitimate interest (art. 6.1.f GDPR) in keeping a free, secure and available service.
          </p>
          <h2>Recipients</h2>
          <p>
            The website is hosted by {legal.hosting}, acting as data processor.
            {legal.upstash &&
              ' The encrypted IP digest is stored temporarily with Upstash, Inc., also as data processor.'}{' '}
            To check whether the scanned website appears in public breaches, its domain name (never
            your IP or personal data) is looked up on Have I Been Pwned. No data is passed on to
            third parties.
          </p>
          <h2>Your rights</h2>
          <p>
            You can exercise your rights of access, rectification, erasure, objection, restriction
            and portability by writing to {email}. If you believe we have not handled your request
            properly, you can complain to the Spanish Data Protection Agency (aepd.es).
          </p>
        </>
      )}
    </LegalPage>
  );
}
