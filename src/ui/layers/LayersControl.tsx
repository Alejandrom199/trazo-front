import { faAngleDown, faAngleUp, faAnglesDown, faAnglesUp, faChevronRight, faLayerGroup, faLock, faLockOpen, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import { drawOrder } from '@/canvas/adapters';
import { LAYER_SHORTCUTS, layerGroup, moveLayers, placeLayer } from '@/canvas/layerActions';
import { useActiveModule } from '@/canvas/useActiveModule';
import type { Diagram, DiagramNode, LayerMove } from '@/core/model';
import type { DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';

/**
 * Botón flotante «Capas» y su panel: el orden en que se apilan los artefactos,
 * con lo que está más al frente arriba (como en Figma). Lo de dentro de un
 * contenedor va sangrado bajo él. Clic selecciona (Shift suma), arrastrar una fila
 * la reordena entre sus hermanos, y los botones mueven lo seleccionado.
 */

const MOVES: { move: LayerMove; label: string; icon: IconDefinition }[] = [
  { move: 'front', label: 'Traer al frente', icon: faAnglesUp },
  { move: 'forward', label: 'Traer adelante', icon: faAngleUp },
  { move: 'backward', label: 'Enviar atrás', icon: faAngleDown },
  { move: 'back', label: 'Enviar al fondo', icon: faAnglesDown },
];

interface LayerRow {
  node: DiagramNode;
  level: number;
  hasChildren: boolean;
}

export function LayersControl() {
  const [open, setOpen] = useState(false);
  const module = useActiveModule();
  const hasNodes = useDiagramStore((state) => (state.diagram?.nodes.length ?? 0) > 0);
  if (!module) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="trazo-layers"
        title="Capas: el orden en que se apilan los artefactos"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 items-center gap-2 rounded-xl border border-line px-3.5 text-[13px] shadow-panel backdrop-blur transition-colors ${
          open ? 'bg-accent-soft text-accent' : 'bg-surface/95 text-ink-600 hover:text-ink-900'
        }`}
      >
        <FontAwesomeIcon icon={faLayerGroup} />
        <span>Capas</span>
      </button>
      {open && <LayersPanel module={module} empty={!hasNodes} onClose={() => setOpen(false)} />}
    </div>
  );
}

function LayersPanel({ module, empty, onClose }: { module: DiagramModule; empty: boolean; onClose: () => void }) {
  const diagram = useDiagramStore((state) => state.diagram);
  const selection = useDiagramStore((state) => state.selection);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [drag, setDrag] = useState<{ id: string; over?: { id: string; above: boolean } } | null>(null);
  const rows = useMemo(() => (diagram ? layerRows(diagram, module, collapsed) : []), [diagram, module, collapsed]);
  const selected = new Set(selection.nodeIds);
  const store = useDiagramStore.getState;

  function select(event: MouseEvent, id: string) {
    const { nodeIds, edgeIds } = store().selection;
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      store().setSelection({ nodeIds: nodeIds.includes(id) ? nodeIds.filter((other) => other !== id) : [...nodeIds, id], edgeIds });
    } else {
      store().setSelection({ nodeIds: [id], edgeIds: [] });
    }
  }

  function toggleCollapsed(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // Solo se puede soltar sobre un hermano: el orden no cruza contenedores.
  const sameGroup = (a: string, b: string) => {
    const groupOf = layerGroup(module);
    const nodeA = diagram?.nodes.find((node) => node.id === a);
    const nodeB = diagram?.nodes.find((node) => node.id === b);
    return !!nodeA && !!nodeB && a !== b && groupOf(nodeA) === groupOf(nodeB);
  };

  function onDragOver(event: DragEvent, id: string) {
    if (!drag || !sameGroup(drag.id, id)) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const above = event.clientY < box.top + box.height / 2;
    if (drag.over?.id !== id || drag.over.above !== above) setDrag({ id: drag.id, over: { id, above } });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    // La lista va de frente a fondo: soltar encima de una fila es ponerse delante de ella.
    if (drag?.over) placeLayer(module, drag.id, drag.over.id, drag.over.above);
    setDrag(null);
  }

  return (
    <section id="trazo-layers" aria-label="Capas" className="trazo-pop-in flex max-h-[min(30rem,calc(100vh-12rem))] w-64 flex-col rounded-xl border border-line bg-surface/95 shadow-panel backdrop-blur">
      <header className="flex items-center justify-between border-b border-line/70 py-2 pr-1.5 pl-3.5">
        <p className="text-sm font-semibold text-ink-900">Capas</p>
        <button type="button" aria-label="Cerrar capas" onClick={onClose} className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-ink-900">
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      </header>

      <div className="flex items-center gap-1 border-b border-line/70 px-2 py-1.5" role="toolbar" aria-label="Mover lo seleccionado">
        {MOVES.map(({ move, label, icon }) => (
          <button
            key={move}
            type="button"
            aria-label={label}
            title={`${label} (${LAYER_SHORTCUTS[move]})`}
            disabled={selection.nodeIds.length === 0}
            onClick={() => moveLayers(module, move)}
            className="flex h-8 flex-1 items-center justify-center rounded-md text-xs text-ink-600 hover:bg-raised hover:text-ink-900 disabled:pointer-events-none disabled:opacity-35"
          >
            <FontAwesomeIcon icon={icon} />
          </button>
        ))}
      </div>

      {empty ? (
        <p className="px-3.5 py-4 text-xs text-ink-400">Aún no hay artefactos en el lienzo.</p>
      ) : (
        <ul role="tree" aria-label="Orden de los artefactos, del frente al fondo" className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {rows.map(({ node, level, hasChildren }) => {
            const kind = module.nodeKinds[node.artifactType];
            const name = node.label.trim() || module.artifacts.find((artifact) => artifact.type === node.artifactType)?.name || 'Sin nombre';
            const isSelected = selected.has(node.id);
            const over = drag?.over?.id === node.id ? drag.over : null;
            return (
              <li
                key={node.id}
                role="treeitem"
                aria-level={level + 1}
                aria-selected={isSelected}
                aria-expanded={hasChildren ? !collapsed.has(node.id) : undefined}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDrag({ id: node.id });
                }}
                onDragOver={(event) => onDragOver(event, node.id)}
                onDrop={onDrop}
                onDragEnd={() => setDrag(null)}
                className={`group/row relative flex items-center rounded-md ${isSelected ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised'} ${
                  drag?.id === node.id ? 'opacity-40' : ''
                }`}
                style={{ paddingLeft: level * 14 }}
              >
                {over && <span aria-hidden className={`absolute inset-x-1 h-0.5 rounded-full bg-accent ${over.above ? '-top-px' : '-bottom-px'}`} />}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden={!hasChildren}
                  onClick={() => hasChildren && toggleCollapsed(node.id)}
                  className={`flex size-5 shrink-0 items-center justify-center text-[9px] text-ink-400 ${hasChildren ? '' : 'invisible'}`}
                >
                  <FontAwesomeIcon icon={faChevronRight} className={`transition-transform ${collapsed.has(node.id) ? '' : 'rotate-90'}`} />
                </button>
                <button type="button" onClick={(event) => select(event, node.id)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left text-[13px]">
                  <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
                    {kind && <ArtifactFigure kind={kind} artifactType={node.artifactType} box={{ width: 20, height: 20 }} />}
                  </span>
                  <span className="truncate">{name}</span>
                </button>
                <button
                  type="button"
                  aria-label={node.locked ? `Desbloquear ${name}` : `Bloquear ${name}`}
                  title={node.locked ? 'Desbloquear' : 'Bloquear'}
                  onClick={() => store().updateNode(node.id, { locked: !node.locked })}
                  className={`mr-1 flex size-6 shrink-0 items-center justify-center rounded text-[10px] hover:bg-surface ${
                    node.locked ? 'text-ink-600' : 'text-ink-400 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100'
                  }`}
                >
                  <FontAwesomeIcon icon={node.locked ? faLock : faLockOpen} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-line/70 px-3.5 py-2 text-[11px] text-ink-400">Arriba, lo que está al frente. Arrastra una fila para reordenar.</p>
    </section>
  );
}

/**
 * Filas del panel: cada nivel de frente a fondo (el orden inverso al de dibujo),
 * con los hijos de un contenedor justo debajo de él.
 */
function layerRows(diagram: Diagram, module: DiagramModule, collapsed: ReadonlySet<string>): LayerRow[] {
  const index = new Map(diagram.nodes.map((node, position) => [node.id, position]));
  const byParent = new Map<string | null, DiagramNode[]>();
  for (const node of diagram.nodes) byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
  const frontFirst = (a: DiagramNode, b: DiagramNode) =>
    drawOrder(b, module, diagram) - drawOrder(a, module, diagram) || index.get(b.id)! - index.get(a.id)!;

  const rows: LayerRow[] = [];
  const visit = (parentId: string | null, level: number) => {
    for (const node of [...(byParent.get(parentId) ?? [])].sort(frontFirst)) {
      const hasChildren = byParent.has(node.id);
      rows.push({ node, level, hasChildren });
      if (hasChildren && !collapsed.has(node.id)) visit(node.id, level + 1);
    }
  };
  visit(null, 0);
  return rows;
}
