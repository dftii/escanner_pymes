import type { Metadata, Viewport } from 'next';
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-ES">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
