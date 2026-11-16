import { useMemo } from 'react';
import type { Diagram } from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';

/**
 * Diagramas del proyecto abierto, en su orden. El diagrama en edición sale del
 * store (con sus cambios aún sin guardar); los demás, de lo guardado. Los demás
 * solo se releen al cambiar de proyecto o de diagrama abierto, no en cada edición.
 */
export function useProjectDiagrams(): Diagram[] {
  const project = useProjectStore((state) => state.project);
  const repository = usePersistenceStore((state) => state.repository);
  const current = useDiagramStore((state) => state.diagram);
  const currentId = current?.id;

  const saved = useMemo(() => {
    const byId = new Map<string, Diagram>();
    for (const id of project?.diagramIds ?? []) {
      if (id === currentId) continue;
      const diagram = repository?.load(id);
      if (diagram) byId.set(id, diagram);
    }
    return byId;
  }, [project?.diagramIds, repository, currentId]);

  return useMemo(
    () => (project?.diagramIds ?? [])
      .map((id) => (id === current?.id ? current : saved.get(id)))
      .filter((diagram): diagram is Diagram => diagram !== undefined),
    [project?.diagramIds, saved, current],
  );
}
