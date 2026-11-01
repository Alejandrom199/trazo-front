import { faAnglesLeft, faAnglesRight, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { ArtifactCategory, ArtifactDefinition, DiagramNode } from '@/core/model';
import type { NodeKind } from '@/core/registry';
import { ARTIFACT_DRAG_MIME } from '@/canvas/dragAndDrop';
import { useAddArtifactAtCenter } from '@/canvas/placeArtifact';
import { useActiveModule } from '@/canvas/useActiveModule';
import { ArtifactPopover } from '@/ui/explanation/ArtifactPopover';
import { NARROW_QUERY, useMediaQuery } from '@/ui/useMediaQuery';
import { useUiStore } from '@/ui/uiStore';

/** Orden en que se muestran las categorías en la paleta. */
const CATEGORY_ORDER: { category: ArtifactCategory; title: string }[] = [
  { category: 'nodo de control', title: 'Control' },
  { category: 'nodo ejecutable', title: 'Acciones' },
  { category: 'nodo de objeto', title: 'Objetos' },
  { category: 'agrupación', title: 'Agrupación' },
  { category: 'anotación', title: 'Anotación' },
];

/**
 * Paleta de artefactos del módulo activo, agrupada por categoría.
 * Clic (o arrastrar) agrega el artefacto al lienzo; el botón (i) abre su explicación.
 * Pasar el ratón muestra una pista corta. Se puede plegar a una columna de
 * miniaturas que siguen agregando con clic o arrastre.
 */
export function PalettePanel() {
  const module = useActiveModule();
  const hint = usePaletteHint();
  const addAtCenter = useAddArtifactAtCenter();
  const [opened, setOpened] = useState<HintState | null>(null);
  const collapsed = useUiStore((state) => state.paletteCollapsed);
  const setCollapsed = useUiStore((state) => state.setPaletteCollapsed);
  const isNarrow = useMediaQuery(NARROW_QUERY);
  if (!module) return null;

  function toggleExplanation(artifact: ArtifactDefinition, anchor: DOMRect) {
    hint.hide();
    setOpened(opened?.artifact.type === artifact.type ? null : { artifact, anchor });
  }

  const draggable = module.artifacts.filter((artifact) => module.nodeKinds[artifact.type]);
  const connectors = module.artifacts.filter((artifact) => module.edgeKinds[artifact.type]);

  if (collapsed) {
    return (
      <aside aria-label="Artefactos" className="flex h-full w-14 shrink-0 flex-col items-center border-r border-line bg-surface">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Mostrar artefactos"
          aria-label="Mostrar artefactos"
          aria-expanded={false}
          className="mt-3 mb-2 flex size-8 items-center justify-center rounded-md text-xs text-ink-400 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faAnglesRight} />
        </button>
        <div className="flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-1.5 pb-3">
          {draggable.map((artifact) => {
            const kind = module.nodeKinds[artifact.type];
            return kind ? (
              <PaletteItem
                key={artifact.type}
                artifact={artifact}
                kind={kind}
                compact
                isOpen={false}
                onHover={hint.show}
                onLeave={hint.hide}
                onAdd={() => {
                  hint.hide();
                  addAtCenter(artifact.type);
                }}
                onInfo={toggleExplanation}
              />
            ) : null;
          })}
        </div>
        {hint.current && <PaletteHint artifact={hint.current.artifact} anchor={hint.current.anchor} />}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Artefactos"
      className="flex h-full w-64 shrink-0 flex-col border-r border-line bg-surface max-md:absolute max-md:inset-y-0 max-md:left-14 max-md:z-30 max-md:shadow-panel"
    >
      <header className="flex items-start gap-2 px-5 pt-5 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-ink-900">Artefactos</h2>
          <p className="mt-0.5 text-xs text-ink-400">Haz clic o arrastra para agregarlos. La (i) explica cada uno.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpened(null);
            setCollapsed(true);
          }}
          title="Plegar artefactos"
          aria-label="Plegar artefactos"
          aria-expanded
          className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-xs text-ink-400 hover:bg-raised hover:text-ink-900"
        >
          <FontAwesomeIcon icon={faAnglesLeft} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {CATEGORY_ORDER.map(({ category, title }) => {
          const items = draggable.filter((artifact) => artifact.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="mt-3">
              <h3 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
              {items.map((artifact) => {
                const kind = module.nodeKinds[artifact.type];
                return kind ? (
                  <PaletteItem
                    key={artifact.type}
                    artifact={artifact}
                    kind={kind}
                    isOpen={opened?.artifact.type === artifact.type}
                    onHover={opened ? undefined : hint.show}
                    onLeave={hint.hide}
                    onAdd={() => {
                      hint.hide();
                      addAtCenter(artifact.type);
                      // En móvil la paleta flota sobre el lienzo: se pliega para ver lo agregado.
                      if (isNarrow) setCollapsed(true);
                    }}
                    onInfo={toggleExplanation}
                  />
                ) : null;
              })}
            </section>
          );
        })}

        {connectors.length > 0 && (
          <section className="mt-3">
            <h3 className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Conexiones</h3>
            <p className="px-2 pb-2 text-xs leading-relaxed text-ink-400">
              Pasa el ratón por un nodo y arrastra desde uno de sus puntos hasta otro nodo. El tipo se elige solo:
            </p>
            <ul className="space-y-1 px-2 pb-1 text-xs text-ink-600">
              {connectors.map((artifact) => (
                <li key={artifact.type} className="flex items-center gap-2">
                  <span
                    className="h-0 w-5 border-t-[1.5px] border-edge"
                    style={{ borderStyle: module.edgeKinds[artifact.type]?.dashed ? 'dashed' : 'solid' }}
                  />
                  {artifact.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {hint.current && !opened && <PaletteHint artifact={hint.current.artifact} anchor={hint.current.anchor} />}
      {opened && (
        <ArtifactPopover
          artifact={opened.artifact}
          anchor={opened.anchor}
          footer="Haz clic en el artefacto o arrástralo para agregarlo al lienzo."
          keepOpenOn={isPaletteInfo}
          onClose={() => setOpened(null)}
        />
      )}
    </aside>
  );
}

/** Un clic en otra (i) de la paleta cambia de explicación (o la cierra) en vez de cerrarla desde fuera. */
const isPaletteInfo = (target: HTMLElement) => target.closest('[data-palette-info]') !== null;

/** Espera antes de mostrar la pista, para que no parpadee al recorrer la lista. */
const HINT_DELAY_MS = 350;

interface HintState {
  artifact: ArtifactDefinition;
  anchor: DOMRect;
}

function usePaletteHint() {
  const [current, setCurrent] = useState<HintState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return {
    current,
    show: (artifact: ArtifactDefinition, anchor: DOMRect) => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCurrent({ artifact, anchor }), HINT_DELAY_MS);
    },
    hide: () => {
      window.clearTimeout(timer.current);
      setCurrent(null);
    },
  };
}

/** Explicación corta junto a la paleta: qué es y cómo se reconoce. */
function PaletteHint({ artifact, anchor }: HintState) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-64 rounded-lg border border-line bg-surface px-3.5 py-3 shadow-panel"
      style={{ left: anchor.right + 12, top: anchor.top - 4 }}
    >
      <p className="text-sm font-semibold text-ink-900">{artifact.name}</p>
      <p className="mb-1.5 text-[11px] text-ink-400">Nombre UML: {artifact.umlName}</p>
      <p className="text-xs leading-relaxed text-ink-600">{artifact.whatIs}</p>
      <p className="mt-2 text-[11px] text-ink-400">Clic para agregarlo. La (i) explica por qué y cuándo usarlo.</p>
    </div>
  );
}

const PREVIEW = { width: 40, height: 26 };
/** Lado mínimo de una miniatura, para que las figuras muy altas o angostas se distingan. */
const MIN_PREVIEW_SIDE = 16;

interface PaletteItemProps {
  artifact: ArtifactDefinition;
  kind: NodeKind;
  isOpen: boolean;
  /** Versión plegada: solo la miniatura, sin nombre ni (i). */
  compact?: boolean;
  /** undefined mientras hay un popup abierto: no se mezclan pista y popup. */
  onHover: ((artifact: ArtifactDefinition, anchor: DOMRect) => void) | undefined;
  onLeave: () => void;
  /** Agrega el artefacto al lienzo. */
  onAdd: () => void;
  /** Abre (o cierra) su explicación, junto a la fila. */
  onInfo: (artifact: ArtifactDefinition, anchor: DOMRect) => void;
}

function PaletteItem({ artifact, kind, isOpen, compact = false, onHover, onLeave, onAdd, onInfo }: PaletteItemProps) {
  function handleDragStart(event: DragEvent) {
    onLeave();
    event.dataTransfer.setData(ARTIFACT_DRAG_MIME, artifact.type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      data-palette-item
      role="button"
      tabIndex={0}
      aria-label={`Agregar ${artifact.name} al lienzo`}
      onDragStart={handleDragStart}
      onMouseEnter={(event) => onHover?.(artifact, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onLeave}
      onClick={onAdd}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onAdd();
      }}
      className={`group/item relative flex cursor-grab items-center rounded-md text-[13px] select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
        compact ? 'w-full justify-center py-2' : 'gap-3 px-2 py-1.5'
      } ${isOpen ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}
    >
      {isOpen && <span className="bg-brand absolute top-1 bottom-1 -left-3 w-[3px] rounded-r-full" aria-hidden />}
      <ArtifactPreview kind={kind} artifactType={artifact.type} />
      {!compact && <span className="min-w-0 flex-1 truncate">{artifact.name}</span>}
      {!compact && (
        <button
          type="button"
          draggable={false}
          data-palette-info
          aria-label={`Qué es ${artifact.name}`}
          aria-expanded={isOpen}
          title="Qué es, por qué se usa y cuándo usarlo"
          onClick={(event) => {
            // Que el clic en la (i) no agregue el artefacto.
            event.stopPropagation();
            const row = event.currentTarget.closest('[data-palette-item]');
            if (row) onInfo(artifact, row.getBoundingClientRect());
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[13px] transition-colors ${
            // Semitransparente en reposo para no competir con el nombre; se aviva al pasar el ratón.
            isOpen ? 'text-accent' : 'text-ink-400/50 hover:bg-surface hover:text-accent group-hover/item:text-ink-400'
          }`}
        >
          <FontAwesomeIcon icon={faCircleInfo} />
        </button>
      )}
    </div>
  );
}

