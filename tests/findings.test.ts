import { describe, expect, it } from 'vitest';
import { errorFinding, groupByCategory, sortBySeverity } from '@/lib/findings';
import type { Finding } from '@/lib/types';

const make = (id: string, status: Finding['status'], category: Finding['category'] = 'ssl') =>
  ({ id, category, status, title: id, detail: '', risk: '', fix: [] }) satisfies Finding;

describe('sortBySeverity', () => {
  it('pone primero fail, luego warning, error, info y ok', () => {
    const input = [
      make('a', 'ok'),
      make('b', 'info'),
      make('c', 'fail'),
      make('d', 'warning'),
      make('e', 'error'),
    ];
    expect(sortBySeverity(input).map((f) => f.id)).toEqual(['c', 'd', 'e', 'b', 'a']);
  });

  it('es estable dentro del mismo nivel y no muta la entrada', () => {
    const input = [make('a', 'warning'), make('b', 'ok'), make('c', 'warning')];
    const snapshot = input.map((f) => f.id);
    expect(sortBySeverity(input).map((f) => f.id)).toEqual(['a', 'c', 'b']);
    expect(input.map((f) => f.id)).toEqual(snapshot);
  });
});

describe('groupByCategory', () => {
  it('agrupa por categoría y devuelve todas las claves aunque estén vacías', () => {
    const groups = groupByCategory([
      make('a', 'ok', 'email'),
      make('b', 'fail', 'email'),
      make('c', 'ok', 'ssl'),
    ]);
    expect(groups.email.map((f) => f.id)).toEqual(['a', 'b']);
    expect(groups.ssl).toHaveLength(1);
    expect(groups.headers).toEqual([]);
    expect(groups.privacy).toEqual([]);
  });
});

describe('errorFinding', () => {
  it('convierte un Error en un hallazgo con estado error', () => {
    const f = errorFinding('ssl.expiry', 'ssl', new Error('timeout'));
    expect(f).toMatchObject({ id: 'ssl.expiry', category: 'ssl', status: 'error' });
    expect(f.evidence).toEqual({ reason: 'timeout' });
    expect(f.fix.length).toBeGreaterThan(0);
  });

  it('acepta causas que no son Error', () => {
    expect(errorFinding('x', 'privacy', 'ECONNRESET').evidence).toEqual({ reason: 'ECONNRESET' });
  });
});
