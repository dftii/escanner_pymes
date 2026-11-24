import { NextResponse } from 'next/server';
import type { Locale } from '@/lib/i18n';
import { errorMessage, unexpectedMessage } from '@/lib/net/errorMessages';
import { ScanError, isScanError } from '@/lib/net/errors';
import { resolvePublic } from '@/lib/net/lookup';
import { clientIp, getRateLimiter, hashKey } from '@/lib/rateLimit';
import { runScan } from '@/lib/scan';
import { parseScanRequest, requestLocale } from '@/lib/scanRequest';
import { encodeEvent, NDJSON, type ScanEvent } from '@/lib/scanStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/scan  { domain: string, consent: true, locale?: 'es' | 'ca' | 'en' }
 *
 * Valida, aplica el rate limit y comprueba que el dominio existe y es público.
 * Los errores de esa fase son JSON `{ error: { code, message } }` con su código
 * HTTP. Después responde 200 con un flujo NDJSON (ver `scanStream.ts`): un
 * evento `category` por categoría terminada y un `done` con el informe.
 * No se registra el dominio ni la IP en ningún log.
 */
export async function POST(request: Request) {
  let locale: Locale = 'es';
  try {
    const body: unknown = await request.json().catch(() => null);
    locale = requestLocale(body);
    const { domain } = parseScanRequest(body);

    const { limiter, salt } = getRateLimiter();
    const rl = await limiter.hit(hashKey(clientIp(request.headers), salt));
    if (!rl.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
      const minutes = Math.ceil(retryAfter / 60);
      return errorResponse(
        new ScanError(
          'rate_limited',
          `Has hecho varios análisis seguidos. Vuelve a intentarlo en ${minutes} min.`,
          429,
        ),
        locale,
        { 'retry-after': String(retryAfter) },
        { minutes },
      );
    }

    await resolvePublic(domain);

    // A partir de aquí la respuesta es un flujo NDJSON con el progreso real.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: ScanEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));
        try {
          const result = await runScan(domain, { locale }, (category, findings) =>
            send({ type: 'category', category, findings }),
          );
          send({ type: 'done', result });
        } catch {
          send({ type: 'error', message: unexpectedMessage(locale) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': NDJSON,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-ratelimit-remaining': String(rl.remaining),
      },
    });
  } catch (error) {
    if (isScanError(error)) return errorResponse(error, locale);
    console.error('Error inesperado en /api/scan', error instanceof Error ? error.name : 'unknown');
    return errorResponse(new ScanError('network', unexpectedMessage(locale), 500), locale);
  }
}

function errorResponse(
  error: ScanError,
  locale: Locale,
  headers: Record<string, string> = {},
  params: { minutes?: number } = {},
) {
  const message =
    error.message === unexpectedMessage(locale)
      ? error.message
      : errorMessage(error, locale, params);
  return NextResponse.json(
    { error: { code: error.code, message } },
    { status: error.httpStatus, headers: { 'cache-control': 'no-store', ...headers } },
  );
}