/**
 * Miniatura: el mismo componente del lienzo dibujado directamente al tamaño de la
 * fila. No se escala con CSS: así el trazo mantiene su grosor real y se ve igual de
 * nítido en tema claro y oscuro (un carril escalado al 5 % perdía el borde).
 */
function ArtifactPreview({ kind, artifactType }: { kind: NodeKind; artifactType: string }) {
  const scale = Math.min(PREVIEW.width / kind.defaultSize.width, PREVIEW.height / kind.defaultSize.height, 1);
  const width = Math.max(kind.defaultSize.width * scale, MIN_PREVIEW_SIDE);
  const height = Math.max(kind.defaultSize.height * scale, Math.min(MIN_PREVIEW_SIDE, kind.defaultSize.height));
  const previewNode: DiagramNode = {
    id: `preview-${artifactType}`,
    artifactType,
    label: '',
    position: { x: 0, y: 0 },
    size: { width, height },
    parentId: null,
    props: kind.defaultProps,
    notes: '',
    locked: false,
  };
  const Shape = kind.component;

  return (
    <div className="pointer-events-none flex shrink-0 items-center justify-center" style={PREVIEW} aria-hidden>
      <div style={{ width, height, flexShrink: 0 }}>
        <Shape node={previewNode} selected={false} label={null} />
      </div>
    </div>
  );
}
