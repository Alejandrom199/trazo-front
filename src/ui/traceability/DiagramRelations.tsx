import { faArrowUpRightFromSquare, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { TRACE_RELATIONS, TRACE_RELATION_HINTS, traceRelationVerb, type Diagram, type DiagramProject, type TraceRelation } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { openSavedDiagram } from '@/ui/projects/projectActions';

const selectClass = 'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent';

/**
 * Relaciones del diagrama abierto con otros diagramas completos del proyecto
 * («este diagrama implementa «Dominio»»): no unen elementos, sino diagramas, y
 * forman las flechas del mapa del proyecto. Cada relación se muestra como una
 * frase completa, con el sujeto siempre delante, para que se lea sin ambigüedad.
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
      <h3 className="text-xs font-semibold text-ink-900">Relación con otros diagramas</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">Cómo encaja «{current.name}» con el resto del proyecto. Cada relación es una flecha en el mapa del proyecto.</p>

      {related.length === 0 ? (
        <p className="mt-3 text-xs text-ink-600">Todavía no está relacionado con ningún diagrama.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {related.map((item) => {
            const outgoing = item.sourceDiagramId === current.id;
            const otherId = outgoing ? item.targetDiagramId : item.sourceDiagramId;
            const other = <button type="button" onClick={() => openSavedDiagram(otherId)} className="font-medium text-ink-900 hover:text-accent hover:underline">«{nameOf(otherId)}»</button>;
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-line py-1 pl-3 pr-1">
                <p className="min-w-0 flex-1 text-sm leading-snug text-ink-600">
                  {outgoing ? <>Este diagrama <strong className="font-semibold text-accent">{traceRelationVerb(item.relation)}</strong> {other}</> : <>{other} <strong className="font-semibold text-accent">{traceRelationVerb(item.relation)}</strong> este diagrama</>}
                </p>
                <button type="button" onClick={() => openSavedDiagram(otherId)} aria-label={`Abrir «${nameOf(otherId)}»`} title="Abrir ese diagrama" className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-raised hover:text-accent">
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[11px]" />
                </button>
                <button type="button" onClick={() => useProjectStore.getState().removeDiagramRelation(item.id)} aria-label="Quitar la relación" title="Quitar la relación" className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger">
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
        <div className="mt-4 space-y-2 rounded-lg bg-raised/50 p-3">
          <p className="text-xs font-semibold text-ink-900">Nueva relación</p>
          <label className="block text-[11px] text-ink-400">
            Este diagrama…
            <select value={relation} onChange={(event) => setRelation(event.target.value as TraceRelation)} className={`${selectClass} mt-1`}>
              {TRACE_RELATIONS.map((item) => <option key={item} value={item}>{traceRelationVerb(item)}</option>)}
            </select>
          </label>
          <label className="block text-[11px] text-ink-400">
            …este otro diagrama
            <select value={target} onChange={(event) => setTargetId(event.target.value)} className={`${selectClass} mt-1`}>
              {others.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.name}</option>)}
            </select>
          </label>
          <p className="text-[11px] leading-relaxed text-ink-600">
            Se leerá: <span className="text-ink-900">«{current.name}» <strong className="text-accent">{traceRelationVerb(relation)}</strong> «{nameOf(target)}»</span>, es decir, {TRACE_RELATION_HINTS[relation]}.
          </p>
          <button
            type="button"
            disabled={!target}
            onClick={() => useProjectStore.getState().addDiagramRelation(current.id, target, relation)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" /> Añadir relación
          </button>
        </div>
      )}
    </section>
  );
}
