import type { CSSProperties } from 'react';

/** Retraso escalonado para `.rise-in` / `.pop-in` (variable CSS `--i`). */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

/** Subrayado dibujado a mano (trazo propio), se dibuja al cargar. */
export function Scribble({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute -bottom-2 left-0 h-3 w-full sm:h-4 ${className}`}
    >
      <path
        className="scribble-path"
        pathLength={1}
        d="M4 16 C 60 6, 120 4, 170 9 S 260 18, 296 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
