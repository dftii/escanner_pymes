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
npm run build
```

## Despliegue en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa el repositorio `dftii/escanner_pymes`.
2. Vercel detecta Next.js automáticamente; no hace falta cambiar nada.
3. Cada PR genera un despliegue de vista previa y cada merge en `main` despliega en producción.

Variables de entorno (se irán añadiendo en cada hito):

| Variable                   | Uso                                                            | Por defecto           |
| -------------------------- | -------------------------------------------------------------- | --------------------- |
| `UPSTASH_REDIS_REST_URL`   | Rate limit compartido entre instancias (opcional, plan gratis) | sin definir → memoria |
| `UPSTASH_REDIS_REST_TOKEN` | Token de Upstash                                               | sin definir           |
| `RATE_LIMIT_SALT`          | Sal para el hash de la IP (la IP nunca se guarda en claro)     | derivada / aleatoria  |
| `ENABLE_HEADLESS`          | Activa el análisis de cookies con navegador (fase 2)           | `false`               |

Sin Upstash el límite (5 análisis cada 10 minutos por IP) se guarda en la memoria de cada instancia de Vercel: funciona, pero no se comparte entre instancias.

## API

`POST /api/scan` con `{ "domain": "minegocio.es", "consent": true }`.

| Respuesta | Cuándo                                                      |
| --------- | ----------------------------------------------------------- |
| `200`     | `{ domain, findings }` (los checks llegan en los PR 3-5)    |
| `400`     | Dominio no válido, IP, dominio interno o sin consentimiento |
| `404`     | El dominio no existe                                        |
| `429`     | Límite superado (cabecera `Retry-After`)                    |

Los errores siempre tienen la forma `{ error: { code, message } }`, con `message` en español y listo para mostrar.

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
- [ ] PR 3: checks de SSL y de cabeceras
- [ ] PR 4: check de correo (DNS y emails expuestos)
- [ ] PR 5: check de cookies y RGPD (fase 1)
- [ ] PR 6: puntuación, interfaz completa y vista imprimible
- [ ] PR 7 (opcional): navegador headless para cookies (fase 2)
