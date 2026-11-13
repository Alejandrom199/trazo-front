import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';

/**
 * Guarda ya el diagrama abierto, sin esperar al guardado automático. Se llama antes
 * de cambiar de diagrama, para no perder lo último, y al agregar uno al proyecto,
 * para que aparezca en su lista (que se arma con los diagramas guardados).
 */
export function saveCurrentNow(): void {
  const diagram = useDiagramStore.getState().diagram;
  const persistence = usePersistenceStore.getState();
  if (!diagram || !persistence.repository) return;
  persistence.repository.save(diagram);
  persistence.refresh();
}

/** Guarda el abierto y abre otro diagrama guardado. */
export function openSavedDiagram(id: string): void {
  if (id === useDiagramStore.getState().diagram?.id) return;
  saveCurrentNow();
  const diagram = usePersistenceStore.getState().repository?.load(id);
  if (diagram) useDiagramStore.getState().openDiagram(diagram);
}

/**
 * Abre otro proyecto guardado. Antes guarda el diagrama abierto; si no es de ese
 * proyecto, abre el primero del proyecto (en su orden) que siga guardado.
 */
export function openStoredProject(projectId: string): void {
  saveCurrentNow();
  useProjectStore.getState().switchProject(projectId);
  const project = useProjectStore.getState().project;
  const currentId = useDiagramStore.getState().diagram?.id;
  if (!project || (currentId && project.diagramIds.includes(currentId))) return;
  const saved = new Set(usePersistenceStore.getState().summaries.map((summary) => summary.id));
  const first = project.diagramIds.find((id) => saved.has(id));
  if (first) openSavedDiagram(first);
}

/** Agrega al proyecto activo el diagrama abierto (guardándolo para que se liste). */
export function addCurrentToProject(): void {
  const id = useDiagramStore.getState().diagram?.id;
  if (!id || !useProjectStore.getState().project) return;
  saveCurrentNow();
  useProjectStore.getState().addDiagram(id);
}
