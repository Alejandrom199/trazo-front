import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { absolutePosition, findContainerAt, snapContainerPosition, type DiagramNode, type Position } from '@/core/model';
import { createNode, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useActiveModule } from './useActiveModule';

const store = () => useDiagramStore.getState();

/** Separación entre artefactos agregados uno tras otro en el centro, para que no queden apilados. */
const STACK_OFFSET = 24;

/**
 * Crea un artefacto centrado en `point` (coordenadas del lienzo). Si cae dentro
 * de un carril, queda dentro de él; si es un carril, se pega a sus vecinos.
 * Lo deja seleccionado y, si tiene texto, listo para escribirlo.
 */
export function placeArtifact(module: DiagramModule, artifactType: string, point: Position): void {
  const diagram = store().diagram;
  const kind = module.nodeKinds[artifactType];
  if (!diagram || !kind) return;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;

  const centered = { x: point.x - kind.defaultSize.width / 2, y: point.y - kind.defaultSize.height / 2 };
  const container = kind.isContainer ? null : findContainerAt(diagram, point, isContainer);
  const containerOrigin = container ? absolutePosition(diagram, container) : { x: 0, y: 0 };
  const topLeft = kind.isContainer
    ? snapContainerPosition(diagram, null, centered, kind.defaultSize, isContainer)
    : centered;

  const node = createNode({
    artifactType,
    kind,
    position: { x: topLeft.x - containerOrigin.x, y: topLeft.y - containerOrigin.y },
    parentId: container?.id ?? null,
  });
  store().addNode(node);
  store().setSelection({ nodeIds: [node.id], edgeIds: [] });
  store().startEditing(kind.hasLabel ? node.id : null);
}

/**
 * Agrega un artefacto en el centro de la vista actual (clic en la paleta).
 * Si ya hay uno en ese mismo punto, el nuevo se corre en diagonal.
 */
export function useAddArtifactAtCenter() {
  const module = useActiveModule();
  const { screenToFlowPosition } = useReactFlow();

  return useCallback(
    (artifactType: string) => {
      const pane = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!module || !pane) return;
      const center = screenToFlowPosition({ x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 });
      const kind = module.nodeKinds[artifactType];
      const diagram = store().diagram;
      if (!kind || !diagram) return;

      const isTaken = (point: Position) =>
        diagram.nodes.some((node) => {
          const origin = absolutePosition(diagram, node);
          return (
            node.artifactType === artifactType &&
            Math.abs(origin.x + node.size.width / 2 - point.x) < STACK_OFFSET / 2 &&
            Math.abs(origin.y + node.size.height / 2 - point.y) < STACK_OFFSET / 2
          );
        });
      let point = center;
      while (isTaken(point)) point = { x: point.x + STACK_OFFSET, y: point.y + STACK_OFFSET };
      placeArtifact(module, artifactType, point);
    },
    [module, screenToFlowPosition],
  );
}
