import { BlockList, isIP } from 'node:net';

/**
 * Rangos que nunca se pueden contactar desde el escáner (protección SSRF):
 * privados, loopback, link-local (incluye 169.254.169.254, metadatos cloud),
 * CGNAT, documentación, benchmarking, multicast y reservados.
 */
const BLOCKED_V4: ReadonlyArray<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const BLOCKED_V6: ReadonlyArray<[string, number]> = [
  ['::', 128],
  ['::1', 128],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
];

const blockList = new BlockList();
for (const [net, prefix] of BLOCKED_V4) blockList.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of BLOCKED_V6) blockList.addSubnet(net, prefix, 'ipv6');

/**
 * `true` si la IP es privada, reservada o no es una IP válida.
 * Las IPv6 que llevan una IPv4 dentro (`::ffff:a.b.c.d`, NAT64 `64:ff9b::/96`,
 * IPv4-compatible `::a.b.c.d`) se evalúan por su IPv4.
 */
export function isBlockedIp(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const family = isIP(ip);
  if (family === 4) return blockList.check(ip, 'ipv4');
  if (family !== 6) return true;

  const embedded = embeddedIPv4(ip);
  if (embedded) return blockList.check(embedded, 'ipv4');
  return blockList.check(ip, 'ipv6');
}

/** Extrae la IPv4 incrustada en una IPv6 mapeada, compatible o NAT64. */
export function embeddedIPv4(ipv6: string): string | null {
  const groups = expandIPv6(ipv6);
  if (!groups) return null;
  const head = groups.slice(0, 6);
  const isMapped = head.slice(0, 5).every((g) => g === 0) && head[5] === 0xffff;
  const isCompatible = head.every((g) => g === 0) && (groups[6]! !== 0 || groups[7]! > 1);
  const isNat64 =
    groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0);
  if (!isMapped && !isCompatible && !isNat64) return null;
  const hi = groups[6]!;
  const lo = groups[7]!;
  return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join('.');
}

/** Expande una IPv6 a sus 8 grupos de 16 bits. Admite la notación con IPv4 al final. */
function expandIPv6(ip: string): number[] | null {
  if (isIP(ip) !== 6) return null;
  let text = ip.toLowerCase();
  const v4Tail = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (v4Tail) {
    const octets = v4Tail[1]!.split('.').map(Number);
    const hex = `${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
    text = text.slice(0, v4Tail.index) + hex;
  }
  const [left = '', right] = text.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const missing = 8 - leftGroups.length - rightGroups.length;
  const all =
    right === undefined ? leftGroups : [...leftGroups, ...Array(missing).fill('0'), ...rightGroups];
  return all.map((g) => parseInt(g, 16));
}
