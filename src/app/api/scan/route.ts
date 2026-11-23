import { NextResponse } from 'next/server';
import { ScanError, isScanError } from '@/lib/net/errors';
import { resolvePublic } from '@/lib/net/lookup';
import { clientIp, getRateLimiter, hashKey } from '@/lib/rateLimit';
import { parseScanRequest } from '@/lib/scanRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/scan  { domain: string, consent: true }
 *
 * De momento valida, aplica el rate limit y comprueba que el dominio existe y
 * es público. Las comprobaciones (SSL, cabeceras, correo, cookies) llegan en
 * los PR 3 a 5. No se registra el dominio ni la IP en ningún log.
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { domain } = parseScanRequest(body);

    const { limiter, salt } = getRateLimiter();
    const rl = await limiter.hit(hashKey(clientIp(request.headers), salt));
    if (!rl.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
      return errorResponse(
        new ScanError(
          'rate_limited',
          `Has hecho varios análisis seguidos. Vuelve a intentarlo en ${Math.ceil(retryAfter / 60)} min.`,
          429,
        ),
        { 'retry-after': String(retryAfter) },
      );
    }

    await resolvePublic(domain);

    return NextResponse.json(
      { domain, findings: [] },
      { headers: { 'cache-control': 'no-store', 'x-ratelimit-remaining': String(rl.remaining) } },
    );
  } catch (error) {
    if (isScanError(error)) return errorResponse(error);
    console.error('Error inesperado en /api/scan', error instanceof Error ? error.name : 'unknown');
    return errorResponse(
      new ScanError('network', 'Ha ocurrido un error inesperado. Inténtalo de nuevo.', 500),
    );
  }
}

function errorResponse(error: ScanError, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message } },
    { status: error.httpStatus, headers: { 'cache-control': 'no-store', ...headers } },
  );
}
