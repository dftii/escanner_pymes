import { isIP } from 'node:net';
import { ScanError } from './errors';

/** TLD y sufijos que nunca son una web pública de un negocio. */
const RESERVED_SUFFIXES = [
  'localhost',
  'local',
  'localdomain',
  'internal',
  'intranet',
  'lan',
  'home',
  'corp',
  'test',
  'example',
  'invalid',
  'onion',
  'arpa',
  'home.arpa',
];

const LABEL_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD_RE = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Convierte lo que escribe el usuario en un nombre de dominio limpio.
 *
 * Acepta `https://www.Ejemplo.es/contacto?x=1`, `ejemplo.es:443`, `ejemplo.es.`
 * o dominios con tildes (`peluquería.es` → `xn--peluquera-n5a.es`).
 * Rechaza IPs, `localhost`, nombres sin punto y TLD reservados.
 *
 * @throws {ScanError} con un mensaje listo para el usuario.
 */
export function normalizeDomain(input: string): string {
  const raw = input.trim();
  if (!raw) throw invalid('Escribe el dominio de tu web, por ejemplo: minegocio.es');
  if (raw.length > 2048) throw invalid('El texto es demasiado largo para ser un dominio.');
  if (/\s/.test(raw)) throw invalid('El dominio no puede contener espacios.');

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw invalid('No reconocemos ese dominio. Escríbelo así: minegocio.es');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid('Escribe solo el dominio de tu web, por ejemplo: minegocio.es');
  }
  if (url.username || url.password) {
    throw invalid('El dominio no puede incluir usuario ni contraseña.');
  }

  // `URL` ya pasa a minúsculas y convierte IDN a punycode.
  const hostname = url.hostname.replace(/\.$/, '');
  const bareHost = hostname.replace(/^\[|\]$/g, '');

  if (isIP(bareHost)) {
    throw new ScanError(
      'ip_not_allowed',
      'Escribe el nombre del dominio (minegocio.es), no una dirección IP.',
    );
  }
  if (hostname.length > 253) throw invalid('El dominio es demasiado largo.');

  const labels = hostname.split('.');
  if (labels.length < 2) {
    throw invalid('Falta la extensión del dominio, por ejemplo: minegocio.es');
  }
  if (!labels.every((label) => LABEL_RE.test(label))) {
    throw invalid('El dominio contiene caracteres no válidos.');
  }
  const tld = labels.at(-1)!;
  if (!TLD_RE.test(tld)) throw invalid('La extensión del dominio no es válida.');

  if (RESERVED_SUFFIXES.some((s) => hostname === s || hostname.endsWith(`.${s}`))) {
    throw new ScanError(
      'reserved_domain',
      'Ese dominio es interno o reservado y no es una web pública.',
    );
  }

  return hostname;
}

function invalid(message: string): ScanError {
  return new ScanError('invalid_domain', message);
}
