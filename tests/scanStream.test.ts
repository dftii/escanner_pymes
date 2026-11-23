import { describe, expect, it } from 'vitest';
import { encodeEvent, readEventStream, type ScanEvent } from '@/lib/scanStream';

const streamOf = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });

const events: ScanEvent[] = [
  { type: 'category', category: 'ssl', findings: [] },
  { type: 'error', message: 'Algo falló: ñandú 🙂' },
];

describe('readEventStream', () => {
  it('lee eventos aunque vengan partidos entre trozos (también en mitad de un carácter)', async () => {
    const text = events.map(encodeEvent).join('');
    const bytes = new TextEncoder().encode(text);
    // Corta en trozos de 7 bytes: parte JSON y caracteres multibyte.
    const pieces: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 7) pieces.push(bytes.slice(i, i + 7));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        pieces.forEach((p) => controller.enqueue(p));
        controller.close();
      },
    });
    const got: ScanEvent[] = [];
    await readEventStream(stream, (e) => got.push(e));
    expect(got).toEqual(events);
  });

  it('procesa una última línea sin salto final e ignora líneas vacías', async () => {
    const got: ScanEvent[] = [];
    await readEventStream(streamOf(['\n\n', JSON.stringify(events[1])]), (e) => got.push(e));
    expect(got).toEqual([events[1]]);
  });
});
