import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad de la propia herramienta: tiene que aprobar su
 * propio escáner. La CSP de las páginas la pone `src/middleware.ts` (con un
 * nonce por petición); la de la API, al no ser HTML, es fija.
 *
 * API_CSP es igual que en src/lib/csp.ts (un test lo comprueba). Sin imports
 * locales: next.config se carga antes de compilar el proyecto.
 */
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // playwright-core se carga solo con ENABLE_HEADLESS=true y no debe empaquetarse.
  serverExternalPackages: ['playwright-core'],
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
    ];
  },
};

export default nextConfig;
