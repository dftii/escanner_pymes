# Escáner Pymes

Herramienta web para que un negocio local escriba su dominio y reciba, en menos de 20 segundos, un informe claro y sin tecnicismos sobre:

1. **Certificado SSL/TLS**: validez, emisor, días hasta la caducidad, cadena, nombre, versión de TLS y redirección de HTTP a HTTPS.
2. **Cabeceras de seguridad**: HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` y las cabeceras que revelan demasiado.
3. **Correo y suplantación**: emails expuestos en la web, MX, SPF, DMARC y DKIM.
4. **Cookies y RGPD (orientativo)**: cookies y scripts de terceros antes del consentimiento, banner/CMP y enlaces a la política de privacidad, la de cookies y el aviso legal (LSSI-CE).

> Los resultados sobre RGPD y cookies son orientativos y no sustituyen el asesoramiento legal.

## Principios

- **Solo análisis pasivo**: lo mismo que vería un navegador. Sin escaneo de puertos, sin fuerza bruta y como mucho 5 páginas por dominio.
- **Protección contra SSRF**: se rechazan IPs privadas, de loopback, link-local y de metadatos, también tras cada redirección.
- **Privacidad**: no se guardan los dominios analizados ni las IPs más allá del rate limit, y no hay cookies que no sean técnicas.

## Stack

| Pieza          | Elección                                                   |
| -------------- | ---------------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19                         |
| Lenguaje       | TypeScript estricto (`noUncheckedIndexedAccess`)           |
| Estilos        | Tailwind CSS 4                                             |
| Comprobaciones | Route Handlers en runtime Node.js (`node:tls`, `node:dns`) |
| Validación     | zod                                                        |
| Tests          | Vitest + cobertura v8 (umbral del 80 % en `src/lib`)       |
| Calidad        | ESLint (`next/core-web-vitals`) + Prettier                 |
| CI             | GitHub Actions: lint, tipos, tests y build en cada PR      |
| Despliegue     | Vercel                                                     |

## Estructura

```
src/
  app/            páginas y rutas de API
  lib/
    types.ts      contrato común Finding
    findings.ts   utilidades: orden por gravedad, agrupado, hallazgo de error
    checks/       ssl, headers, email, privacy        (PR 3-5)
    net/          safeFetch con protección SSRF        (PR 2)
    data/         catálogo de cookies y textos de solución
tests/            tests unitarios con fixtures, sin red real
```

## Desarrollo

Requiere Node.js 20.18 o superior.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint         # ESLint + Prettier
npm run typecheck
npm test
npm run test:coverage
npm run test:network # contra webs y DNS reales (badssl.com, google.com, github.com); necesita Internet
npm run build
```

Los tests unitarios no salen a Internet: usan respuestas simuladas y un servidor TLS local con un certificado autofirmado solo para tests (`tests/fixtures/tls`). Los de `tests/network` van en un workflow aparte (`.github/workflows/network.yml`: en cada PR, cada lunes y a mano), para que el CI principal no dependa de webs ajenas.

## Despliegue en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa el repositorio `dftii/escanner_pymes`.
2. Vercel detecta Next.js automáticamente; no hace falta cambiar nada.
3. Cada PR genera un despliegue de vista previa y cada merge en `main` despliega en producción.

Variables de entorno (se irán añadiendo en cada hito):

| Variable                   | Uso                                                                | Por defecto           |
| -------------------------- | ------------------------------------------------------------------ | --------------------- |
| `UPSTASH_REDIS_REST_URL`   | Rate limit compartido entre instancias (opcional, plan gratis)     | sin definir → memoria |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash                                                   | sin definir           |
| `RATE_LIMIT_SALT`          | Sal para el hash de la IP (la IP nunca se guarda en claro)         | derivada / aleatoria  |
| `ENABLE_HEADLESS`          | Activa el análisis de cookies con navegador (fase 2)               | `false`               |
| `DNS_SERVERS`              | Servidores DNS para los checks de correo, p. ej. `1.1.1.1,8.8.8.8` | los del sistema       |

Sin Upstash el límite (5 análisis cada 10 minutos por IP) se guarda en la memoria de cada instancia de Vercel: funciona, pero no se comparte entre instancias.

## API

`POST /api/scan` con `{ "domain": "minegocio.es", "consent": true }`.

| Respuesta | Cuándo                                                           |
| --------- | ---------------------------------------------------------------- |
| `200`     | `{ domain, scannedAt, finalUrl, durationMs, findings, notices }` |
| `400`     | Dominio no válido, IP, dominio interno o sin consentimiento      |
| `404`     | El dominio no existe                                             |
| `429`     | Límite superado (cabecera `Retry-After`)                         |

Los errores siempre tienen la forma `{ error: { code, message } }`, con `message` en español y listo para mostrar.

## Comprobaciones

Cada hallazgo tiene `id`, `category`, `status` (`ok`, `warning`, `fail`, `info`, `error`), `title`, `detail`, `risk` y `fix` (pasos concretos para WordPress, cPanel, Plesk, Wix o Shopify, definidos en `src/lib/data/remediation.ts`).

**Certificado SSL** (`src/lib/checks/ssl.ts`)

