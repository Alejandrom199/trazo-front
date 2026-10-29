import { diagramRegistry, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';

/** Módulo del diagrama abierto (catálogo, nodos, reglas), o null si no hay diagrama. */
export function useActiveModule(): DiagramModule | null {
  const diagramType = useDiagramStore((state) => state.diagram?.diagramType);
  return diagramType ? diagramRegistry.get(diagramType) : null;
}
