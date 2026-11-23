import type { Metadata } from 'next';
import { Dato, LegalPage } from '@/components/LegalPage';
import { getLegalInfo, LEGAL_ENV_VARS as V } from '@/lib/legal';

export const metadata: Metadata = { title: 'Política de privacidad · Escáner Pymes' };

export default function Privacidad() {
  const legal = getLegalInfo();
  return (
    <LegalPage title="Política de privacidad">
      <p>
        Esta política explica qué datos trata Escáner Pymes, conforme al Reglamento (UE) 2016/679
        (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>Responsable</h2>
      <p>
        <Dato value={legal.nombre} variable={V.nombre} />, con NIF{' '}
        <Dato value={legal.nif} variable={V.nif} /> y contacto en{' '}
        <Dato value={legal.email} variable={V.email} />.
      </p>

      <h2>Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>El dominio que escribes</strong>: se usa solo durante el análisis para generar el
          informe. No se guarda ni se registra.
        </li>
        <li>
          <strong>Tu dirección IP</strong>: para limitar el número de análisis (5 cada 10 minutos)
          se guarda un resumen cifrado e irreversible (hash con sal) durante 10 minutos. Nunca se
          guarda la IP en claro.
        </li>
      </ul>
      <p>No pedimos registro, no usamos cookies de seguimiento y no creamos perfiles.</p>

      <h2>Finalidad y base legal</h2>
      <p>
        Prestar el servicio que solicitas y protegerlo frente a abusos, sobre la base del interés
        legítimo (art. 6.1.f RGPD) en mantener un servicio gratuito, seguro y disponible.
      </p>

      <h2>Destinatarios</h2>
      <p>
        La web se aloja en {legal.hosting}, que actúa como encargado del tratamiento.
        {legal.upstash &&
          ' El resumen cifrado de la IP se guarda temporalmente en Upstash, Inc., también como encargado del tratamiento.'}{' '}
        No se ceden datos a terceros.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y
        portabilidad escribiendo a <Dato value={legal.email} variable={V.email} />. Si crees que no
        hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de
        Datos (aepd.es).
      </p>
    </LegalPage>
  );
}
