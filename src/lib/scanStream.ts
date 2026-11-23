import type { Category, Finding } from './types';

/**
 * Protocolo de `POST /api/scan`: NDJSON, un evento JSON por línea.
 * Permite mostrar el progreso real de cada categoría según termina.
 * Sin dependencias de Node: lo usan el servidor y el navegador.
 */
export type ScanEvent =
  | { type: 'category'; category: Category; findings: Finding[] }
  | {
      type: 'done';
      result: {
        domain: string;
        scannedAt: string;
        finalUrl: string | null;
        durationMs: number;
        findings: Finding[];
        notices: string[];
      };
    }
  | { type: 'error'; message: string };

export const NDJSON = 'application/x-ndjson; charset=utf-8';

export const encodeEvent = (event: ScanEvent) => `${JSON.stringify(event)}\n`;

/** Lee un flujo NDJSON y llama a `onEvent` por cada línea completa. */
export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ScanEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const flush = (text: string) => {
    for (const line of text.split('\n')) {
      if (line.trim()) onEvent(JSON.parse(line) as ScanEvent);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lastNewline = buffer.lastIndexOf('\n');
    if (lastNewline >= 0) {
      flush(buffer.slice(0, lastNewline));
      buffer = buffer.slice(lastNewline + 1);
    }
  }
  flush(buffer + decoder.decode());
}
