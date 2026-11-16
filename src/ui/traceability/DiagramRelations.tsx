import { faArrowUpRightFromSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { TRACE_RELATIONS, type Diagram, type DiagramProject, type TraceRelation } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { openSavedDiagram } from '@/ui/projects/projectActions';

const selectClass = 'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent';

/**
 * Relaciones del diagrama abierto con otros diagramas completos del proyecto
 * («este diagrama implementa «Dominio»»): no unen elementos, sino diagramas, y
 * forman las flechas del mapa del proyecto.
 */
export function DiagramRelations({ project, current, diagrams }: { project: DiagramProject; current: Diagram; diagrams: Diagram[] }) {
  const others = diagrams.filter((diagram) => diagram.id !== current.id);
  const [relation, setRelation] = useState<TraceRelation>('detalla');
  const [targetId, setTargetId] = useState('');
  const nameOf = (id: string) => diagrams.find((diagram) => diagram.id === id)?.name ?? 'Diagrama no disponible';
  const related = project.diagramRelations.filter((item) => item.sourceDiagramId === current.id || item.targetDiagramId === current.id);
  const target = others.some((diagram) => diagram.id === targetId) ? targetId : (others[0]?.id ?? '');

  return (
    <section className="border-t border-line p-4">
      <h3 className="text-xs font-semibold text-ink-900">Relaciones de este diagrama</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">Entre diagramas completos, no entre elementos. Forman el mapa del proyecto.</p>

      {related.length > 0 && (
        <ul className="mt-3 space-y-2">
          {related.map((item) => {
            const outgoing = item.sourceDiagramId === current.id;
            const otherId = outgoing ? item.targetDiagramId : item.sourceDiagramId;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                <button type="button" onClick={() => openSavedDiagram(otherId)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[11px] text-ink-400">{outgoing ? `Este diagrama ${item.relation}` : `${item.relation} este diagrama`}</span>
                  <span className="mt-0.5 block truncate text-sm text-ink-900 hover:text-accent">«{nameOf(otherId)}»</span>
                </button>
                <button type="button" onClick={() => openSavedDiagram(otherId)} aria-label={`Abrir «${nameOf(otherId)}»`} className="flex size-9 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-accent">
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[11px]" />
                </button>
                <button type="button" onClick={() => useProjectStore.getState().removeDiagramRelation(item.id)} aria-label="Quitar la relación" className="flex size-9 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
                  <FontAwesomeIcon icon={faTrashCan} className="text-[11px]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {others.length === 0 ? (
        <p className="mt-3 text-xs text-ink-600">Añade otro diagrama al proyecto para relacionarlos.</p>
      ) : (
        <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2">
          <span className="text-xs text-ink-600">Este diagrama</span>
          <select aria-label="Relación" value={relation} onChange={(event) => setRelation(event.target.value as TraceRelation)} className={selectClass}>
            {TRACE_RELATIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <span className="text-xs text-ink-600">a</span>
          <select aria-label="Diagrama relacionado" value={target} onChange={(event) => setTargetId(event.target.value)} className={selectClass}>
            {others.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}
          </select>
          <button
            type="button"
            disabled={!target}
            onClick={() => useProjectStore.getState().addDiagramRelation(current.id, target, relation)}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> Relacionar diagramas
          </button>
        </div>
      )}
    </section>
  );
}
