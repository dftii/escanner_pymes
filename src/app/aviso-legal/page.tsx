import type { Metadata } from 'next';
import { LegalPage, Placeholder } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Aviso legal · Escáner Pymes' };

export default function AvisoLegal() {
  return (
    <LegalPage title="Aviso legal">
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
        información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de este
        sitio web:
      </p>
      <ul>
        <li>
          Titular: <Placeholder>nombre o razón social</Placeholder>
        </li>
        <li>
          NIF/CIF: <Placeholder>NIF</Placeholder>
        </li>
        <li>
          Domicilio: <Placeholder>dirección postal</Placeholder>
        </li>
        <li>
          Email de contacto: <Placeholder>email</Placeholder>
        </li>
        <li>
          Datos registrales: <Placeholder>si procede</Placeholder>
        </li>
      </ul>

      <h2>Objeto</h2>
      <p>
        Escáner Pymes es una herramienta gratuita que realiza comprobaciones pasivas sobre un
        dominio (certificado SSL, cabeceras de seguridad, configuración del correo y cookies) y
        genera un informe orientativo.
      </p>

      <h2>Uso responsable</h2>
      <p>
        Solo debes analizar dominios que sean tuyos o para los que tengas permiso. Las
        comprobaciones son las mismas que haría un navegador o un servidor de correo, sin pruebas
        intrusivas.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El informe es orientativo y puede contener errores u omisiones. En particular, los
        resultados sobre cookies y RGPD no sustituyen el asesoramiento legal. El titular no se
        responsabiliza de las decisiones que se tomen a partir de él.
      </p>
    </LegalPage>
  );
}
