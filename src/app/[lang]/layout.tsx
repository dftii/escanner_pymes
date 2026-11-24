import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LocaleProvider } from '@/components/LocaleProvider';
import { LOCALE_TAGS, localePath } from '@/lib/i18n';
import { localeFrom, pageMetadata, SITE_TAGLINE } from '@/lib/pageMeta';
import { SITE_NAME, siteUrl } from '@/lib/site';
import { UI } from '@/lib/ui';
import '../globals.css';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${SITE_NAME} · ${SITE_TAGLINE[locale]}`,
      template: `%s · ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
    ...pageMetadata(locale, '/'),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode } & Props>) {
  const locale = await localeFrom(params);
  const t = UI[locale];
  // Leer las cabeceras hace la página dinámica: Next aplica así el nonce de la CSP
  // (lo pone el middleware) a sus propios scripts en cada petición.
  await headers();

  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body className="flex min-h-dvh flex-col">
        <LocaleProvider locale={locale}>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900"
          >
            {t.skipToContent}
          </a>
          <div className="mx-auto flex w-full max-w-3xl justify-end px-4 pt-4 print:hidden">
            <LanguageSwitcher />
          </div>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 px-4 py-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-400 print:hidden">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{t.footerNote}</p>
              <nav aria-label={t.legalNav} className="flex flex-wrap gap-4">
                <Link href={localePath(locale, '/glosario')} className="link-grow">
                  {t.glossary}
                </Link>
                <Link href={localePath(locale, '/aviso-legal')} className="link-grow">
                  {t.legalNotice}
                </Link>
                <Link href={localePath(locale, '/privacidad')} className="link-grow">
                  {t.privacy}
                </Link>
                <Link href={localePath(locale, '/cookies')} className="link-grow">
                  {t.cookies}
                </Link>
              </nav>
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
