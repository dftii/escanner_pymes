import type { ReportData } from './report';
import { parseReport } from './reportSchema';

/**
 * Enlace para compartir un informe sin guardarlo en ningún sitio: el informe
 * va comprimido en el fragmento de la URL (`#r=…`), que el navegador nunca
 * envía al servidor. Quien abre el enlace ve exactamente lo que se compartió.
 */
export const SHARE_PARAM = 'r';
/** Tope del texto del enlace y del informe descomprimido (evita bombas de compresión). */
export const MAX_ENCODED = 200_000;
export const MAX_DECODED = 1_000_000;

const toBase64Url = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (text: string) => {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function readAll(stream: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('Informe demasiado grande');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Comprime el informe (sin los datos técnicos de `evidence`, que no se muestran). */
export async function encodeReport(report: ReportData): Promise<string> {
  const slim: ReportData = {
    domain: report.domain,
    scannedAt: report.scannedAt,
    notices: report.notices,
    findings: report.findings.map((f) => {
      const copy = { ...f };
      delete copy.evidence;
      return copy;
    }),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(slim));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return toBase64Url(await readAll(stream, MAX_DECODED));
}

/** Devuelve el informe del enlace, o `null` si está roto, es enorme o no es válido. */
export async function decodeReport(encoded: string): Promise<ReportData | null> {
  if (!encoded || encoded.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const stream = new Blob([fromBase64Url(encoded)])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    const json = new TextDecoder().decode(await readAll(stream, MAX_DECODED));
    return parseReport(JSON.parse(json));
  } catch {
    return null;
  }
}

export const shareUrl = (origin: string, encoded: string) => `${origin}/#${SHARE_PARAM}=${encoded}`;

/** El informe codificado de un `location.hash`, si lo hay. */
export function sharedFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get(SHARE_PARAM);
}
