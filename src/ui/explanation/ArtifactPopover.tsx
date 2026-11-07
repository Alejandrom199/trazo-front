import { faBookOpen, faChevronDown, faSliders, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { ArtifactDefinition } from '@/core/model';
import { useUiStore, type PopoverTab } from '@/ui/uiStore';
import { ArtifactExplanation } from './ArtifactExplanation';

/** Rectángulo en pantalla junto al que se abre el popup (DOMRect lo cumple). */
export interface PopoverAnchor {
  left: number;
  top: number;
  right: number;
}

interface ArtifactPopoverProps {
  artifact: ArtifactDefinition;
  anchor: PopoverAnchor;
  /** Texto del elemento concreto, ya formateado (p. ej. «Pagar» o Guarda: [ok]), si lo hay. */
  subtitle?: string;
  /** Pie con la indicación de qué hacer a continuación. */
  footer: string;
  /**
   * Formulario de propiedades del elemento concreto. Si se pasa, el popup muestra
   * dos pestañas (Propiedades / Explicación); si no, solo la explicación.
   */
  properties?: ReactNode;
  /**
   * Clics que NO deben cerrar el popup aunque caigan fuera de él: los gestiona
   * quien lo abrió (p. ej. un clic en otro artefacto de la paleta cambia de popup).
   */
  keepOpenOn?: (target: HTMLElement) => boolean;
  /**
   * Modo plegable: si se pasa onToggleDetails, el encabezado lleva una flecha y
   * el detalle (pestañas, contenido y pie) solo se muestra con `detailsOpen`.
   */
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  /** Botones extra del encabezado, antes de la flecha (p. ej. el candado de bloqueo). */
  headerActions?: ReactNode;
  onClose: () => void;
}

/** Separación con el elemento, ancho del popup y margen mínimo con el borde de la ventana. */
const GAP = 24;
const WIDTH = 320;
const VIEWPORT_MARGIN = 12;

/**
 * Popup con qué es un artefacto, por qué se usa y cuándo usarlo. Se abre a la
 * derecha del elemento (o a la izquierda si no cabe) y nunca se sale de la ventana.
 * Se cierra con Escape, con la ✕ o al hacer clic fuera.
 */
export function ArtifactPopover({
  artifact,
  anchor,
  subtitle,
  footer,
  properties,
  keepOpenOn,
  detailsOpen = true,
  onToggleDetails,
  headerActions,
  onClose,
}: ArtifactPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const storedTab = useUiStore((state) => state.popoverTab);
  const setTab = useUiStore((state) => state.setPopoverTab);
  const tab: PopoverTab = properties ? storedTab : 'explanation';
  const [position, setPosition] = useState({ left: anchor.right + GAP, top: anchor.top - 4 });

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight ?? 0;
    const fitsRight = anchor.right + GAP + WIDTH <= window.innerWidth - VIEWPORT_MARGIN;
    const left = fitsRight ? anchor.right + GAP : Math.max(VIEWPORT_MARGIN, anchor.left - GAP - WIDTH);
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;
    setPosition({ left, top: Math.max(VIEWPORT_MARGIN, Math.min(anchor.top - 4, maxTop)) });
  }, [anchor, artifact, tab, detailsOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!ref.current?.contains(target) && !keepOpenOn?.(target)) onClose();
    };
    // Fase de captura: el lienzo de React Flow detiene la propagación de sus clics,
    // así que escuchando en burbuja un clic en el lienzo no cerraría el popup.
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick, true);
    };
  }, [onClose, keepOpenOn]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby="artifact-popover-title"
      className="fixed z-50 flex max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel"
      style={{ ...position, width: WIDTH }}
    >
      <header className={`flex items-start gap-2 px-4 py-3 ${detailsOpen ? 'border-b border-line' : ''}`}>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-400">
            {artifact.category}
          </span>
          <h3 id="artifact-popover-title" className="mt-1 text-base font-semibold text-ink-900">
            {artifact.name}
          </h3>
          <p className="text-xs text-ink-400">
            Nombre UML: <span className="text-ink-600">{artifact.umlName}</span>
          </p>
          {subtitle && <p className="mt-1 truncate text-sm text-ink-600">{subtitle}</p>}
        </div>
        <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
          {headerActions}
          {onToggleDetails && (
            <button
              type="button"
              onClick={onToggleDetails}
              aria-expanded={detailsOpen}
              aria-label={detailsOpen ? 'Ocultar propiedades y explicación' : 'Ver propiedades y explicación'}
              title={detailsOpen ? 'Ocultar detalle' : 'Ver propiedades y explicación'}
              className={`flex size-11 items-center justify-center rounded-lg transition-colors ${
                detailsOpen ? 'text-ink-400 hover:bg-canvas hover:text-ink-900' : 'bg-accent-soft text-accent hover:bg-brand hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-11 items-center justify-center rounded-lg text-ink-400 hover:bg-canvas hover:text-ink-900"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>
      </header>

      {detailsOpen && (
        <>
          {properties && (
            <div role="tablist" className="flex gap-1 border-b border-line px-3 pt-2">
              <TabButton active={tab === 'properties'} icon={faSliders} label="Propiedades" onClick={() => setTab('properties')} />
              <TabButton active={tab === 'explanation'} icon={faBookOpen} label="Explicación" onClick={() => setTab('explanation')} />
            </div>
          )}

          {tab === 'properties' && properties ? (
            <div className="overflow-y-auto px-4 py-4">{properties}</div>
          ) : (
            <div className="overflow-y-auto px-4 py-4">
              <ArtifactExplanation definition={artifact} definitionsByType={new Map()} onOpenRelated={() => undefined} variant="brief" />
              <button
                type="button"
                onClick={() => {
                  useUiStore.getState().setPinnedExplanation(artifact.type);
                  useUiStore.getState().setInspectorTab('explanation');
                  onClose();
                }}
                className="mt-4 text-sm font-medium text-accent hover:underline"
              >
                Abrir la ficha completa
              </button>
            </div>
          )}

          <footer className="border-t border-line bg-canvas px-4 py-2.5 text-[11px] text-ink-400">
            {tab === 'properties' && properties ? 'Los cambios se pueden deshacer con Ctrl+Z.' : footer}
          </footer>
        </>
      )}
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: IconDefinition; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-2.5 pb-2 text-xs font-medium transition-colors ${
        active ? 'border-accent text-accent' : 'border-transparent text-ink-400 hover:text-ink-900'
      }`}
    >
      <FontAwesomeIcon icon={icon} className="text-[11px]" />
      {label}
    </button>
  );
}
