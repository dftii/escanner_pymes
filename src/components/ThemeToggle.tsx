'use client';

import { useEffect, useState } from 'react';
import { isThemeChoice, resolveTheme, THEME_KEY, THEMES, type ThemeChoice } from '@/lib/theme';
import { useUi } from './LocaleProvider';

const svg = (d: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="size-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS: Record<ThemeChoice, React.ReactNode> = {
  system: svg(
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>,
  ),
  light: svg(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
  ),
  dark: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />),
};

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeChoice(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function apply(choice: ThemeChoice) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = resolveTheme(choice, dark);
}

/** Selector de tema: automático, claro u oscuro. */
export function ThemeToggle() {
  const t = useUi();
  // Antes de montar no se sabe la elección (vive en el navegador): "automático".
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    setChoice(readChoice());
    // El PDF siempre en claro: se ahorra tinta y se lee mejor.
    const before = () => {
      document.documentElement.dataset.theme = 'light';
    };
    const after = () => apply(readChoice());
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // En "automático", seguir los cambios del sistema sin recargar.
  useEffect(() => {
    if (choice !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [choice]);

  function choose(next: ThemeChoice) {
    setChoice(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Sin almacenamiento: el cambio vale para esta visita.
    }
    apply(next);
  }

  const labels: Record<ThemeChoice, string> = {
    system: t.themeSystem,
    light: t.themeLight,
    dark: t.themeDark,
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.theme}
      className="flex rounded-full border border-slate-300 p-0.5 dark:border-slate-700"
    >
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={choice === option}
          title={labels[option]}
          onClick={() => choose(option)}
          className={`flex size-7 items-center justify-center rounded-full text-sm ${
            choice === option
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span aria-hidden="true">{ICONS[option]}</span>
          <span className="sr-only">{labels[option]}</span>
        </button>
      ))}
    </div>
  );
}
