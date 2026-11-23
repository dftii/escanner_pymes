import { describe, expect, it } from 'vitest';
import {
  checkEmailDns,
  countSpfLookups,
  DKIM_SELECTORS,
  emailDomainOf,
  mailProvider,
  parseDmarc,
  parseSpf,
} from '@/lib/checks/emailDns';
import { mxRecords, txtRecords } from '@/lib/net/dnsClient';
import type { Finding } from '@/lib/types';
import { fakeDns, type FakeZone } from '../helpers/fakeDns';

const D = 'minegocio.es';
const GOOD: FakeZone = {
  mx: { [D]: [[10, 'aspmx.l.google.com']] },
  txt: {
    [D]: ['google-site-verification=abc', 'v=spf1 include:_spf.google.com -all'],
    '_spf.google.com': 'v=spf1 include:_netblocks.google.com ~all',
    '_netblocks.google.com': 'v=spf1 ip4:35.190.247.0/24 ~all',
    [`_dmarc.${D}`]: 'v=DMARC1; p=reject; rua=mailto:dmarc@minegocio.es',
    [`google._domainkey.${D}`]: [['v=DKIM1; k=rsa; ', 'p=MIIBIjANBgkqh']],
  },
};

const run = async (zone: FakeZone, domain = D) =>
  Object.fromEntries((await checkEmailDns(domain, fakeDns(zone))).map((f) => [f.id, f])) as Record<
    string,
    Finding
  >;

const withTxt = (txt: FakeZone['txt']): FakeZone => ({ ...GOOD, txt: { ...GOOD.txt, ...txt } });

