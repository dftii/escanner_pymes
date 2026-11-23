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
npx playwright-core install --only-shell chromium  # solo para los tests del navegador (tests/browser)
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
| `CHROMIUM_PATH`            | Ruta al ejecutable de Chromium para la fase 2                      | el de Playwright      |
| `DNS_SERVERS`              | Servidores DNS para los checks de correo, p. ej. `1.1.1.1,8.8.8.8` | los del sistema       |

**Fase 2 en producción.** Vercel no trae Chromium, así que con `ENABLE_HEADLESS=true` hay que darle uno con `CHROMIUM_PATH` (por ejemplo, el paquete `@sparticuz/chromium` descomprimido en `/tmp`) o, más sencillo, desplegar en un servidor o contenedor con Chromium instalado (`npx playwright-core install --with-deps --only-shell chromium`). Cada navegador usa unos 150 MB de memoria y añade entre 3 y 20 s al análisis; sin la variable, la herramienta funciona igual que antes.

Sin Upstash el límite (5 análisis cada 10 minutos por IP) se guarda en la memoria de cada instancia de Vercel: funciona, pero no se comparte entre instancias.

## API

`POST /api/scan` con `{ "domain": "minegocio.es", "consent": true }`.

| Respuesta | Cuándo                                                      |
| --------- | ----------------------------------------------------------- |
| `200`     | Flujo NDJSON con el progreso (ver abajo)                    |
| `400`     | Dominio no válido, IP, dominio interno o sin consentimiento |
| `404`     | El dominio no existe                                        |
| `429`     | Límite superado (cabecera `Retry-After`)                    |

Los errores previos al análisis siempre tienen la forma `{ error: { code, message } }`, con `message` en español y listo para mostrar.

Con `200` la respuesta es `application/x-ndjson`, con un evento JSON por línea (`src/lib/scanStream.ts`), para mostrar el progreso real:

```
{"type":"category","category":"ssl","findings":[…]}
{"type":"category","category":"headers","findings":[…]}
…
{"type":"done","result":{"domain","scannedAt","finalUrl","durationMs","findings","notices"}}
```

## Puntuación

`src/lib/scoring.ts` da una nota de la A a la F por categoría y otra global:

- Cada hallazgo puntúa: `ok` 100, `warning` 50, `fail` 0 e `info` 100 (80 si propone una mejora). Los `error` no cuentan.
- Cada comprobación tiene un peso. Las críticas (peso 3 o más, como certificado caducado, SPF, DMARC o cookies sin consentimiento) limitan la categoría a una **D** si fallan.
- Si no hay datos de al menos la mitad del peso de una categoría, se muestra "sin datos" en lugar de una nota engañosa.
- La nota global pondera: SSL 30 %, correo 25 %, RGPD 25 % y cabeceras 20 %.
- Tramos: A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 45 · E ≥ 30 · F < 30.

## Seguridad de la propia web

- **CSP estricta con nonce** por petición (`src/middleware.ts`, `src/lib/csp.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'` sin `unsafe-inline`, `frame-ancestors 'none'` y `object-src 'none'`. La API lleva `default-src 'none'`.
- HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` y sin `X-Powered-By`.
- Sin cookies, sin `localStorage` y sin scripts de terceros.
- `tests/csp.test.ts` y `tests/selfscan.test.ts` comprueban que la web aprueba sus propios checks de cabeceras y de RGPD.

> **Antes de publicar:** completa los datos marcados en amarillo (titular, NIF, dirección, email, hosting) en `/aviso-legal` y `/privacidad`.

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

El informe incluye el aviso de que estos resultados son orientativos y no sustituyen el asesoramiento legal (`notices`). La fase 1 no ve las cookies que crean los scripts al ejecutarse: las cubre indirectamente detectando los scripts.

**Cookies y RGPD, fase 2** (`src/lib/checks/browserCookies.ts`, opcional con `ENABLE_HEADLESS=true`). Abre la web en un Chromium real (`playwright-core`), sin aceptar nada, sin hacer clic y sin enviar formularios, espera a que la red se calme y lee las cookies que han creado los scripts.

| id                   | Qué revisa                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privacy.cookies_js` | Cookies creadas al ejecutar la página: falla con las de analítica, publicidad o de terceros sin clasificar. No repite las que ya evaluó `privacy.cookies`. Peso 3 (crítica) |

Si el navegador no puede abrir la web o está ocupado (como mucho 2 a la vez por instancia), el hallazgo sale como `error` y no cuenta para la nota. Cada análisis usa un contexto vacío que se cierra al terminar, sin service workers, descargas ni permisos; las ventanas emergentes se cierran y los diálogos se descartan.

Las páginas extra (contacto, aviso legal, privacidad) se descargan una sola vez y las comparten los checks de correo y de RGPD.

La página de inicio se descarga una sola vez y la comparten todos los checks. Se acepta un certificado inválido solo para leerla, de modo que una web con el SSL roto también recibe el análisis de cabeceras.

## Protección contra SSRF

Todas las peticiones salientes pasan por `src/lib/net/safeFetch.ts`:

- Solo `http`/`https` en los puertos 80 y 443, sin credenciales en la URL.
- Cada salto de redirección (máximo 5) se vuelve a validar.
- La IP se comprueba **en el momento de conectar** (lookup propio en el `Agent` de undici), así que un cambio de DNS entre la validación y la conexión (DNS rebinding) no sirve.
- Si alguna de las IPs del dominio es interna se rechaza entero. Se bloquean rangos privados, loopback, link-local (metadatos cloud), CGNAT, documentación, multicast y las IPv6 que llevan dentro una IPv4 interna.
- 8 s de timeout por petición y como mucho 2 MB de cuerpo.

El navegador headless (fase 2) conecta por su cuenta, así que no basta con revisar las URLs antes de pedirlas. Por eso se lanza con `--proxy-server` apuntando a un proxy local (`src/lib/net/egressProxy.ts`) que abre él mismo cada conexión con el mismo lookup seguro: la IP se valida al conectar también para el navegador, incluidas las peticiones a `localhost` (`<-loopback>` anula la excepción por defecto de Chromium). Solo deja salir a los puertos 80 y 443, como mucho 32 conexiones a la vez y 20 MB en total por análisis.

## Hoja de ruta

- [x] PR 1: scaffolding, CI y README
- [x] PR 2: `safeFetch` con protección SSRF, validación de dominio y rate limiting
- [x] PR 3: checks de SSL y de cabeceras
- [x] PR 4: check de correo (DNS y emails expuestos)
- [x] PR 5: check de cookies y RGPD (fase 1)
- [x] PR 6: puntuación, interfaz completa y vista imprimible
- [x] PR 7: navegador headless para cookies (fase 2), detrás de `ENABLE_HEADLESS`
