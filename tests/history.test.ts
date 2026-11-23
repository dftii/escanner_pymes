import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserStorage,
  clearHistory,
  HISTORY_KEY,
  HISTORY_MAX,
  isSaved,
  loadHistory,
  previousReport,
  removeReport,
  saveReport,
  type StorageLike,
} from '@/lib/history';
import type { ReportData } from '@/lib/report';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  /** Tamaño máximo en caracteres, para simular un almacenamiento lleno. */
  constructor(private readonly quota = Infinity) {}
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (v.length > this.quota) throw new Error('QuotaExceededError');
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const report = (domain: string, day: number): ReportData => ({
  domain,
  scannedAt: new Date(Date.UTC(2026, 10, day)).toISOString(),
  findings: [
    { id: 'ssl.expiry', category: 'ssl', status: 'ok', title: 't', detail: '', risk: '', fix: [] },
  ],
  notices: [],
});

afterEach(() => vi.unstubAllGlobals());

describe('historial', () => {
  it('guarda sin duplicar y devuelve del más reciente al más antiguo', () => {
    const s = new MemoryStorage();
    saveReport(s, report('a.es', 1));
    saveReport(s, report('b.es', 3));
    const list = saveReport(s, report('a.es', 1))!;
    expect(list.map((r) => r.domain)).toEqual(['a.es', 'b.es']);
    expect(loadHistory(s).map((r) => r.domain)).toEqual(['b.es', 'a.es']);
    expect(isSaved(loadHistory(s), report('a.es', 1))).toBe(true);
    expect(isSaved(loadHistory(s), report('a.es', 2))).toBe(false);
  });

  it(`guarda como mucho ${HISTORY_MAX}`, () => {
    const s = new MemoryStorage();
    for (let d = 1; d <= HISTORY_MAX + 5; d++) saveReport(s, report('a.es', d));
    expect(loadHistory(s)).toHaveLength(HISTORY_MAX);
  });

  it('si el almacenamiento se llena, descarta los más antiguos', () => {
    const one = JSON.stringify([report('a.es', 1)]).length;
    const s = new MemoryStorage(one * 2 + 10);
    saveReport(s, report('a.es', 1));
    saveReport(s, report('a.es', 2));
    const list = saveReport(s, report('a.es', 3))!;
    expect(list.map((r) => r.scannedAt.slice(8, 10))).toEqual(['03', '02']);
    expect(saveReport(new MemoryStorage(5), report('a.es', 1))).toBeNull();
  });

  it('borra uno o todos', () => {
    const s = new MemoryStorage();
    saveReport(s, report('a.es', 1));
    saveReport(s, report('b.es', 2));
    expect(removeReport(s, report('a.es', 1)).map((r) => r.domain)).toEqual(['b.es']);
    expect(removeReport(s, report('b.es', 2))).toEqual([]);
    expect(s.data.has(HISTORY_KEY)).toBe(false);
    saveReport(s, report('a.es', 1));
    clearHistory(s);
    expect(loadHistory(s)).toEqual([]);
  });

  it('ignora datos corruptos o manipulados', () => {
    const s = new MemoryStorage();
    s.setItem(HISTORY_KEY, '{malo');
    expect(loadHistory(s)).toEqual([]);
    s.setItem(HISTORY_KEY, '{"a":1}');
    expect(loadHistory(s)).toEqual([]);
    s.setItem(
      HISTORY_KEY,
      JSON.stringify([
        report('a.es', 1),
        { domain: 'x', scannedAt: 'nunca', findings: [], notices: [] },
        { domain: 'y', scannedAt: '2026-01-01', findings: [null], notices: [] },
        null,
      ]),
    );
    expect(loadHistory(s).map((r) => r.domain)).toEqual(['a.es']);
  });

  it('sin almacenamiento no hace nada', () => {
    expect(loadHistory(null)).toEqual([]);
    expect(saveReport(null, report('a.es', 1))).toBeNull();
    expect(removeReport(null, report('a.es', 1))).toEqual([]);
    expect(() => clearHistory(null)).not.toThrow();
    const broken = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('x');
      },
    };
    expect(() => clearHistory(broken)).not.toThrow();
  });

  it('encuentra el informe anterior del mismo dominio', () => {
    const list = [report('a.es', 1), report('a.es', 5), report('b.es', 4), report('a.es', 9)];
    expect(previousReport(list, report('a.es', 9))!.scannedAt).toBe(report('a.es', 5).scannedAt);
    expect(previousReport(list, report('a.es', 1))).toBeNull();
  });
});

describe('browserStorage', () => {
  it('devuelve null si no hay localStorage o falla', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(browserStorage()).toBeNull();
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(browserStorage()).toBeNull();
  });

  it('devuelve localStorage si funciona', () => {
    const s = new MemoryStorage();
    vi.stubGlobal('localStorage', s);
    expect(browserStorage()).toBe(s);
  });
});
