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

  // ─── Correo ─────────────────────────────────────────────────────────────
  'email.spf': [
    'Crea un registro TXT en el dominio (no en "www") con los servidores que envían tu correo y que termine en "-all" o "~all".',
    'Google Workspace: v=spf1 include:_spf.google.com ~all · Microsoft 365: v=spf1 include:spf.protection.outlook.com -all',
    'Correo del hosting (cPanel): "Correo electrónico" → "Entregabilidad del correo" → "Reparar" en SPF. Plesk: "Configuración DNS" del dominio.',
    'Si el dominio no envía correo: v=spf1 -all',
  ],
  'email.spf_multiple': [
    'Junta todos los registros que empiezan por "v=spf1" en uno solo, con todos los "include" y un único "-all" o "~all" al final.',
    'Ejemplo: v=spf1 include:_spf.google.com include:servers.mcsv.net ~all',
  ],
  'email.spf_lookups': [
    'Quita los "include" de servicios que ya no uses (antiguos boletines, CRM, hosting anterior).',
    'Sustituye "a" y "mx" por las IP concretas (ip4:…) si son pocas.',
    'Si aun así no llega, un servicio de "SPF flattening" puede resumirlo; pide ayuda a quien gestione tu dominio.',
  ],
  'email.spf_softfail': [
    'Cuando DMARC esté en "quarantine" o "reject", "~all" es suficiente.',
    'Si no tienes DMARC, cambia el final a "-all" una vez comprobado que todos tus envíos legítimos están incluidos.',
  ],
  'email.dmarc': [
    'Crea un registro TXT en "_dmarc.tudominio.es" con: v=DMARC1; p=none; rua=mailto:dmarc@tudominio.es',
    'Revisa los informes 2-4 semanas y, si tu correo legítimo pasa, sube a "p=quarantine" y después a "p=reject".',
    'Google Workspace, Microsoft 365, cPanel ("Entregabilidad del correo") y la mayoría de paneles DNS permiten añadirlo en minutos.',
  ],
  'email.dmarc_none': [
    'Revisa los informes DMARC (servicios gratuitos como dmarcian o Postmark los resumen) para confirmar que tus envíos legítimos pasan.',
    'Cambia la política a "p=quarantine" y, tras unas semanas sin problemas, a "p=reject".',
    'Quita "pct=" o ponlo a 100 para que se aplique a todos los correos.',
  ],
  'email.dkim': [
    'Activa la firma DKIM en tu proveedor de correo y publica el registro que te indique.',
    'Google Workspace: Consola de administración → Gmail → "Autenticar correo electrónico". Microsoft 365: Defender → "DKIM".',
    'cPanel: "Correo electrónico" → "Entregabilidad del correo". Plesk: "Configuración de correo" → "Usar DKIM".',
  ],
  'email.exposed': [
    'Usa un formulario de contacto en lugar de mostrar la dirección, o muestra solo un buzón genérico (info@, contacto@).',
    'Cloudflare (plan gratis): activa "Email Address Obfuscation" en "Scrape Shield".',
    'WordPress: plugins como "Email Address Encoder" ocultan las direcciones a los robots sin que lo noten tus clientes.',
    'Evita publicar direcciones personales (nombre.apellido@) o de Gmail/Hotmail: usa una de tu dominio.',
  ],

  // ─── Cookies y RGPD ─────────────────────────────────────────────────────
  'privacy.cookies': [
    'Instala un gestor de consentimiento (CMP) que bloquee estas cookies hasta que el usuario pulse "Aceptar".',
    'WordPress: Complianz, CookieYes o Cookiebot bloquean los scripts automáticamente. Shopify y Wix tienen banner propio en el panel.',
    'Si la cookie la pone tu propio servidor o un plugin, configúralo para que no la cree hasta tener consentimiento.',
  ],
  'privacy.cookies_unknown': [
    'Identifica para qué sirve cada cookie (tu desarrollador o el plugin que la crea te lo puede decir).',
    'Si es técnica (sesión, carrito, seguridad), no necesitas consentimiento: inclúyela en la política de cookies.',
    'Si es de analítica o publicidad, bloquéala hasta que el usuario acepte.',
  ],
  'privacy.trackers': [
    'Haz que estos scripts solo se carguen tras aceptar: los gestores de consentimiento (Cookiebot, Complianz, CookieYes…) lo hacen marcando cada script con su categoría.',
    'Con Google Tag Manager, activa Consent Mode v2 y configura los permisos por defecto como "denied".',
    'Si no usas los datos de alguna de estas herramientas, quítala: menos scripts, menos riesgo.',
  ],
  'privacy.banner': [
    'Instala un banner de cookies con botones de "Aceptar", "Rechazar" y "Configurar" en la primera capa, con el mismo peso visual.',
    'WordPress: Complianz o CookieYes (tienen versión gratuita). Shopify: "Privacidad de clientes" en Ajustes. Wix: "Banner de cookies" en Configuración.',
    'No vale un aviso del tipo "si sigues navegando aceptas": la AEPD exige una acción clara del usuario.',
  ],
  'privacy.legal_notice': [
    'Crea una página "Aviso legal" con: nombre o razón social, NIF/CIF, domicilio, email de contacto y datos registrales si los tienes.',
    'Enlázala desde el pie de todas las páginas.',
    'Los generadores de textos legales de los gestores de consentimiento (Complianz, iubenda) o tu gestoría pueden ayudarte.',
  ],
  'privacy.privacy_policy': [
    'Crea una página "Política de privacidad" con: responsable, finalidades, base legal, plazos de conservación, destinatarios y cómo ejercer los derechos.',
    'Enlázala desde el pie y desde cada formulario.',
    'La AEPD tiene una herramienta gratuita, "Facilita RGPD", para pequeños negocios.',
  ],
  'privacy.cookie_policy': [
    'Crea una página "Política de cookies" con la lista de cookies, para qué sirve cada una, quién la instala y cuánto dura.',
    'Enlázala desde el pie y desde el banner de cookies. Muchos gestores (Cookiebot, Complianz) la generan y actualizan solos.',
  ],
  'privacy.forms': [
    'Junto al botón de enviar, añade la "información básica" de protección de datos: responsable, finalidad, derechos y un enlace a la política de privacidad.',
    'Las casillas para enviar publicidad o boletines deben estar desmarcadas por defecto.',
    'Asegúrate de que el formulario se envía por https.',
    'WordPress (Contact Form 7, WPForms, Elementor): todos permiten añadir una casilla de aceptación y un texto legal.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type RemediationId = keyof typeof REMEDIATION;

export const fixFor = (id: RemediationId): string[] => [...REMEDIATION[id]];
