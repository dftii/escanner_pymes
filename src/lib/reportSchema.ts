import { z } from 'zod';
import type { ReportData } from './report';

/**
 * Validación estricta de un informe que viene de fuera del servidor
 * (historial del navegador o enlace compartido): tipos, valores permitidos y
 * tamaños máximos. Lo que no encaja se descarta entero.
 */
const text = (max: number) => z.string().max(max);

const recordSchema = z.object({
  type: z.literal('TXT'),
  host: text(255),
  fqdn: text(255),
  value: text(2048),
  note: text(1000).optional(),
  label: text(200).optional(),
});

const findingSchema = z.object({
  id: text(80),
  category: z.enum(['ssl', 'headers', 'email', 'privacy']),
  status: z.enum(['ok', 'warning', 'fail', 'info', 'error']),
  title: text(300),
  detail: text(5000),
  risk: text(2000),
  fix: z.array(text(1000)).max(20),
  evidence: z.record(z.string(), z.unknown()).optional(),
  records: z.array(recordSchema).max(5).optional(),
});

const reportSchema = z.object({
  domain: text(253).min(1),
  scannedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
  findings: z.array(findingSchema).max(200),
  notices: z.array(text(1000)).max(10),
});

export function parseReport(value: unknown): ReportData | null {
  const result = reportSchema.safeParse(value);
  if (!result.success) return null;
  const { domain, scannedAt, findings, notices } = result.data;
  return { domain, scannedAt, findings, notices };
}
