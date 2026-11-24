/**
 * Datos del titular de la web (persona física) para el aviso legal y la
 * política de privacidad. Se leen de variables de entorno para que no estén
 * en el repositorio: se configuran en Vercel (Settings → Environment Variables).
 */
export type LegalInfo = {
  /** Nombre y apellidos. */
  nombre: string | null;
  /** NIF (DNI con letra). */
  nif: string | null;
  /** Dirección postal. */
  domicilio: string | null;
  /** Email de contacto y para ejercer derechos RGPD. */
  email: string | null;
  /** Proveedor de hosting (encargado del tratamiento). */
  hosting: string;
  /** `true` si el límite de análisis usa Upstash. */
  upstash: boolean;
};

export const LEGAL_ENV_VARS = {
  nombre: 'LEGAL_NOMBRE',
  nif: 'LEGAL_NIF',
  domicilio: 'LEGAL_DOMICILIO',
  email: 'LEGAL_EMAIL',
  hosting: 'LEGAL_HOSTING',
} as const;

export const DEFAULT_HOSTING = 'Vercel Inc. (EE. UU.)';

type Env = Record<string, string | undefined>;

const read = (env: Env, name: string): string | null => {
  const value = env[name]?.trim();
  return value ? value : null;
};

export function getLegalInfo(env: Env = process.env): LegalInfo {
  return {
    nombre: read(env, LEGAL_ENV_VARS.nombre),
    nif: read(env, LEGAL_ENV_VARS.nif),
    domicilio: read(env, LEGAL_ENV_VARS.domicilio),
    email: read(env, LEGAL_ENV_VARS.email),
    hosting: read(env, LEGAL_ENV_VARS.hosting) ?? DEFAULT_HOSTING,
    upstash: !!(read(env, 'UPSTASH_REDIS_REST_URL') ?? read(env, 'KV_REST_API_URL')),
  };
}
