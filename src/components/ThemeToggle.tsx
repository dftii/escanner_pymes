'use client';

import { useEffect, useState } from 'react';
import { THEME_KEY } from '@/lib/theme';
import { useUi } from './LocaleProvider';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const currentTheme = () => document.documentElement.dataset.theme === 'dark';

/**
 * Botón de sol y luna para cambiar entre modo claro y oscuro.
 *
 * Por defecto la web sigue al sistema. Al pulsar se fija el otro tema y se
 * recuerda en este navegador; si el tema elegido coincide con el del
 * sistema, se olvida la preferencia y se vuelve a seguir al sistema.
 * El icono lo decide el CSS según `data-theme`, así que es correcto desde el
 * primer pintado, antes de que cargue JavaScript.
 */
export function ThemeToggle() {
  const t = useUi();
  // null hasta montar: el tema real lo pone el script del <head>.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setDark(currentTheme());
    sync();
    // Si sigue al sistema, cambiar con él sin recargar.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        // Sin almacenamiento: se sigue al sistema.
      }
      if (!stored) {
        document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
        sync();
      }
    };
    media.addEventListener('change', onSystem);
    // El PDF siempre en claro: se lee mejor y gasta menos tinta.
    let beforePrint = 'light';
    const before = () => {
      beforePrint = document.documentElement.dataset.theme ?? 'light';
      document.documentElement.dataset.theme = 'light';
    };
    const after = () => {
      document.documentElement.dataset.theme = beforePrint;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      media.removeEventListener('change', onSystem);
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  function toggle() {
    const next = currentTheme() ? 'light' : 'dark';
    const root = document.documentElement;
    // Transición de colores solo durante el cambio (no al cargar ni al navegar).
    root.classList.add('theme-changing');
    window.setTimeout(() => root.classList.remove('theme-changing'), 400);
    root.dataset.theme = next;
    try {
      if ((next === 'dark') === systemDark()) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Sin almacenamiento: el cambio vale para esta visita.
    }
    setDark(next === 'dark');
  }

  const label = dark === null ? t.theme : dark ? t.themeToLight : t.themeToDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="theme-toggle press relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-amber-200 dark:hover:bg-slate-800"
    >
      {/* Sol: rayos que giran al aparecer */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon theme-sun absolute size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <g className="theme-rays">
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
      {/* Luna */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="theme-icon theme-moon absolute size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
