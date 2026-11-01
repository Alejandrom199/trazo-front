import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { absolutePosition, findContainerAt, snapContainerPosition, type DiagramNode, type Position } from '@/core/model';
import { createNode, isMagnetic, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useActiveModule } from './useActiveModule';

const store = () => useDiagramStore.getState();

/** Separación entre artefactos agregados uno tras otro en el centro, para que no queden apilados. */
const STACK_OFFSET = 24;

/**
 * Crea un artefacto centrado en `point` (coordenadas del lienzo). Si cae dentro
 * de un contenedor, queda dentro de él (y centrado, si su tipo lo pide); si es un
 * contenedor con imán, se pega a sus vecinos; si solo se desliza en horizontal,
 * se pone en la fila de los demás que lo hacen. Lo deja seleccionado y, si tiene
 * texto, listo para escribirlo.
 */
export function placeArtifact(module: DiagramModule, artifactType: string, point: Position): void {
  const diagram = store().diagram;
  const kind = module.nodeKinds[artifactType];
  if (!diagram || !kind) return;
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;

  const row = kind.dragAxis === 'x' ? rowOf(module, diagram.nodes) : null;
  const centered = { x: point.x - kind.defaultSize.width / 2, y: row ?? point.y - kind.defaultSize.height / 2 };
  const container = kind.isContainer ? null : findContainerAt(diagram, point, isContainer);
  const containerOrigin = container ? absolutePosition(diagram, container) : { x: 0, y: 0 };
  const snapped = isMagnetic(kind) ? snapContainerPosition(diagram, null, centered, kind.defaultSize, isContainer) : centered;
  const topLeft =
    container && kind.centerInContainer
      ? { x: containerOrigin.x + (container.size.width - kind.defaultSize.width) / 2, y: snapped.y }
      : snapped;

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

/** Altura de la fila que comparten los nodos que solo se deslizan en horizontal (null si no hay ninguno). */
function rowOf(module: DiagramModule, nodes: DiagramNode[]): number | null {
  const first = nodes.find((node) => node.parentId === null && module.nodeKinds[node.artifactType]?.dragAxis === 'x');
  return first ? first.position.y : null;
}

/** Centra horizontalmente un nodo en su contenedor (p. ej. una activación en su línea de vida). */
export function centerInParent(nodeId: string): void {
  const diagram = store().diagram;
  const node = diagram?.nodes.find((candidate) => candidate.id === nodeId);
  const parent = node?.parentId ? diagram?.nodes.find((candidate) => candidate.id === node.parentId) : undefined;
  if (!node || !parent) return;
  store().moveNodes([{ id: node.id, position: { x: (parent.size.width - node.size.width) / 2, y: node.position.y } }]);
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
