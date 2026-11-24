'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';
import { UI } from '@/lib/ui';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Idioma de la página para los componentes de cliente. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** Textos de la interfaz en el idioma de la página. */
export const useUi = () => UI[useLocale()];