describe('checkEmailDns', () => {
  it('dominio bien configurado', async () => {
    const f = await run(GOOD);
    expect(Object.keys(f)).toEqual(['email.mx', 'email.spf', 'email.dmarc', 'email.dkim']);
    expect(f['email.mx']).toMatchObject({
      status: 'ok',
      title: 'Recibes el correo en Google Workspace',
    });
    expect(f['email.spf']).toMatchObject({ status: 'ok' });
    expect(f['email.spf']!.detail).toContain('Usa 2 de 10');
    expect(f['email.dmarc']).toMatchObject({
      status: 'ok',
      title: 'DMARC activo en modo "reject"',
    });
    expect(f['email.dmarc']!.detail).toContain('dmarc@minegocio.es');
    expect(f['email.dkim']).toMatchObject({ status: 'ok' });
    expect(f['email.dkim']!.evidence).toEqual({ selectors: ['google'] });
    for (const finding of Object.values(f)) expect(finding.category).toBe('email');
  });

  it('usa el dominio sin www', async () => {
    const dns = fakeDns(GOOD);
    await checkEmailDns(`www.${D}`, dns);
    expect(dns.queries).toContain(`TXT _dmarc.${D}`);
    expect(dns.queries.some((q) => q.includes('www.'))).toBe(false);
    expect(emailDomainOf('www.a.es')).toBe('a.es');
  });

  it('dominio sin nada configurado', async () => {
    const f = await run({});
    expect(f['email.mx']).toMatchObject({ status: 'info', title: 'Tu dominio no recibe correo' });
    expect(f['email.spf']).toMatchObject({ status: 'fail' });
    expect(f['email.spf']!.detail).toContain('v=spf1 -all');
    expect(f['email.dmarc']).toMatchObject({ status: 'fail' });
    expect(f['email.dkim']).toMatchObject({ status: 'info' });
    expect((f['email.dkim']!.evidence as { tried: string[] }).tried).toEqual([...DKIM_SELECTORS]);
  });

  it('MX nulo (RFC 7505) cuenta como "no recibe correo"', async () => {
    const f = await run({ mx: { [D]: [[0, '.']] } });
    expect(f['email.mx']).toMatchObject({ status: 'info' });
  });

  it('proveedor desconocido', async () => {
    const f = await run({ ...GOOD, mx: { [D]: [[5, 'mail.minegocio.es']] } });
    expect(f['email.mx']).toMatchObject({
      status: 'ok',
      title: 'Tu dominio tiene correo configurado',
    });
  });

  describe('SPF', () => {
    it.each([
      ['v=spf1 include:_spf.google.com ~all', 'info', 'flexible'],
      ['v=spf1 +all', 'fail', '+all'],
      ['v=spf1 mx ?all', 'fail', '?all'],
      ['v=spf1 mx', 'warning', 'no termina'],
      ['v=spf1 ptr -all', 'warning', 'correctamente'],
      ['v=spf1 redirect=_spf.google.com', 'info', 'flexible'],
    ])('%s → %s', async (record, status, text) => {
      const f = await run(withTxt({ [D]: record }));
      expect(f['email.spf']).toMatchObject({ status });
      expect(f['email.spf']!.title).toContain(text);
    });

    it('un SPF sin all pero con redirect no avisa por falta de all', async () => {
      const f = await run(withTxt({ [D]: 'v=spf1 redirect=other.es', 'other.es': 'v=spf1 -all' }));
      expect(f['email.spf']).toMatchObject({ status: 'ok' });
    });

    it('varios registros SPF', async () => {
      const f = await run(withTxt({ [D]: ['v=spf1 mx -all', 'v=spf1 include:x.com -all'] }));
      expect(f['email.spf']).toMatchObject({
        status: 'fail',
        title: 'Hay varios registros SPF y eso lo invalida',
      });
    });

    it('demasiadas consultas', async () => {
      const txt: FakeZone['txt'] = {
        [D]: `v=spf1 ${Array.from({ length: 6 }, (_, i) => `include:i${i}.es`).join(' ')} -all`,
      };
      for (let i = 0; i < 6; i++) txt[`i${i}.es`] = 'v=spf1 a mx -all';
      const f = await run(withTxt(txt));
      expect(f['email.spf']).toMatchObject({ status: 'fail' });
      expect(f['email.spf']!.title).toContain('demasiadas consultas');
    });

    it('SPF que falta, con correo configurado', async () => {
      const f = await run(withTxt({ [D]: 'google-site-verification=x' }));
      expect(f['email.spf']).toMatchObject({ status: 'fail' });
      expect(f['email.spf']!.detail).not.toContain('v=spf1 -all');
    });
  });

  describe('DMARC', () => {
    it.each([
      ['v=DMARC1; p=quarantine', 'ok', '"quarantine"'],
      ['v=DMARC1; p=reject; pct=25', 'warning', '25 %'],
      ['v=DMARC1; p=none; rua=mailto:a@b.es', 'warning', 'solo observa'],
      ['v=DMARC1; rua=mailto:a@b.es', 'fail', 'no es válido'],
      ['v=DMARC1; p=bloquear', 'fail', 'no es válido'],
    ])('%s → %s', async (record, status, text) => {
      const f = await run(withTxt({ [`_dmarc.${D}`]: record }));
      expect(f['email.dmarc']).toMatchObject({ status });
      expect(f['email.dmarc']!.title).toContain(text);
    });

    it('avisa si no pide informes', async () => {
      const f = await run(withTxt({ [`_dmarc.${D}`]: 'v=DMARC1; p=quarantine' }));
      expect(f['email.dmarc']!.detail).toContain('No pides informes');
    });

    it('varios registros DMARC', async () => {
      const f = await run(withTxt({ [`_dmarc.${D}`]: ['v=DMARC1; p=none', 'v=DMARC1; p=reject'] }));
      expect(f['email.dmarc']!.title).toContain('varios registros');
    });

    it('ignora TXT que no son DMARC', async () => {
      const f = await run(withTxt({ [`_dmarc.${D}`]: 'otra-cosa' }));
      expect(f['email.dmarc']).toMatchObject({ status: 'fail', title: 'Falta la política DMARC' });
    });
  });

  describe('DKIM', () => {
    it('una clave revocada (p= vacío) no cuenta', async () => {
      const f = await run(withTxt({ [`google._domainkey.${D}`]: 'v=DKIM1; p=' }));
      expect(f['email.dkim']).toMatchObject({ status: 'info' });
    });

    it('encuentra varios selectores', async () => {
      const f = await run(
        withTxt({
          [`selector1._domainkey.${D}`]: 'v=DKIM1; p=AAA',
          [`selector2._domainkey.${D}`]: 'p=BBB',
        }),
      );
      expect((f['email.dkim']!.evidence as { selectors: string[] }).selectors).toEqual([
        'google',
        'selector1',
        'selector2',
      ]);
    });

    it('si todas las consultas DKIM fallan, sale como error', async () => {
      const fail = Object.fromEntries(
        DKIM_SELECTORS.map((s) => [`${s}._domainkey.${D}`, 'ETIMEOUT']),
      );
      const f = await run({ ...GOOD, fail });
      expect(f['email.dkim']).toMatchObject({ status: 'error' });
    });
  });

  it('un fallo de DNS en una parte no afecta al resto', async () => {
    const f = await run({ ...GOOD, fail: { [`_dmarc.${D}`]: 'ESERVFAIL', [D]: 'ETIMEOUT' } });
    expect(f['email.dmarc']).toMatchObject({ status: 'error' });
    expect(f['email.mx']).toMatchObject({ status: 'error' });
    expect(f['email.spf']).toMatchObject({ status: 'error' });
    expect(f['email.dkim']).toMatchObject({ status: 'ok' });
  });
});

