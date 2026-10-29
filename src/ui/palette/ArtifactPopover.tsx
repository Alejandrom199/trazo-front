import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ArtifactDefinition } from '@/core/model';

interface ArtifactPopoverProps {
  artifact: ArtifactDefinition;
  /** Fila de la paleta junto a la que se abre. */
  anchor: DOMRect;
  onClose: () => void;
}

/** Separación entre la paleta y el popup, y margen mínimo con el borde de la ventana. */
const GAP = 12;
const VIEWPORT_MARGIN = 12;

/**
 * Popup que se abre al hacer clic en un artefacto de la paleta: qué es, por qué
 * se usa y cuándo usarlo. Se cierra con Escape, con la ✕ o al hacer clic fuera.
 */
export function ArtifactPopover({ artifact, anchor, onClose }: ArtifactPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top - 4);

  // Si no cabe hacia abajo, se sube lo necesario para no salirse de la ventana.
  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;
    setTop(Math.max(VIEWPORT_MARGIN, Math.min(anchor.top - 4, maxTop)));
  }, [anchor, artifact]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // Un clic en otro artefacto de la paleta lo gestiona la paleta (cambia de popup).
      if (!ref.current?.contains(target) && !target.closest('[data-palette-item]')) onClose();
    };
    // Fase de captura: el lienzo de React Flow detiene la propagación de sus clics,
    // así que escuchando en burbuja un clic en el lienzo no cerraría el popup.
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="artifact-popover-title"
      className="fixed z-50 flex max-h-[calc(100vh-24px)] w-80 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel"
      style={{ left: anchor.right + GAP, top }}
    >
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-400">
            {artifact.category}
          </span>
          <h3 id="artifact-popover-title" className="mt-1 text-base font-semibold text-ink-900">
            {artifact.name}
          </h3>
          <p className="font-mono text-xs text-ink-400">UML · {artifact.umlName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-canvas hover:text-ink-900"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-ink-600">
        <section>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Qué es</h4>
          <p className="text-ink-900">{artifact.whatIs}</p>
        </section>

        <section>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Por qué se usa</h4>
          <p>{artifact.whatFor}</p>
          <p className="mt-1.5">{artifact.whyExists}</p>
        </section>

        <section>
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Cuándo usarlo</h4>
          <ul className="space-y-1.5">
            {artifact.whenToUse.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="border-t border-line bg-canvas px-4 py-2.5 text-[11px] text-ink-400">
        Arrástralo al lienzo para usarlo. Al seleccionarlo allí verás su ficha completa.
      </footer>
    </div>
  );
}
