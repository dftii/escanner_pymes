import type { Locale } from './i18n';
import type { ReportData } from './report';
import { UI } from './ui';
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
  locale: Locale = 'es',
): Promise<ReportData> {
  const t = UI[locale];
  let res: Response;
  try {
    res = await fetcher('/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(locale === 'es' ? { domain, consent } : { domain, consent, locale }),
    });
  } catch {
    throw new Error(t.errorConnect);
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? t.errorGeneric);
  }
  let result: ReportData | null = null;
  await readEventStream(res.body, (e) => {
    if (e.type === 'category') onCategory?.(e.category);
    else if (e.type === 'done') result = e.result;
    else throw new Error(e.message);
  });
  if (!result) throw new Error(t.errorInterrupted);
  return result;
}
