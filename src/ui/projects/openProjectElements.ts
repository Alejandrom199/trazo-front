import type { Diagram, TraceEndpoint } from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';

/**
 * Abre el diagrama de `elements[0]` (guardando antes el que está abierto, si es
 * otro) y selecciona los elementos que pertenecen a ese diagrama. Devuelve el
 * diagrama abierto, o null si no está entre `diagrams`.
 */
export function openProjectElements(elements: readonly TraceEndpoint[], diagrams: readonly Diagram[]): Diagram | null {
  const target = elements[0] && diagrams.find((diagram) => diagram.id === elements[0]!.diagramId);
  if (!target) return null;
  const store = useDiagramStore.getState();
  if (store.diagram?.id !== target.id) {
    const repository = usePersistenceStore.getState().repository;
    if (store.diagram && repository) repository.save(store.diagram);
    store.openDiagram(target);
  }
  const own = elements.filter((element) => element.diagramId === target.id);
  useDiagramStore.getState().setSelection({
    nodeIds: own.filter((element) => element.kind === 'node').map((element) => element.elementId),
    edgeIds: own.filter((element) => element.kind === 'edge').map((element) => element.elementId),
  });
  return target;
}
