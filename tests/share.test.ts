import { describe, expect, it } from 'vitest';
import type { ReportData } from '@/lib/report';
import { decodeReport, encodeReport, MAX_ENCODED, sharedFromHash, shareUrl } from '@/lib/share';

const report: ReportData = {
  domain: 'minegocio.es',
  scannedAt: '2026-11-24T10:00:00.000Z',
  notices: ['Aviso orientativo: ñandú 🙂'],
  findings: [
    {
      id: 'email.dmarc',
      category: 'email',
      status: 'fail',
      title: 'Falta la política DMARC',
      detail: 'Detalle '.repeat(200),
      risk: 'Riesgo',
      fix: ['Paso 1', 'Paso 2'],
      evidence: { secreto: 'no debe viajar' },
      records: [
        { type: 'TXT', host: '_dmarc', fqdn: '_dmarc.minegocio.es', value: 'v=DMARC1; p=none' },
      ],
    },
  ],
};

const deflate = async (text: string) => {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

describe('enlace para compartir', () => {
  it('ida y vuelta sin evidence, comprimido y apto para URL', async () => {
    const encoded = await encodeReport(report);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(JSON.stringify(report).length / 3);
    const decoded = await decodeReport(encoded);
    expect(decoded!.findings[0]).not.toHaveProperty('evidence');
    expect(decoded).toEqual({
      ...report,
      findings: [{ ...report.findings[0]!, evidence: undefined }],
    });
  });

  it('URL y lectura del fragmento', async () => {
    expect(shareUrl('https://x.app', 'abc')).toBe('https://x.app/#r=abc');
    expect(sharedFromHash('#r=abc')).toBe('abc');
    expect(sharedFromHash('#contenido')).toBeNull();
    expect(sharedFromHash('')).toBeNull();
  });

  it('rechaza enlaces rotos, manipulados o enormes', async () => {
    expect(await decodeReport('')).toBeNull();
    expect(await decodeReport('no válido!')).toBeNull();
    expect(await decodeReport('a'.repeat(MAX_ENCODED + 1))).toBeNull();
    expect(await decodeReport('AAAA')).toBeNull();
    expect(await decodeReport(await deflate('{"domain":1}'))).toBeNull();
    // Estado inventado: no pasa la validación.
    const bad = JSON.stringify({
      ...report,
      findings: [{ ...report.findings[0], status: 'hackeado' }],
    });
    expect(await decodeReport(await deflate(bad))).toBeNull();
    // Bomba de compresión: muchísimos datos que se comprimen a casi nada.
    expect(await decodeReport(await deflate(' '.repeat(5_000_000)))).toBeNull();
  });
});
