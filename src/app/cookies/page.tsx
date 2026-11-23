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
        Tampoco usamos otras tecnologías de almacenamiento en tu navegador (localStorage o
        similares) ni cargamos scripts de terceros.
      </p>
      <p>
        Si en el futuro añadimos alguna cookie, actualizaremos esta página y, si no es técnica, te
        pediremos permiso antes de instalarla, tal como exige el artículo 22.2 de la LSSI-CE.
      </p>
    </LegalPage>
  );
}
