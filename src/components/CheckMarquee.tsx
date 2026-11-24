'use client';

import { useState } from 'react';

const ITEMS = [
  'Certificado SSL',
  'Caducidad',
  'Redirección a HTTPS',
  'HSTS',
  'CSP',
  'Clickjacking',
  'SPF',
  'DMARC',
  'DKIM',
  'Emails expuestos',
  'Filtraciones de datos',
  'Cookies sin permiso',
  'Banner de cookies',
  'Aviso legal',
  'Política de privacidad',
  'Formularios',
];

/**
 * Cinta continua con todo lo que revisamos. Se para al pasar el ratón y con
 * el botón de pausa (WCAG 2.2.2); con "reducir movimiento" no se mueve.
 */
export function CheckMarquee() {
  const [paused, setPaused] = useState(false);
  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <li
          key={item}
          className="mx-2 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap dark:border-slate-800 dark:bg-slate-900"
        >
          <span aria-hidden="true" className="text-emerald-700 dark:text-emerald-400">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex items-center gap-2 print:hidden">
      <div
        role="region"
        aria-label="Comprobaciones incluidas"
        className={`marquee relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] py-1 ${paused ? 'paused' : ''}`}
      >
        <div className="marquee-track">
          {list(false)}
          {list(true)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="press flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-700 hover:bg-slate-100 motion-reduce:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
        <span className="sr-only">{paused ? 'Reanudar la animación' : 'Pausar la animación'}</span>
      </button>
    </div>
  );
}
