import type { MxRecord } from 'node:dns';
import type { DnsClient } from '@/lib/net/dnsClient';

export type FakeZone = {
  txt?: Record<string, string | string[] | string[][]>;
  mx?: Record<string, Array<[number, string]>>;
  /** Nombre → código de error (ETIMEOUT, ESERVFAIL…). */
  fail?: Record<string, string>;
};

const err = (code: string) => Object.assign(new Error(code), { code });

/** DNS en memoria: lo que no está en la zona devuelve ENOTFOUND. */
export function fakeDns(zone: FakeZone): DnsClient & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    async resolveTxt(name) {
      queries.push(`TXT ${name}`);
      if (zone.fail?.[name]) throw err(zone.fail[name]);
      const value = zone.txt?.[name];
      if (value === undefined) throw err('ENOTFOUND');
      const list = Array.isArray(value) ? value : [value];
      return list.map((v) => (Array.isArray(v) ? v : [v]));
    },
    async resolveMx(name) {
      queries.push(`MX ${name}`);
      if (zone.fail?.[name]) throw err(zone.fail[name]);
      const value = zone.mx?.[name];
      if (value === undefined) throw err('ENODATA');
      return value.map(([priority, exchange]) => ({ priority, exchange }) satisfies MxRecord);
    },
  };
}
