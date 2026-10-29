import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { ArtifactCategory, ArtifactDefinition, DiagramNode } from '@/core/model';
import type { NodeKind } from '@/core/registry';
import { ARTIFACT_DRAG_MIME } from '@/canvas/dragAndDrop';
import { useActiveModule } from '@/canvas/useActiveModule';
import { Panel } from '@/ui/layout/Panel';
import { ArtifactPopover } from '@/ui/explanation/ArtifactPopover';

/** Orden en que se muestran las categorías en la paleta. */
const CATEGORY_ORDER: { category: ArtifactCategory; title: string }[] = [
  { category: 'nodo de control', title: 'Control' },
  { category: 'nodo ejecutable', title: 'Acciones' },
  { category: 'nodo de objeto', title: 'Objetos' },
  { category: 'agrupación', title: 'Agrupación' },
  { category: 'anotación', title: 'Anotación' },
];

/**
 * Paleta de artefactos del módulo activo, agrupada por categoría y lista para arrastrar.
 * Pasar el ratón muestra una pista corta; hacer clic abre el popup con la explicación.
 */
export function PalettePanel() {
  const module = useActiveModule();
  const hint = usePaletteHint();
  const [opened, setOpened] = useState<HintState | null>(null);
  if (!module) return null;

  function toggleExplanation(artifact: ArtifactDefinition, anchor: DOMRect) {
    hint.hide();
    setOpened(opened?.artifact.type === artifact.type ? null : { artifact, anchor });
  }

  const draggable = module.artifacts.filter((artifact) => module.nodeKinds[artifact.type]);
  const connectors = module.artifacts.filter((artifact) => module.edgeKinds[artifact.type]);

  return (
    <Panel className="flex max-h-full w-60 flex-col overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Artefactos</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {CATEGORY_ORDER.map(({ category, title }) => {
          const items = draggable.filter((artifact) => artifact.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} className="mb-2">
              <h3 className="px-2 pt-2 pb-1 text-[11px] font-medium text-ink-400">{title}</h3>
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
                    onClick={toggleExplanation}
                  />
                ) : null;
              })}
            </section>
          );
        })}

        {connectors.length > 0 && (
          <section className="mb-1">
            <h3 className="px-2 pt-2 pb-1 text-[11px] font-medium text-ink-400">Conexiones</h3>
            <p className="px-2 pb-2 text-xs leading-relaxed text-ink-400">
              Pasa el ratón por un nodo y arrastra desde uno de sus puntos hasta otro nodo. El tipo se elige solo:
            </p>
            <ul className="space-y-1 px-2 pb-1 text-xs text-ink-600">
              {connectors.map((artifact) => (
                <li key={artifact.type} className="flex items-center gap-2">
                  <span
                    className="h-0 w-5 border-t-[1.5px] border-ink-600"
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
          footer="Arrástralo al lienzo para usarlo."
          keepOpenOn={isPaletteItem}
          onClose={() => setOpened(null)}
        />
      )}
    </Panel>
  );
}

/** Un clic en otro artefacto de la paleta cambia de popup en vez de cerrarlo. */
const isPaletteItem = (target: HTMLElement) => target.closest('[data-palette-item]') !== null;

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
      className="pointer-events-none fixed z-50 w-64 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-panel"
      style={{ left: anchor.right + 12, top: anchor.top - 4 }}
    >
      <p className="text-sm font-semibold text-ink-900">{artifact.name}</p>
      <p className="mb-1.5 font-mono text-[11px] text-ink-400">{artifact.umlName}</p>
      <p className="text-xs leading-relaxed text-ink-600">{artifact.whatIs}</p>
      <p className="mt-2 text-[11px] text-ink-400">Haz clic para ver por qué y cuándo usarlo.</p>
    </div>
  );
}

const PREVIEW = { width: 40, height: 26 };

interface PaletteItemProps {
  artifact: ArtifactDefinition;
  kind: NodeKind;
  isOpen: boolean;
  /** undefined mientras hay un popup abierto: no se mezclan pista y popup. */
  onHover: ((artifact: ArtifactDefinition, anchor: DOMRect) => void) | undefined;
  onLeave: () => void;
  onClick: (artifact: ArtifactDefinition, anchor: DOMRect) => void;
}

function PaletteItem({ artifact, kind, isOpen, onHover, onLeave, onClick }: PaletteItemProps) {
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
      aria-expanded={isOpen}
      onDragStart={handleDragStart}
      onMouseEnter={(event) => onHover?.(artifact, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onLeave}
      onClick={(event) => onClick(artifact, event.currentTarget.getBoundingClientRect())}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick(artifact, event.currentTarget.getBoundingClientRect());
      }}
      className={`flex cursor-grab items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-ink-900 select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
        isOpen ? 'bg-accent-soft' : 'hover:bg-canvas'
      }`}
    >
      <ArtifactPreview kind={kind} artifactType={artifact.type} />
      <span className="truncate">{artifact.name}</span>
    </div>
  );
}

/** Miniatura: el mismo componente del lienzo, escalado para caber en la fila. */
function ArtifactPreview({ kind, artifactType }: { kind: NodeKind; artifactType: string }) {
  const { width, height } = kind.defaultSize;
  const scale = Math.min(PREVIEW.width / width, PREVIEW.height / height, 1);
  const previewNode: DiagramNode = {
    id: `preview-${artifactType}`,
    artifactType,
    label: '',
    position: { x: 0, y: 0 },
    size: kind.defaultSize,
    parentId: null,
    props: kind.defaultProps,
    notes: '',
  };
  const Shape = kind.component;

  return (
    <div className="pointer-events-none flex shrink-0 items-center justify-center" style={PREVIEW} aria-hidden>
      <div style={{ width, height, transform: `scale(${scale})`, flexShrink: 0 }}>
        <Shape node={previewNode} selected={false} label={null} />
      </div>
    </div>
  );
}
