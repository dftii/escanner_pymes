/** Categorías del informe. */
export type Category = 'ssl' | 'headers' | 'email' | 'privacy';

/** Resultado de una comprobación concreta. */
export type FindingStatus = 'ok' | 'warning' | 'fail' | 'info' | 'error';

/**
 * Contrato común que devuelven todos los checks.
 * Un check que falla por red o timeout devuelve `status: 'error'`,
 * nunca lanza una excepción que tumbe el informe.
 */
export type Finding = {
  /** Identificador estable, p. ej. `ssl.expiry`. */
  id: string;
  category: Category;
  status: FindingStatus;
  /** Titular corto en lenguaje llano. */
  title: string;
  /** Qué está pasando. */
  detail: string;
  /** Por qué importa, en una frase. */
  risk: string;
  /** Pasos concretos para arreglarlo. */
  fix: string[];
  /** Datos técnicos de respaldo (no se muestran por defecto). */
  evidence?: Record<string, unknown>;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  ssl: 'Certificado SSL',
  headers: 'Cabeceras de seguridad',
  email: 'Correo y suplantación',
  privacy: 'Cookies y RGPD',
};
