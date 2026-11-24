'use client';

import { useId, useRef, type ReactNode } from 'react';
import { splitGlossary, type GlossaryEntry } from '@/lib/glossary';
import type { Locale } from '@/lib/i18n';
import { useLocale } from './LocaleProvider';

const supportsPopover = () =>
  typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/**
 * Término con su explicación al pasar el ratón, al enfocarlo o al tocarlo.
 * La explicación se abre en la capa superior del navegador (Popover API), así
 * que no la recortan los hallazgos plegables ni las animaciones.
 */
function Term({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  // Al tocar en el móvil llegan seguidos foco/ratón y clic: el clic no debe cerrar lo que se acaba de abrir.
  const openedAt = useRef(0);

  const show = () => {
    const b = button.current;
    const t = tip.current;
    if (!b || !t || !supportsPopover()) return;
    if (!t.matches(':popover-open')) {
      t.showPopover();
      openedAt.current = Date.now();
    }
    const r = b.getBoundingClientRect();
    const margin = 8;
    const width = t.offsetWidth;
    const left = Math.min(Math.max(margin, r.left), window.innerWidth - width - margin);
    const above = r.top - t.offsetHeight - margin;
    t.style.left = `${left}px`;
    t.style.top = `${above >= margin ? above : r.bottom + margin}px`;
  };
  const hide = () => {
    const t = tip.current;
    if (t && supportsPopover() && t.matches(':popover-open')) t.hidePopover();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-describedby={id}
        // El "hover" solo con ratón: en pantallas táctiles se abre al tocar y se cierra al tocar fuera.
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onFocus={show}
        onBlur={hide}
        onClick={() =>
          tip.current?.matches(':popover-open') && Date.now() - openedAt.current > 400
            ? hide()
            : show()
        }
        onKeyDown={(e) => {
          if (e.key === 'Escape') hide();
        }}
        className="cursor-help underline decoration-slate-400 decoration-dotted underline-offset-4 hover:decoration-solid dark:decoration-slate-500"
      >
        {children}
      </button>
      <span
        ref={tip}
        id={id}
        role="tooltip"
        popover="manual"
        className="fade-in [inset:auto] m-0 w-[min(18rem,calc(100vw-1rem))] rounded-lg border-0 bg-slate-900 p-3 text-left text-xs leading-relaxed text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
      >
        <strong className="block">{entry.term}</strong>
        {entry.definition}
      </span>
    </>
  );
}

/**
 * Texto con los términos técnicos explicados (solo la primera vez que sale
 * cada uno). Pasa el mismo `seen` a varios párrafos para no repetirlos.
 */
export function GlossaryText({
  text,
  seen,
  locale,
}: {
  text: string;
  seen?: Set<string>;
  /** Para componentes de servidor (fuera del LocaleProvider). */
  locale?: Locale;
}) {
  const contextLocale = useLocale();
  return (
    <>
      {splitGlossary(text, seen, locale ?? contextLocale).map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <Term key={i} entry={part.entry}>
            {part.text}
          </Term>
        ),
      )}
    </>
  );
}
