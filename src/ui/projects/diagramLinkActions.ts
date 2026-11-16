import { createDiagramFromTemplate, createEmptyDiagram, linkedTemplateId, withLinkedDiagram, type Diagram, type DiagramType, type Template } from '@/core/model';
import { diagramRegistry } from '@/core/registry';
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

/** El ejemplo (plantilla) con ese id, de cualquier tipo de diagrama. */
export function findTemplate(templateId: string | null): Template | undefined {
  if (!templateId) return undefined;
  return diagramRegistry.list().flatMap((module) => module.templates).find((template) => template.id === templateId);
}

/**
 * Crea el diagrama de un subproceso desde el ejemplo que lo detalla (el
 * `linkedTemplateId` del nodo, p. ej. «Procesar pago» en «Pedido en línea»):
 * lo guarda, lo suma al proyecto si el diagrama abierto es de él y lo enlaza
 * al nodo. Se hace al pedirlo, no al abrir el ejemplo, para no llenar «Tus
 * diagramas» de copias que nadie usa. Devuelve el diagrama creado.
 */
export function createFromLinkedTemplate(nodeId: string): Diagram | null {
  const current = useDiagramStore.getState().diagram;
  const node = current?.nodes.find((candidate) => candidate.id === nodeId);
  const template = node ? findTemplate(linkedTemplateId(node.props)) : undefined;
  const repository = usePersistenceStore.getState().repository;
  if (!current || !node || !template || !repository) return null;
  const child = createDiagramFromTemplate(template);
  repository.save(child);
  useDiagramStore.getState().updateNode(nodeId, { props: withLinkedDiagram(node.props, child.id) });
  saveCurrentNow();
  const project = useProjectStore.getState().project;
  if (project?.diagramIds.includes(current.id)) useProjectStore.getState().addDiagram(child.id);
  return child;
}
