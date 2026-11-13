import { faBullseye, faChevronDown, faEye } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_DETAIL, useCanvasViewStore, type CanvasDetailMode } from '@/canvas/canvasViewStore';
import { useDiagramStore } from '@/core/store/diagramStore';

const DETAIL_OPTIONS: { value: CanvasDetailMode; label: string; help: string }[] = [
  { value: 'full', label: 'Siempre completo', help: 'Todo se ve a cualquier distancia.' },
  { value: 'auto', label: 'Automático', help: 'Al alejarte se ocultan los textos de las flechas y se atenúan las notas.' },
  { value: 'compact', label: 'Siempre simple', help: 'Sin textos de flechas ni notas destacadas, incluso de cerca.' },
];

/**
 * Menú «Vista»: ayudas para leer diagramas grandes, sin cambiar el diagrama.
 *   Enfocar selección: atenúa lo que no está conectado con lo seleccionado.
 *   Al alejar: cuánto detalle se muestra cuando el lienzo está lejos.
 */
export function CanvasViewControl() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const detail = useCanvasViewStore((state) => state.detail);
  const focus = useCanvasViewStore((state) => state.focus);
  const selected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length);
  const customized = focus || detail !== DEFAULT_DETAIL;

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Vista: enfocar la selección y el detalle al alejarse"
        onClick={() => setOpen(!open)}
        className={`flex h-11 min-w-11 items-center gap-2 rounded-md px-2 text-xs ${
          customized ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <FontAwesomeIcon icon={faEye} className="text-[12px]" />
        <span className="hidden xl:inline">Vista</span>
        <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
      </button>
      {open && (
        <div role="dialog" aria-label="Vista" className="absolute right-0 bottom-full z-30 mb-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-panel">
          <button
            type="button"
            role="switch"
            aria-checked={focus}
            disabled={selected === 0 && !focus}
            onClick={() => useCanvasViewStore.getState().setFocus(!focus)}
            className={`flex w-full items-start gap-3 rounded-md border p-3 text-left disabled:opacity-45 ${
              focus ? 'border-accent/40 bg-accent-soft' : 'border-line hover:bg-raised'
            }`}
          >
            <FontAwesomeIcon icon={faBullseye} className={`mt-0.5 ${focus ? 'text-accent' : 'text-ink-400'}`} />
            <span>
              <span className="block text-xs font-medium text-ink-900">Enfocar selección</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-600">
                {selected === 0 && !focus ? 'Selecciona algo primero.' : 'Atenúa lo que no está conectado con lo seleccionado.'}
              </span>
            </span>
          </button>

          <p className="mt-4 text-xs font-medium text-ink-900">Al alejar el lienzo</p>
          <div role="radiogroup" className="mt-2 space-y-1">
            {DETAIL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={detail === option.value}
                onClick={() => useCanvasViewStore.getState().setDetail(option.value)}
                className={`block w-full rounded-md px-2.5 py-2 text-left ${detail === option.value ? 'bg-accent-soft' : 'hover:bg-raised'}`}
              >
                <span className={`block text-xs ${detail === option.value ? 'font-medium text-accent' : 'text-ink-900'}`}>{option.label}</span>
                <span className="block text-[11px] leading-relaxed text-ink-600">{option.help}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