| id             | Qué revisa                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `ssl.no_https` | La web no acepta conexiones seguras                                            |
| `ssl.trust`    | Certificado de confianza (o `ssl.untrusted` / `ssl.chain` si no lo es)         |
| `ssl.expiry`   | Días hasta la caducidad: fallo si quedan 7 o menos, aviso si quedan 21 o menos |
| `ssl.hostname` | El certificado incluye el dominio                                              |
| `ssl.www`      | La versión con o sin `www` también tiene un certificado válido                 |
| `ssl.protocol` | TLS 1.2 o 1.3 (fallo con TLS 1.0/1.1)                                          |
| `ssl.redirect` | `http://` lleva a `https://`                                                   |

**Cabeceras de seguridad** (`src/lib/checks/headers.ts`): HSTS (con un mínimo de 6 meses), CSP (avisa si permite `'unsafe-inline'` sin nonce), `X-Content-Type-Options`, protección frente a incrustación (`X-Frame-Options` o `frame-ancestors`), `Referrer-Policy`, `Permissions-Policy` y cabeceras que revelan versiones (`Server`, `X-Powered-By`…).

**Correo y suplantación** (`src/lib/checks/emailDns.ts`, `emailExposure.ts`). Se revisa el dominio sin `www.`:

| id              | Qué revisa                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `email.mx`      | Si el dominio recibe correo y con qué proveedor (Google Workspace, Microsoft 365, OVH, IONOS…)                                                   |
| `email.spf`     | Si existe y es único, el `all` final (`-all`, `~all`, `?all`, `+all`) y las consultas DNS que hace (máximo 10, siguiendo `include` y `redirect`) |
| `email.dmarc`   | Si existe, su política (`none`, `quarantine`, `reject`), si se aplica al 100 % y si pide informes (`rua`)                                        |
| `email.dkim`    | Firma DKIM con los selectores habituales; si no aparece es `info`, porque puede usar otro selector                                               |
| `email.exposed` | Emails legibles por robots en la home y en hasta 3 páginas de contacto, aviso legal o privacidad                                                 |

En `email.exposed` se tiene en cuenta que la LSSI obliga a publicar un email de contacto: un buzón genérico del dominio (info@, contacto@) es `info`, y las direcciones personales o de Gmail/Hotmail son `warning`. Las direcciones protegidas por Cloudflare cuentan como protegidas.

**Cookies y RGPD, fase 1** (`src/lib/checks/privacy.ts`, catálogos en `src/lib/data/known-cookies.ts`). Sin navegador: se analiza lo que envía el servidor al entrar sin aceptar nada.

| id                       | Qué revisa                                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privacy.cookies`        | Cookies del servidor (también en las redirecciones) clasificadas en técnicas, de preferencias, de analítica, de publicidad o desconocidas                                                                      |
| `privacy.trackers`       | Scripts de seguimiento en el HTML inicial (GA, GTM, Meta Pixel, Hotjar, Clarity, LinkedIn, TikTok, YouTube…), distinguiendo los bloqueados por el CMP (`type="text/plain"`) y Google Consent Mode con `denied` |
| `privacy.banner`         | Gestor de consentimiento conocido (Cookiebot, OneTrust, CookieYes, Complianz, iubenda, Usercentrics…) o aviso casero                                                                                           |
| `privacy.legal_notice`   | Enlace al aviso legal (LSSI art. 10)                                                                                                                                                                           |
| `privacy.privacy_policy` | Enlace a la política de privacidad (RGPD art. 13)                                                                                                                                                              |
| `privacy.cookie_policy`  | Enlace a la política de cookies (obligatoria si hay cookies que requieren consentimiento)                                                                                                                      |
| `privacy.forms`          | Formularios de las páginas revisadas: envío por http, sin información de protección de datos o con casillas de publicidad premarcadas                                                                          |

El informe incluye el aviso de que estos resultados son orientativos y no sustituyen el asesoramiento legal (`notices`). La fase 1 no ve las cookies que crean los scripts al ejecutarse: las cubre indirectamente detectando los scripts. La fase 2 (PR 7) usará un navegador real.

Las páginas extra (contacto, aviso legal, privacidad) se descargan una sola vez y las comparten los checks de correo y de RGPD.

La página de inicio se descarga una sola vez y la comparten todos los checks. Se acepta un certificado inválido solo para leerla, de modo que una web con el SSL roto también recibe el análisis de cabeceras.

## Protección contra SSRF

Todas las peticiones salientes pasan por `src/lib/net/safeFetch.ts`:

- Solo `http`/`https` en los puertos 80 y 443, sin credenciales en la URL.
- Cada salto de redirección (máximo 5) se vuelve a validar.
- La IP se comprueba **en el momento de conectar** (lookup propio en el `Agent` de undici), así que un cambio de DNS entre la validación y la conexión (DNS rebinding) no sirve.
- Si alguna de las IPs del dominio es interna se rechaza entero. Se bloquean rangos privados, loopback, link-local (metadatos cloud), CGNAT, documentación, multicast y las IPv6 que llevan dentro una IPv4 interna.
- 8 s de timeout por petición y como mucho 2 MB de cuerpo.

## Hoja de ruta

- [x] PR 1: scaffolding, CI y README
- [x] PR 2: `safeFetch` con protección SSRF, validación de dominio y rate limiting
- [x] PR 3: checks de SSL y de cabeceras
- [x] PR 4: check de correo (DNS y emails expuestos)
- [x] PR 5: check de cookies y RGPD (fase 1)
- [ ] PR 6: puntuación, interfaz completa y vista imprimible
- [ ] PR 7 (opcional): navegador headless para cookies (fase 2)
