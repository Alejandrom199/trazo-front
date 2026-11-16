import { createEmptyDiagram, withLinkedDiagram, type Diagram, type DiagramType } from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { openSavedDiagram, saveCurrentNow } from './projectActions';

/**
 * Enlaza un nodo del diagrama abierto con `diagram` y le pone su nombre: el
 * subproceso se llama como el diagrama que lo detalla. Un paso de deshacer.
 */
export function linkNodeToDiagram(nodeId: string, diagram: Pick<Diagram, 'id' | 'name'>): void {
  const node = useDiagramStore.getState().diagram?.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return;
  useDiagramStore.getState().updateNode(nodeId, { label: diagram.name, props: withLinkedDiagram(node.props, diagram.id) });
}

/** Quita el enlace del nodo (conserva su nombre). */
export function unlinkNode(nodeId: string): void {
  const node = useDiagramStore.getState().diagram?.nodes.find((candidate) => candidate.id === nodeId);
  if (node) useDiagramStore.getState().updateNode(nodeId, { props: withLinkedDiagram(node.props, null) });
}

/**
 * Crea un diagrama vacío en el proyecto activo, enlaza con él el nodo y, si
 * `open`, lo abre para empezar a dibujarlo. Devuelve el diagrama creado.
 */
export function createLinkedDiagram(nodeId: string, name: string, diagramType: DiagramType, open: boolean): Diagram | null {
  const repository = usePersistenceStore.getState().repository;
  if (!repository || !useProjectStore.getState().project) return null;
  const diagram = createEmptyDiagram({ name: name.trim() || 'Subproceso', diagramType });
  linkNodeToDiagram(nodeId, diagram);
  repository.save(diagram);
  saveCurrentNow();
  useProjectStore.getState().addDiagram(diagram.id);
  if (open) openSavedDiagram(diagram.id);
  return diagram;
}