describe('parseSpf', () => {
  it('cuenta mecanismos con consulta DNS', () => {
    const info = parseSpf(
      'v=spf1 a mx:mail.x.es ip4:1.2.3.4 include:a.es exists:%{i}.x.es ptr -all',
    );
    expect(info).toEqual({
      all: '-',
      includes: ['a.es'],
      redirect: null,
      directLookups: 5,
      usesPtr: true,
    });
  });
});

describe('countSpfLookups', () => {
  it('no entra en bucles ni sigue macros', async () => {
    const dns = fakeDns({
      txt: {
        'a.es': 'v=spf1 include:b.es -all',
        'b.es': 'v=spf1 include:a.es include:%{d}.x -all',
      },
    });
    expect(await countSpfLookups('v=spf1 include:a.es -all', dns)).toBe(4);
  });

  it('un include sin SPF suma solo su consulta', async () => {
    expect(await countSpfLookups('v=spf1 include:nada.es -all', fakeDns({}))).toBe(1);
  });
});

describe('parseDmarc', () => {
  it('lee etiquetas', () => {
    expect(parseDmarc('v=DMARC1; p=reject; rua=mailto:a@b.es,mailto:c@d.es; ;x')).toEqual({
      v: 'DMARC1',
      p: 'reject',
      rua: 'mailto:a@b.es,mailto:c@d.es',
    });
  });
});

describe('mailProvider', () => {
  it.each([
    ['minegocio-es.mail.protection.outlook.com.', 'Microsoft 365'],
    ['mx1.ovh.net', 'OVHcloud'],
    ['mx00.ionos.es', 'IONOS'],
    ['mail.otro.es', null],
  ])('%s → %s', (exchange, provider) => {
    expect(mailProvider([{ priority: 1, exchange }])).toBe(provider);
  });
});

describe('dnsClient helpers', () => {
  it('une los trozos de un TXT y ordena los MX', async () => {
    const dns = fakeDns({
      txt: { 'a.es': [['v=spf1 ', 'mx -all']] },
      mx: {
        'a.es': [
          [20, 'b'],
          [10, 'a'],
        ],
      },
    });
    expect(await txtRecords(dns, 'a.es')).toEqual(['v=spf1 mx -all']);
    expect((await mxRecords(dns, 'a.es')).map((m) => m.exchange)).toEqual(['a', 'b']);
  });

  it('propaga errores que no son "no existe"', async () => {
    const dns = fakeDns({ fail: { 'a.es': 'ETIMEOUT' } });
    await expect(txtRecords(dns, 'a.es')).rejects.toMatchObject({ code: 'ETIMEOUT' });
    await expect(mxRecords(dns, 'a.es')).rejects.toMatchObject({ code: 'ETIMEOUT' });
  });
});
