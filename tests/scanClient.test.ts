import { describe, expect, it } from 'vitest';
import type { ReportData } from '@/lib/report';
import { requestScan } from '@/lib/scanClient';
import { encodeEvent, type ScanEvent } from '@/lib/scanStream';

const result: ReportData = {
  domain: 'minegocio.es',
  scannedAt: '2026-11-23T12:00:00Z',
  findings: [],
  notices: [],
};

const stream = (events: ScanEvent[]) =>
  new Response(events.map(encodeEvent).join(''), { status: 200 });

const fetchReturning = (res: Response | Error, calls: RequestInit[] = []) =>
  (async (_url: string, init: RequestInit) => {
    calls.push(init);
    if (res instanceof Error) throw res;
    return res;
  }) as unknown as typeof fetch;

describe('requestScan', () => {
  it('envía dominio y consentimiento y avisa de cada categoría', async () => {
    const calls: RequestInit[] = [];
    const seen: string[] = [];
    const report = await requestScan(
      'minegocio.es',
      true,
      (c) => seen.push(c),
      fetchReturning(
        stream([
          { type: 'category', category: 'ssl', findings: [] },
          { type: 'done', result } as ScanEvent,
        ]),
        calls,
      ),
    );
    expect(report).toEqual(result);
    expect(seen).toEqual(['ssl']);
    expect(JSON.parse(String(calls[0]!.body))).toEqual({ domain: 'minegocio.es', consent: true });
  });

  it('muestra el mensaje de error de la API', async () => {
    const res = new Response(JSON.stringify({ error: { message: 'Has superado el límite' } }), {
      status: 429,
    });
    await expect(requestScan('a.es', true, undefined, fetchReturning(res))).rejects.toThrow(
      'Has superado el límite',
    );
    await expect(
      requestScan('a.es', true, undefined, fetchReturning(new Response('x', { status: 500 }))),
    ).rejects.toThrow('No hemos podido analizar el dominio.');
  });

  it('errores de red, del flujo o flujo cortado', async () => {
    await expect(
      requestScan('a.es', true, undefined, fetchReturning(new TypeError('Failed to fetch'))),
    ).rejects.toThrow('No hemos podido conectar');
    await expect(
      requestScan(
        'a.es',
        true,
        undefined,
        fetchReturning(stream([{ type: 'error', message: 'Ups' }])),
      ),
    ).rejects.toThrow('Ups');
    await expect(requestScan('a.es', true, undefined, fetchReturning(stream([])))).rejects.toThrow(
      'interrumpido',
    );
  });
});
