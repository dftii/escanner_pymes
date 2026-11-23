/**
 * Content-Security-Policy de la propia web. Los scripts solo se ejecutan con
 * el nonce de cada petición ('strict-dynamic' deja que esos scripts carguen
 * los trozos de Next). Sin 'unsafe-inline' en scripts: así la herramienta
 * aprueba su propio check de cabeceras.
 */
export function buildCsp(nonce: string, isDev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Next y React inyectan estilos en línea; no ejecutan código.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

/** CSP para las respuestas de la API (no son HTML). */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'";

/** Nonce aleatorio en base64 (funciona en Edge y en Node). */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
