import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Política de cookies · Escáner Pymes' };

export default function Cookies() {
  return (
    <LegalPage title="Política de cookies">
      <p>
        Escáner Pymes <strong>no instala cookies</strong>: ni de analítica, ni de publicidad, ni
        técnicas. Por eso no verás ningún banner de cookies.
      </p>
      <p>
        Tampoco cargamos scripts de terceros. La única vez que guardamos algo en tu navegador es
        cuando tú pulsas <strong>“Guardar en este navegador”</strong> en un informe: entonces se
        guarda ese informe en el almacenamiento local (localStorage) de tu navegador para que puedas
        volver a verlo y comparar la evolución. No sale de tu equipo, no lo vemos nosotros y no
        sirve para seguirte.
      </p>
      <p>
        Al ser algo que pides expresamente, está exento de consentimiento (artículo 22.2 de la
        LSSI-CE). Puedes borrarlo cuando quieras con “Borrar” o “Borrar todo el historial”, o
        borrando los datos del sitio en tu navegador.
      </p>
      <p>
        Si en el futuro añadimos alguna cookie, actualizaremos esta página y, si no es técnica, te
        pediremos permiso antes de instalarla, tal como exige el artículo 22.2 de la LSSI-CE.
      </p>
    </LegalPage>
  );
}
