import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Escáner Pymes · Revisa la seguridad de tu web',
  description:
    'Informe gratuito y automático sobre el certificado SSL, las cabeceras de seguridad, la protección del correo y las cookies de la web de tu negocio.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Leer las cabeceras hace la página dinámica: Next aplica así el nonce de la CSP
  // (lo pone el middleware) a sus propios scripts en cada petición.
  await headers();

  return (
    <html lang="es-ES">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900"
        >
          Saltar al contenido
        </a>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 px-4 py-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-400 print:hidden">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Comprobaciones pasivas. No guardamos los dominios que analizas ni usamos cookies de
              seguimiento.
            </p>
            <nav aria-label="Información legal" className="flex gap-4">
              <Link href="/glosario" className="link-grow">
                Glosario
              </Link>
              <Link href="/aviso-legal" className="link-grow">
                Aviso legal
              </Link>
              <Link href="/privacidad" className="link-grow">
                Privacidad
              </Link>
              <Link href="/cookies" className="link-grow">
                Cookies
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
