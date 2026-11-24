import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from './lib/csp';
import { DEFAULT_LOCALE, LOCALES } from './lib/i18n';

/** Rutas que no son páginas (ficheros y metadatos generados): sin idioma. */
const NOT_A_PAGE =
  /^\/(robots\.txt|sitemap\.xml|icon\.svg|opengraph-image[^/]*)(\/|$)|\.[a-z0-9]+$/i;
const PREFIXED = new RegExp(`^/(${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join('|')})(/|$)`);
const DEFAULT_PREFIX = new RegExp(`^/${DEFAULT_LOCALE}(/|$)`);

/**
 * Genera un nonce por petición y la CSP que lo usa. Next lee la CSP de la
 * cabecera de la petición y aplica el nonce a sus scripts al renderizar.
 *
 * Idiomas: el español va sin prefijo (`/glosario`) y se sirve por dentro desde
 * `/es/...`; catalán e inglés llevan prefijo (`/ca`, `/en`). Quien entra por
 * `/es/...` se redirige a la versión sin prefijo, para no duplicar páginas.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (DEFAULT_PREFIX.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(DEFAULT_PREFIX, '/');
    return NextResponse.redirect(url, 308);
  }
  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const page = !NOT_A_PAGE.test(pathname);
  let response: NextResponse;
  if (page && !PREFIXED.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
