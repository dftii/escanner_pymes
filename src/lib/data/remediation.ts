/**
 * Pasos para arreglar cada problema, en lenguaje llano y por plataforma.
 * Se agrupan por id de hallazgo para poder revisarlos todos en un sitio.
 */
export const REMEDIATION = {
  // ─── SSL ────────────────────────────────────────────────────────────────
  'ssl.no_https': [
    'Activa un certificado SSL gratuito: en cPanel ve a "SSL/TLS Status" o "Let\'s Encrypt"; en Plesk, a "Let\'s Encrypt" en tu dominio.',
    'En Wix y Shopify el certificado es automático: comprueba en el panel que el dominio está bien conectado.',
    'Si no encuentras la opción, pide a tu proveedor de hosting que active "HTTPS con Let\'s Encrypt".',
  ],
  'ssl.untrusted': [
    "Sustituye el certificado por uno de una autoridad reconocida. Let's Encrypt es gratuito y lo ofrecen casi todos los hostings.",
    'En cPanel: "SSL/TLS Status" → "Run AutoSSL". En Plesk: "Let\'s Encrypt" → "Instalar".',
    "Si el certificado lo instaló alguien a mano, pídele que lo renueve con Let's Encrypt y active la renovación automática.",
  ],
  'ssl.chain': [
    'Falta el certificado intermedio. Al instalar el certificado, pega también el "CA bundle" o "cadena" que te dio el emisor.',
    'En cPanel: "SSL/TLS" → "Manage SSL sites" → rellena el campo "Certificate Authority Bundle".',
    "Si usas Let's Encrypt con AutoSSL, vuelve a emitirlo: la cadena se instala sola.",
  ],
  'ssl.expiry': [
    'Renueva el certificado cuanto antes desde el panel de tu hosting.',
    'Activa la renovación automática (AutoSSL en cPanel, "Mantener protegido" en Plesk) para que no vuelva a pasar.',
    'Wix y Shopify lo renuevan solos: si caduca, revisa que el dominio siga apuntando a ellos.',
  ],
  'ssl.hostname': [
    'Vuelve a emitir el certificado incluyendo todos los nombres de tu web (con y sin www).',
    'En cPanel/Plesk, al emitir con Let\'s Encrypt marca la opción de incluir "www".',
    'En Wix y Shopify, conecta ambas versiones del dominio desde el panel de dominios.',
  ],
  'ssl.www': [
    'Incluye la versión con y sin www en el certificado, o haz que una redirija a la otra.',
    'En cPanel/Plesk, emite el certificado de Let\'s Encrypt marcando también "www".',
  ],
  'ssl.protocol': [
    'Pide a tu hosting que desactive TLS 1.0 y 1.1 y deje solo TLS 1.2 y 1.3.',
    'En Plesk: "Herramientas y configuración" → "Configuración de SSL/TLS". En servidores propios, ajusta "ssl_protocols" (nginx) o "SSLProtocol" (Apache).',
  ],
  'ssl.redirect': [
    'Haz que tu web lleve siempre a la versión segura (https).',
    'WordPress: en "Ajustes" → "Generales" pon las dos direcciones con https:// y activa un plugin como "Really Simple SSL".',
    'cPanel: "Dominios" → activa "Forzar redirección HTTPS". Plesk: "Configuración de hosting" → "Redirección permanente 301 de HTTP a HTTPS".',
    'Wix y Shopify lo hacen solos al tener el SSL activo.',
  ],

  // ─── Cabeceras ──────────────────────────────────────────────────────────
  'headers.hsts': [
    'Añade la cabecera: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    'WordPress: plugins como "Really Simple SSL" o "Headers Security Advanced & HSTS WP" la activan con un clic.',
    'cPanel/Apache: en .htaccess añade: Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"',
    'Plesk: "Configuración de hosting" → activa "HSTS". Shopify y Wix ya la envían.',
  ],
  'headers.csp': [
    "Empieza con una política básica y ve ajustándola: Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    'Pruébala primero con "Content-Security-Policy-Report-Only" para no romper nada.',
    'WordPress: el plugin "Headers Security Advanced & HSTS WP" permite configurarla sin tocar código.',
  ],
  'headers.xcto': [
    'Añade la cabecera: X-Content-Type-Options: nosniff',
    'cPanel/Apache: en .htaccess añade: Header always set X-Content-Type-Options "nosniff"',
    'nginx: add_header X-Content-Type-Options "nosniff" always;',
  ],
  'headers.framing': [
    "Añade la cabecera: X-Frame-Options: SAMEORIGIN (o en la CSP: frame-ancestors 'self').",
    'cPanel/Apache: en .htaccess añade: Header always set X-Frame-Options "SAMEORIGIN"',
    'WordPress: los plugins de seguridad (Wordfence, "Headers Security Advanced") la incluyen.',
  ],
  'headers.referrer': [
    'Añade la cabecera: Referrer-Policy: strict-origin-when-cross-origin',
    'cPanel/Apache: en .htaccess añade: Header always set Referrer-Policy "strict-origin-when-cross-origin"',
  ],
  'headers.permissions': [
    'Añade la cabecera: Permissions-Policy: camera=(), microphone=(), geolocation=()',
    'Ajusta la lista si tu web sí usa alguna de esas funciones (por ejemplo, un mapa con tu ubicación).',
  ],
  'headers.disclosure': [
    'Oculta la versión del servidor y del lenguaje: no hace falta anunciar qué software usas.',
    'Apache: "ServerTokens Prod" y "ServerSignature Off". nginx: "server_tokens off;". PHP: "expose_php = Off" en php.ini.',
    'En hosting compartido, pídeselo al proveedor o usa un plugin de seguridad que quite "X-Powered-By".',
  ],
} as const satisfies Record<string, readonly string[]>;

export type RemediationId = keyof typeof REMEDIATION;

export const fixFor = (id: RemediationId): string[] => [...REMEDIATION[id]];
