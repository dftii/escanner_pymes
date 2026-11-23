/** Códigos de error que el usuario puede ver, con mensaje en español. */
export type ScanErrorCode =
  | 'invalid_domain'
  | 'reserved_domain'
  | 'ip_not_allowed'
  | 'domain_not_found'
  | 'private_address'
  | 'bad_url'
  | 'too_many_redirects'
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'consent_required';

/** Error controlado: su `message` se puede mostrar tal cual al usuario. */
export class ScanError extends Error {
  readonly code: ScanErrorCode;
  /** Código HTTP adecuado si llega hasta la API. */
  readonly httpStatus: number;

  constructor(code: ScanErrorCode, message: string, httpStatus = 400) {
    super(message);
    this.name = 'ScanError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const isScanError = (value: unknown): value is ScanError => value instanceof ScanError;
