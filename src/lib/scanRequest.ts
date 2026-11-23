import { z } from 'zod';
import { normalizeDomain } from './net/domain';
import { ScanError } from './net/errors';

export const scanRequestSchema = z.object({
  domain: z.string().max(2048),
  consent: z.boolean(),
});

/**
 * Valida el cuerpo de `POST /api/scan` y devuelve el dominio normalizado.
 * @throws {ScanError} `invalid_domain`, `consent_required`, etc.
 */
export function parseScanRequest(body: unknown): { domain: string } {
  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ScanError(
      'invalid_domain',
      'La petición no es válida. Escribe un dominio y marca la casilla de confirmación.',
    );
  }
  if (!parsed.data.consent) {
    throw new ScanError(
      'consent_required',
      'Marca la casilla para confirmar que el dominio es tuyo o que tienes permiso para analizarlo.',
    );
  }
  return { domain: normalizeDomain(parsed.data.domain) };
}
