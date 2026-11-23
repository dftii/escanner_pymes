import type { ReportData } from './report';

/**
 * Historial de informes guardado SOLO en el navegador del usuario
 * (localStorage), y solo cuando pulsa "Guardar en este navegador". Nada sale
 * de su equipo. Es almacenamiento que el propio usuario pide, así que está
 * exento de consentimiento (art. 22.2 LSSI-CE).
 */
export const HISTORY_KEY = 'escaner-pymes:historial:v1';
export const HISTORY_MAX = 20;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** `localStorage` si existe y funciona (puede fallar en modo privado o bloqueado). */
export function browserStorage(): StorageLike | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = `${HISTORY_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const isReport = (v: unknown): v is ReportData => {
  const r = v as Partial<ReportData> | null;
  return (
    !!r &&
    typeof r.domain === 'string' &&
    typeof r.scannedAt === 'string' &&
    !Number.isNaN(Date.parse(r.scannedAt)) &&
    Array.isArray(r.findings) &&
    r.findings.every(
      (f) =>
        !!f &&
        typeof f.id === 'string' &&
        typeof f.status === 'string' &&
        typeof f.title === 'string',
    ) &&
    Array.isArray(r.notices)
  );
};

/** Informes guardados, del más reciente al más antiguo. Ignora datos corruptos. */
export function loadHistory(storage: StorageLike | null): ReportData[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isReport)
      .sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt));
  } catch {
    return [];
  }
}

const sameReport = (a: ReportData, b: ReportData) =>
  a.domain === b.domain && a.scannedAt === b.scannedAt;

function write(storage: StorageLike, list: readonly ReportData[]): boolean {
  try {
    if (list.length === 0) storage.removeItem(HISTORY_KEY);
    else storage.setItem(HISTORY_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda un informe (sin duplicar). Si se supera el máximo o se llena el
 * almacenamiento, descarta los más antiguos.
 * @returns la lista resultante, o `null` si no se ha podido guardar.
 */
export function saveReport(storage: StorageLike | null, report: ReportData): ReportData[] | null {
  if (!storage) return null;
  let list = [report, ...loadHistory(storage).filter((r) => !sameReport(r, report))].slice(
    0,
    HISTORY_MAX,
  );
  while (list.length > 0) {
    if (write(storage, list)) return list;
    list = list.slice(0, -1);
  }
  return null;
}

export function removeReport(storage: StorageLike | null, report: ReportData): ReportData[] {
  if (!storage) return [];
  const list = loadHistory(storage).filter((r) => !sameReport(r, report));
  write(storage, list);
  return list;
}

export function clearHistory(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
  } catch {
    // Nada que hacer: el navegador no deja tocar el almacenamiento.
  }
}

export const isSaved = (list: readonly ReportData[], report: ReportData) =>
  list.some((r) => sameReport(r, report));

/** El informe guardado anterior del mismo dominio, para ver la evolución. */
export function previousReport(list: readonly ReportData[], report: ReportData): ReportData | null {
  const t = Date.parse(report.scannedAt);
  return (
    list
      .filter((r) => r.domain === report.domain && Date.parse(r.scannedAt) < t)
      .sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt))[0] ?? null
  );
}
