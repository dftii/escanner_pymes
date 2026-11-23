import type { ReportData } from './report';
import { readEventStream } from './scanStream';
import type { Category } from './types';

/**
 * Pide un análisis a `/api/scan` desde el navegador y va avisando de cada
 * categoría terminada. Lanza un `Error` con un mensaje para mostrar tal cual.
 */
export async function requestScan(
  domain: string,
  consent: boolean,
  onCategory?: (category: Category) => void,
  fetcher: typeof fetch = fetch,
): Promise<ReportData> {
  let res: Response;
  try {
    res = await fetcher('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain, consent }),
    });
  } catch {
    throw new Error('No hemos podido conectar con el servidor. Revisa tu conexión.');
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? 'No hemos podido analizar el dominio.');
  }
  let result: ReportData | null = null;
  await readEventStream(res.body, (e) => {
    if (e.type === 'category') onCategory?.(e.category);
    else if (e.type === 'done') result = e.result;
    else throw new Error(e.message);
  });
  if (!result) throw new Error('El análisis se ha interrumpido. Inténtalo de nuevo.');
  return result;
}
