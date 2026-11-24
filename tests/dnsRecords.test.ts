import { describe, expect, it } from 'vitest';
import { recordLine, suggestDmarc, suggestSpf } from '@/lib/dnsRecords';

const D = 'minegocio.es';
const spf = (over: Partial<Parameters<typeof suggestSpf>[0]> = {}) =>
  suggestSpf({ domain: D, current: [], provider: null, mxHosts: [], noMail: false, ...over });

describe('suggestSpf', () => {
  it('dominio sin correo: -all', () => {
    expect(spf({ noMail: true })).toMatchObject({
      type: 'TXT',
      host: '@',
      fqdn: D,
      value: 'v=spf1 -all',
    });
  });

  it.each([
    ['Google Workspace', [], 'v=spf1 include:_spf.google.com ~all'],
    ['Microsoft 365', [], 'v=spf1 include:spf.protection.outlook.com ~all'],
    ['Zoho Mail', ['mx.zoho.com'], 'v=spf1 include:zohomail.com ~all'],
    ['Zoho Mail', ['mx.zoho.eu.'], 'v=spf1 include:zohomail.eu ~all'],
    ['OVHcloud', [], 'v=spf1 include:mx.ovh.com ~all'],
  ])('proveedor %s', (provider, mxHosts, value) => {
    const r = spf({ provider, mxHosts })!;
    expect(r.value).toBe(value);
    expect(r.note).toContain(provider);
  });

  it('proveedor desconocido: mx', () => {
    expect(spf({ provider: 'Arsys' })!.value).toBe('v=spf1 mx ~all');
    expect(spf()!.value).toBe('v=spf1 mx ~all');
  });

  it('corrige el final de un SPF existente sin perder servicios', () => {
    const r = spf({ current: ['v=spf1 include:_spf.google.com a +all'] })!;
    expect(r.value).toBe('v=spf1 include:_spf.google.com a ~all');
    expect(r.note).toContain('Sustituye');
    expect(spf({ current: ['v=spf1 ip4:1.2.3.4'] })!.value).toBe('v=spf1 ip4:1.2.3.4 ~all');
  });

  it('une varios registros en uno', () => {
    const r = spf({
      current: [
        'v=spf1 include:_spf.google.com ~all',
        'v=spf1 include:mx.ovh.com include:_spf.google.com -all',
      ],
    })!;
    expect(r.value).toBe('v=spf1 include:_spf.google.com include:mx.ovh.com ~all');
    expect(r.note).toContain('único');
  });

  it('un SPF vacío se trata como si no hubiera', () => {
    expect(spf({ current: ['v=spf1 ?all'], provider: 'Google Workspace' })!.value).toBe(
      'v=spf1 include:_spf.google.com ~all',
    );
  });
});

describe('suggestDmarc', () => {
  it('dominio sin correo: reject directamente', () => {
    expect(suggestDmarc({ domain: D, current: null, noMail: true })).toEqual([
      expect.objectContaining({ host: '_dmarc', fqdn: `_dmarc.${D}`, value: 'v=DMARC1; p=reject' }),
    ]);
  });

  it('sin DMARC: plan en tres pasos con buzón de informes propuesto', () => {
    const steps = suggestDmarc({ domain: D, current: null, noMail: false });
    expect(steps.map((s) => s.value)).toEqual([
      `v=DMARC1; p=none; rua=mailto:dmarc@${D}`,
      `v=DMARC1; p=quarantine; rua=mailto:dmarc@${D}`,
      `v=DMARC1; p=reject; rua=mailto:dmarc@${D}`,
    ]);
    expect(steps[0]!.note).toContain(`dmarc@${D}`);
    expect(steps[0]!.label).toContain('Paso 1');
  });

  it('en p=none: siguiente paso quarantine, conservando su rua', () => {
    const steps = suggestDmarc({
      domain: D,
      current: 'v=DMARC1; p=none; rua=mailto:informes@ejemplo.com',
      noMail: false,
    });
    expect(steps.map((s) => s.value)).toEqual([
      'v=DMARC1; p=quarantine; rua=mailto:informes@ejemplo.com',
      'v=DMARC1; p=reject; rua=mailto:informes@ejemplo.com',
    ]);
    expect(steps[0]!.note).not.toContain('Crea el buzón');
  });

  it('recordLine', () => {
    expect(recordLine(suggestDmarc({ domain: D, current: null, noMail: true })[0]!)).toBe(
      'TXT _dmarc: v=DMARC1; p=reject',
    );
  });
});
