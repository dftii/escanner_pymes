/**
 * Tema claro u oscuro. La preferencia se guarda solo en el navegador del
 * usuario (localStorage) y solo si la cambia a mano: es una comodidad que él
 * pide, sin cookies y exenta de consentimiento.
 */
export const THEME_KEY = 'escaner-pymes:tema';
export const THEMES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEMES)[number];

export const isThemeChoice = (v: unknown): v is ThemeChoice =>
  typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/** Tema que se aplica según la elección y lo que pide el sistema. */
export const resolveTheme = (choice: ThemeChoice, systemDark: boolean): 'light' | 'dark' =>
  choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

/**
 * Script que va en el <head> (con el nonce de la CSP) y, antes de pintar:
 * - pone el tema (si localStorage no está disponible, sigue al sistema);
 * - marca `no-intro` si se viene de otra página de la web, para no repetir
 *   las animaciones de entrada (sin guardar nada: se mira `document.referrer`).
 */
export const THEME_SCRIPT = `(function(){var h=document.documentElement;try{var c=localStorage.getItem('${THEME_KEY}')}catch(e){}var d=c==='dark'||(c!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);h.dataset.theme=d?'dark':'light';try{if(document.referrer&&new URL(document.referrer).origin===location.origin)h.classList.add('no-intro')}catch(e){}})()`;
