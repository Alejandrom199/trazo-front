import type { DragEvent } from 'react';
import type { ArtifactCategory, ArtifactDefinition, DiagramNode } from '@/core/model';
import type { NodeKind } from '@/core/registry';
import { ARTIFACT_DRAG_MIME } from '@/canvas/dragAndDrop';
import { useActiveModule } from '@/canvas/useActiveModule';
import { Panel } from '@/ui/layout/Panel';

/** Orden en que se muestran las categorías en la paleta. */
const CATEGORY_ORDER: { category: ArtifactCategory; title: string }[] = [
  { category: 'nodo de control', title: 'Control' },
  { category: 'nodo ejecutable', title: 'Acciones' },
  { category: 'nodo de objeto', title: 'Objetos' },
  { category: 'agrupación', title: 'Agrupación' },
  { category: 'anotación', title: 'Anotación' },
];

/** Paleta de artefactos del módulo activo, agrupada por categoría y lista para arrastrar. */
export function PalettePanel() {
  const module = useActiveModule();
  if (!module) return null;

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
                return kind ? <PaletteItem key={artifact.type} artifact={artifact} kind={kind} /> : null;
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
    </Panel>
  );
}

const PREVIEW = { width: 40, height: 26 };

function PaletteItem({ artifact, kind }: { artifact: ArtifactDefinition; kind: NodeKind }) {
  function handleDragStart(event: DragEvent) {
    event.dataTransfer.setData(ARTIFACT_DRAG_MIME, artifact.type);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-ink-900 select-none hover:bg-canvas active:cursor-grabbing"
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
