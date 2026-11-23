import { describe, expect, it } from 'vitest';
import { embeddedIPv4, isBlockedIp } from '@/lib/net/ip';

describe('isBlockedIp', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '192.0.2.10',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'fe80::1%eth0',
    'ff02::1',
    '2001:db8::1',
    '[::1]',
  ])('bloquea %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.32.0.1',
    '93.184.216.34',
    '2606:4700:4700::1111',
    '2a00:1450:4003:80f::200e',
  ])('permite la IP pública %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });

  it.each([
    ['::ffff:127.0.0.1', true],
    ['::ffff:7f00:1', true],
    ['::ffff:169.254.169.254', true],
    ['::ffff:8.8.8.8', false],
    ['64:ff9b::10.0.0.1', true],
    ['64:ff9b::808:808', false],
    ['::127.0.0.1', true],
  ])('evalúa la IPv4 incrustada en %s', (ip, blocked) => {
    expect(isBlockedIp(ip)).toBe(blocked);
  });

  it('trata como bloqueado lo que no es una IP', () => {
    expect(isBlockedIp('no-es-una-ip')).toBe(true);
    expect(isBlockedIp('')).toBe(true);
  });
});

describe('embeddedIPv4', () => {
  it('devuelve null si no hay IPv4 incrustada', () => {
    expect(embeddedIPv4('2606:4700::1111')).toBeNull();
    expect(embeddedIPv4('1.2.3.4')).toBeNull();
    expect(embeddedIPv4('::1')).toBeNull();
  });

  it('extrae la IPv4 de una dirección mapeada', () => {
    expect(embeddedIPv4('::ffff:c0a8:0101')).toBe('192.168.1.1');
  });
});
