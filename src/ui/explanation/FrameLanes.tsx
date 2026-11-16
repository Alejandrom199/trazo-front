import { faArrowLeft, faArrowRight, faObjectGroup, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { lanesOf, moveLaneInFrame, type Diagram, type DiagramNode } from '@/core/model';
import { createNode, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { repackLaneFrames } from '@/canvas/laneFrames';
import { ArtifactFigure } from '@/ui/artifacts/ArtifactFigure';
import { TextInput } from './formFields';

const store = () => useDiagramStore.getState();
const iconButton = 'flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] text-ink-400 hover:bg-surface hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30';

/**
 * Carriles de un marco de actividad, en Propiedades del marco: se renombran,
 * se reordenan, se seleccionan (uno o todos, como una selección múltiple) y se
 * agregan sin salir del panel.
 */
export function FrameLanes({ frame, diagram, module }: { frame: DiagramNode; diagram: Diagram; module: DiagramModule }) {
  const headerHeight = module.nodeKinds[frame.artifactType]?.laneFrame?.headerHeight ?? 0;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  const lanes = lanesOf(diagram, frame.id, isContainer);
  const laneType = Object.entries(module.nodeKinds).find(([, kind]) => kind.nestsOnlyIn?.includes(frame.artifactType))?.[0];
  const laneKind = laneType ? module.nodeKinds[laneType] : undefined;
  const childCount = (lane: DiagramNode) => diagram.nodes.filter((node) => node.parentId === lane.id).length;

  const move = (laneId: string, toIndex: number) =>
    store().applyChange((current) => moveLaneInFrame(current, frame.id, laneId, toIndex, headerHeight, isContainer));

  function addLane() {
    if (!laneType || !laneKind) return;
    const lane = createNode({ artifactType: laneType, kind: laneKind, position: { x: frame.size.width, y: headerHeight }, parentId: frame.id });
    store().addNode(lane);
    repackLaneFrames(module, [frame.id]);
    store().setSelection({ nodeIds: [frame.id], edgeIds: [] });
  }

  return (
    <section aria-label="Carriles del marco" className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Carriles</h3>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{lanes.length}</span>
        {lanes.length > 1 && (
          <button
            type="button"
            onClick={() => store().setSelection({ nodeIds: lanes.map((lane) => lane.id), edgeIds: [] })}
            title="Seleccionarlos todos para editarlos a la vez"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft"
          >
            <FontAwesomeIcon icon={faObjectGroup} className="text-[10px]" /> Seleccionar todos
          </button>
        )}
      </div>

      {lanes.length === 0 ? (
        <p className="rounded-lg bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink-600">Arrastra carriles dentro del marco o agrégalos aquí: se acomodan solos como columnas.</p>
      ) : (
        <ol className="space-y-1">
          {lanes.map((lane, index) => (
            <li key={lane.id} className="flex items-center gap-2 rounded-lg border border-line bg-canvas py-1 pr-1 pl-2">
              <button type="button" onClick={() => store().setSelection({ nodeIds: [lane.id], edgeIds: [] })} title="Seleccionar este carril" className="flex h-7 w-9 shrink-0 items-center justify-center rounded-md bg-surface hover:ring-2 hover:ring-accent/30">
                {laneKind && laneType && <ArtifactFigure kind={laneKind} artifactType={laneType} box={{ width: 26, height: 18 }} />}
              </button>
              <div className="min-w-0 flex-1">
                <TextInput value={lane.label} placeholder="Responsable" onCommit={(label) => store().updateNode(lane.id, { label })} />
                <p className="mt-0.5 px-1 text-[10px] text-ink-400">{childCount(lane) === 1 ? '1 elemento' : `${childCount(lane)} elementos`}</p>
              </div>
              <button type="button" onClick={() => move(lane.id, index - 1)} disabled={index === 0} aria-label={`Mover «${lane.label}» a la izquierda`} className={iconButton}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <button type="button" onClick={() => move(lane.id, index + 1)} disabled={index === lanes.length - 1} aria-label={`Mover «${lane.label}» a la derecha`} className={iconButton}>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {laneType && (
        <button type="button" onClick={addLane} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-ink-600 hover:border-accent/50 hover:text-accent">
          <FontAwesomeIcon icon={faPlus} className="text-[10px]" /> Agregar carril
        </button>
      )}
    </section>
  );
}
