import type { MxRecord } from 'node:dns';
import { Resolver } from 'node:dns/promises';

/** Lo que necesitan los checks de correo. Inyectable para tests. */
export type DnsClient = {
  resolveMx(name: string): Promise<MxRecord[]>;
  resolveTxt(name: string): Promise<string[][]>;
};

/**
 * Resolutor con timeouts cortos para no alargar el informe.
 * `DNS_SERVERS` (opcional, p. ej. "1.1.1.1,8.8.8.8") sustituye a los del sistema.
 */
export function createDnsClient(env: Record<string, string | undefined> = process.env): DnsClient {
  const resolver = new Resolver({ timeout: 3_000, tries: 2 });
  const servers = env.DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers?.length) resolver.setServers(servers);
  return {
    resolveMx: (name) => resolver.resolveMx(name),
    resolveTxt: (name) => resolver.resolveTxt(name),
  };
}

const EMPTY_CODES = new Set(['ENODATA', 'ENOTFOUND', 'NXDOMAIN', 'ENONAME']);

/** `true` si el error de DNS significa "no hay registro" (no un fallo). */
export const isNoRecord = (error: unknown): boolean =>
  EMPTY_CODES.has((error as { code?: string } | undefined)?.code ?? '');

/** Registros TXT ya unidos (un TXT puede venir en trozos). Vacío si no hay. */
export async function txtRecords(dns: DnsClient, name: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(name)).map((chunks) => chunks.join(''));
  } catch (error) {
    if (isNoRecord(error)) return [];
    throw error;
  }
}

/** Registros MX ordenados por prioridad. Vacío si no hay. */
export async function mxRecords(dns: DnsClient, name: string): Promise<MxRecord[]> {
  try {
    return (await dns.resolveMx(name)).sort((a, b) => a.priority - b.priority);
  } catch (error) {
    if (isNoRecord(error)) return [];
    throw error;
  }
}
