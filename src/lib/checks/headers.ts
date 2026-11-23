import { fixFor } from '../data/remediation';
import type { Finding } from '../types';

/** Lo mínimo que necesita el check: la URL final y sus cabeceras. */
export type PageResponse = { url: string; headers: Headers };

/** 180 días: por debajo, HSTS protege poco entre visitas. */
export const HSTS_MIN_MAX_AGE = 15_552_000;

const base = { category: 'headers' } as const;

/**
 * Cabeceras de seguridad de la página de inicio. Función pura: no hace red.
 */
export function checkHeaders(page: PageResponse): Finding[] {
  const h = page.headers;
  const https = page.url.startsWith('https:');
  const csp = h.get('content-security-policy');
  return [
    hsts(h.get('strict-transport-security'), https),
    contentSecurityPolicy(csp, h.get('content-security-policy-report-only')),
    nosniff(h.get('x-content-type-options')),
    framing(h.get('x-frame-options'), csp),
    referrer(h.get('referrer-policy')),
    permissions(h.get('permissions-policy')),
    disclosure(h),
  ];
}

function hsts(value: string | null, https: boolean): Finding {
  const id = 'headers.hsts';
  if (!https) {
    return {
      ...base,
      id,
      status: 'info',
      title: 'HSTS no aplica: la web no se sirve por HTTPS',
      detail:
        'Esta protección solo funciona cuando la web ya tiene HTTPS. Revisa primero el certificado.',
      risk: 'Ver el apartado del certificado SSL.',
      fix: [],
    };
  }
  if (!value) {
    return {
      ...base,
      id,
      status: 'warning',
      title: 'Falta HSTS (obligar siempre a usar la conexión segura)',
      detail: 'El navegador no sabe que tu web debe abrirse siempre con https.',
      risk: 'En una wifi pública alguien podría forzar la versión sin cifrar de tu web.',
      fix: fixFor('headers.hsts'),
    };
  }
  const maxAge = Number(/max-age\s*=\s*"?(\d+)/i.exec(value)?.[1] ?? NaN);
  if (!Number.isFinite(maxAge) || maxAge < HSTS_MIN_MAX_AGE) {
    return {
      ...base,
      id,
      status: 'warning',
      title: 'HSTS está activado, pero dura muy poco',
      detail: `La cabecera tiene max-age=${Number.isFinite(maxAge) ? maxAge : '¿?'} segundos; lo recomendable es al menos 6 meses (15552000).`,
      risk: 'La protección caduca pronto y deja de aplicarse entre visitas.',
      fix: fixFor('headers.hsts'),
      evidence: { value },
    };
  }
  return {
    ...base,
    id,
    status: 'ok',
    title: 'HSTS activado',
    detail: 'El navegador siempre abrirá tu web con conexión segura.',
    risk: 'Sin problemas.',
    fix: [],
    evidence: { value },
  };
}

function contentSecurityPolicy(value: string | null, reportOnly: string | null): Finding {
  const id = 'headers.csp';
  if (!value) {
    return {
      ...base,
      id,
      status: reportOnly ? 'info' : 'warning',
      title: reportOnly
        ? 'Política de contenido (CSP) solo en modo prueba'
        : 'Falta una política de seguridad de contenido (CSP)',
      detail: reportOnly
        ? 'Tienes una CSP en modo "solo informar": avisa de problemas pero aún no bloquea nada.'
        : 'No hay reglas que limiten qué scripts y recursos puede cargar tu web.',
      risk: 'Si alguien consigue inyectar código en tu web (por ejemplo con un plugin vulnerable), nada lo frena.',
      fix: fixFor('headers.csp'),
      evidence: reportOnly ? { reportOnly } : undefined,
    };
  }
  const scriptSrc =
    /(?:^|;)\s*script-src\s+([^;]*)/i.exec(value)?.[1] ??
    /(?:^|;)\s*default-src\s+([^;]*)/i.exec(value)?.[1] ??
    '';
  const weak =
    /'unsafe-inline'/.test(scriptSrc) &&
    !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(scriptSrc);
  return {
    ...base,
    id,
    status: weak ? 'info' : 'ok',
    title: weak
      ? 'Tienes CSP, pero permite scripts incrustados'
      : 'Política de seguridad de contenido (CSP) activada',
    detail: weak
      ? "La política incluye 'unsafe-inline' en los scripts, lo que reduce mucho su protección."
      : 'Tu web limita qué recursos se pueden cargar.',
    risk: weak ? 'Protege menos frente a la inyección de código.' : 'Sin problemas.',
    fix: weak ? fixFor('headers.csp') : [],
    evidence: { value },
  };
}

function nosniff(value: string | null): Finding {
  const ok = value?.trim().toLowerCase() === 'nosniff';
  return {
    ...base,
    id: 'headers.xcto',
    status: ok ? 'ok' : 'warning',
    title: ok ? 'Protección contra archivos disfrazados activada' : 'Falta X-Content-Type-Options',
    detail: ok
      ? 'El navegador no intentará adivinar el tipo de los archivos.'
      : 'El navegador podría interpretar un archivo subido (por ejemplo, una imagen) como código.',
    risk: ok ? 'Sin problemas.' : 'Facilita ciertos ataques con archivos manipulados.',
    fix: ok ? [] : fixFor('headers.xcto'),
    evidence: value ? { value } : undefined,
  };
}

function framing(xfo: string | null, csp: string | null): Finding {
  const xfoOk = !!xfo && /^(deny|sameorigin)$/i.test(xfo.trim());
  const cspOk = !!csp && /(?:^|;)\s*frame-ancestors\s/i.test(csp);
  const ok = xfoOk || cspOk;
  return {
    ...base,
    id: 'headers.framing',
    status: ok ? 'ok' : 'warning',
    title: ok
      ? 'Tu web no se puede incrustar en otras páginas'
      : 'Tu web se puede incrustar dentro de otras páginas',
    detail: ok
      ? 'Está protegida contra el "clickjacking".'
      : 'Falta X-Frame-Options (o frame-ancestors en la CSP).',
    risk: ok
      ? 'Sin problemas.'
      : 'Alguien podría mostrar tu web dentro de la suya y engañar a tus clientes para que hagan clic donde no quieren.',
    fix: ok ? [] : fixFor('headers.framing'),
    evidence: xfo || cspOk ? { xFrameOptions: xfo, frameAncestors: cspOk } : undefined,
  };
}

const WEAK_REFERRER = new Set(['unsafe-url', 'no-referrer-when-downgrade']);

function referrer(value: string | null): Finding {
  const id = 'headers.referrer';
  if (!value) {
    return {
      ...base,
      id,
      status: 'info',
      title: 'No defines una política de referencia (Referrer-Policy)',
      detail:
        'Los navegadores actuales aplican una política razonable por defecto, pero es mejor fijarla.',
      risk: 'Con navegadores antiguos, las direcciones completas de tu web pueden enviarse a otras webs.',
      fix: fixFor('headers.referrer'),
    };
  }
  const policies = value
    .toLowerCase()
    .split(',')
    .map((p) => p.trim());
  const effective = policies.at(-1) ?? '';
  const weak = WEAK_REFERRER.has(effective);
  return {
    ...base,
    id,
    status: weak ? 'warning' : 'ok',
    title: weak
      ? 'La política de referencia comparte demasiado'
      : 'Política de referencia correcta',
    detail: weak
      ? `"${effective}" envía la dirección completa de cada página a las webs enlazadas.`
      : `Usas "${effective}".`,
    risk: weak
      ? 'Datos de las direcciones (por ejemplo, parámetros de un formulario) pueden llegar a terceros.'
      : 'Sin problemas.',
    fix: weak ? fixFor('headers.referrer') : [],
    evidence: { value },
  };
}

function permissions(value: string | null): Finding {
  return value
    ? {
        ...base,
        id: 'headers.permissions',
        status: 'ok',
        title: 'Permisos del navegador limitados (Permissions-Policy)',
        detail: 'Tu web indica qué funciones del dispositivo puede usar.',
        risk: 'Sin problemas.',
        fix: [],
        evidence: { value },
      }
    : {
        ...base,
        id: 'headers.permissions',
        status: 'info',
        title: 'No limitas los permisos del navegador (Permissions-Policy)',
        detail:
          'No indicas qué funciones (cámara, micrófono, ubicación) puede usar tu web o el contenido incrustado.',
        risk: 'Un script de terceros podría pedir permisos que tu web no necesita.',
        fix: fixFor('headers.permissions'),
      };
}

const VERSION_RE = /\d+(\.\d+)+/;

function disclosure(h: Headers): Finding {
  const leaks: Record<string, string> = {};
  const server = h.get('server');
  if (server && VERSION_RE.test(server)) leaks.server = server;
  for (const name of ['x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version', 'x-generator']) {
    const value = h.get(name);
    if (value) leaks[name] = value;
  }
  const names = Object.keys(leaks);
  if (names.length === 0) {
    return {
      ...base,
      id: 'headers.disclosure',
      status: 'ok',
      title: 'Tu web no anuncia qué software ni versión usa',
      detail: 'Las cabeceras no revelan versiones del servidor.',
      risk: 'Sin problemas.',
      fix: [],
      evidence: server ? { server } : undefined,
    };
  }
  return {
    ...base,
    id: 'headers.disclosure',
    status: 'warning',
    title: 'Tu web revela qué software y versión usa',
    detail: `Las cabeceras muestran: ${Object.entries(leaks)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')}.`,
    risk: 'A un atacante le resulta más fácil buscar fallos conocidos de esa versión concreta.',
    fix: fixFor('headers.disclosure'),
    evidence: leaks,
  };
}
