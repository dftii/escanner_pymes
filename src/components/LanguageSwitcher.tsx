'use client';

import { usePathname } from 'next/navigation';
import { LOCALE_NAMES, LOCALES, localePath, splitLocalePath } from '@/lib/i18n';
import { useLocale, useUi } from './LocaleProvider';

/**
 * Enlaces a la misma página en los otros idiomas. Son enlaces normales (sin
 * cookies ni almacenamiento): el idioma va en la dirección.
 */
export function LanguageSwitcher() {
  const t = useUi();
  const current = useLocale();
  // La ruta real es /es/... por dentro; se quita el idioma para montar las demás.
  const { path } = splitLocalePath((usePathname() ?? '/').replace(/^\/es(?=\/|$)/, '') || '/');
  return (
    <nav aria-label={t.language}>
      <ul className="flex gap-1 text-sm">
        {LOCALES.map((l) => (
          <li key={l}>
            <a
              href={localePath(l, path)}
              hrefLang={l}
              lang={l}
              aria-current={l === current ? 'page' : undefined}
              className={`rounded-md px-2 py-1 ${
                l === current
                  ? 'bg-slate-200 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-700 underline-offset-4 hover:underline dark:text-slate-300'
              }`}
            >
              {LOCALE_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
