import { messages, type Locale } from '../i18n';
import type { ScanError, ScanErrorCode } from './errors';

/**
 * Mensajes de error para el usuario en catalán e inglés, por código. Los de
 * español son los propios de cada `ScanError`, más concretos.
 */
export const MSG = messages({
  es: {
    invalid_domain: '',
    reserved_domain: '',
    ip_not_allowed: '',
    domain_not_found: '',
    private_address: '',
    bad_url: '',
    too_many_redirects: '',
    timeout: '',
    network: '',
    rate_limited: (min: number) => `${min}`,
    consent_required: '',
    unexpected: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
  },
  ca: {
    invalid_domain:
      'Aquest domini no sembla vàlid. Escriu-lo com a minegoci.cat, sense http:// ni espais.',
    reserved_domain: 'Aquest domini és intern o reservat i no es pot analitzar.',
    ip_not_allowed: 'Escriu el nom del domini (per exemple, minegoci.cat), no una adreça IP.',
    domain_not_found:
      'No trobem aquest domini. Revisa que estigui ben escrit i que el web estigui publicat.',
    private_address:
      'Aquest domini apunta a una adreça interna o reservada, així que no el podem analitzar.',
    bad_url: 'El web ens ha enviat a una adreça que no podem seguir.',
    too_many_redirects: 'El web fa massa redireccions seguides.',
    timeout: "El web ha trigat massa a respondre. Torna-ho a provar d'aquí a uns minuts.",
    network: "No hem pogut connectar amb el web. Torna-ho a provar d'aquí a uns minuts.",
    rate_limited: (min: number) =>
      `Has fet diverses anàlisis seguides. Torna-ho a provar d'aquí a ${min} min.`,
    consent_required:
      'Marca la casella per confirmar que el domini és teu o que tens permís per analitzar-lo.',
    unexpected: "S'ha produït un error inesperat. Torna-ho a provar.",
  },
  en: {
    invalid_domain:
      'That domain does not look valid. Type it like mybusiness.com, without http:// or spaces.',
    reserved_domain: 'That domain is internal or reserved and cannot be scanned.',
    ip_not_allowed: 'Type the domain name (for example, mybusiness.com), not an IP address.',
    domain_not_found:
      'We cannot find that domain. Check it is spelled correctly and that the website is live.',
    private_address: 'That domain points to an internal or reserved address, so we cannot scan it.',
    bad_url: 'The website sent us to an address we cannot follow.',
    too_many_redirects: 'The website makes too many redirects in a row.',
    timeout: 'The website took too long to respond. Try again in a few minutes.',
    network: 'We could not connect to the website. Try again in a few minutes.',
    rate_limited: (min: number) => `You have run several scans in a row. Try again in ${min} min.`,
    consent_required:
      'Tick the box to confirm the domain is yours or that you have permission to scan it.',
    unexpected: 'Something unexpected went wrong. Please try again.',
  },
});

/** Mensaje de un error en el idioma del usuario. */
export function errorMessage(
  error: ScanError,
  locale: Locale,
  params: { minutes?: number } = {},
): string {
  if (locale === 'es') return error.message;
  const m = MSG[locale];
  const code: ScanErrorCode = error.code;
  return code === 'rate_limited' ? m.rate_limited(params.minutes ?? 10) : m[code];
}

export const unexpectedMessage = (locale: Locale) => MSG[locale].unexpected;
