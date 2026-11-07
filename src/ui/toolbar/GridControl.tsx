import { faTableCells } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { clampGridSize, GRID_SIZE_MAX, GRID_SIZE_MIN, useGridStore } from '@/canvas/gridStore';

/** Medidas rápidas para la cuadrícula, además del campo libre. */
const PRESETS = [10, 20, 40];

/**
 * Botón de cuadrícula de la barra del documento: muestra u oculta la malla y
 * define el tamaño de cada celda en píxeles. Con la malla visible, los nodos se
 * ajustan a ella al moverlos.
 */
export function GridControl() {
  const { visible, size, setVisible, setSize } = useGridStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', closeOnOutsideClick, true);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick, true);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function commitDraft() {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(parsed)) setSize(parsed);
    setDraft(null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Cuadrícula"
        aria-label="Cuadrícula"
        className={`flex h-11 min-w-11 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
          visible ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <FontAwesomeIcon icon={faTableCells} className="text-[13px]" />
        <span className="hidden whitespace-nowrap sm:inline">{visible ? `${size} px` : 'Cuadrícula'}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Cuadrícula" className="absolute right-0 bottom-full z-30 mb-2 w-64 max-w-[calc(100vw-5rem)] rounded-lg border border-line bg-surface p-3 shadow-panel">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-900">Mostrar cuadrícula</span>
            <button
              type="button"
              role="switch"
              aria-checked={visible}
              onClick={() => setVisible(!visible)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${visible ? 'bg-brand' : 'bg-line'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-4' : ''}`}
              />
            </button>
          </label>

          <div className="mt-3">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">Tamaño de celda</span>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={GRID_SIZE_MIN}
                  max={GRID_SIZE_MAX}
                  value={draft ?? String(size)}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commitDraft}
                  onKeyDown={(event) => event.key === 'Enter' && commitDraft()}
                  aria-label="Tamaño de celda en píxeles"
                  className="w-full rounded-md border border-line bg-surface py-1.5 pr-8 pl-2.5 text-sm text-ink-900 tabular-nums outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-ink-400">px</span>
              </div>
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setDraft(null);
                    setSize(clampGridSize(preset));
                  }}
                  className={`rounded-md px-2 py-1.5 text-xs tabular-nums transition-colors ${
                    size === preset ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
              Entre {GRID_SIZE_MIN} y {GRID_SIZE_MAX} px. Con la cuadrícula visible, los nodos se ajustan a sus celdas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
