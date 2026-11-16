import { absolutePosition, packLanes, type DiagramNode } from '@/core/model';
import { isMagnetic, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';

/**
 * Contenedores en los que puede entrar un artefacto de tipo `artifactType`: si
 * su tipo declara `nestsOnlyIn`, solo esos (un carril entra en un marco, no en
 * otro carril); si no, cualquier contenedor.
 */
export function containersFor(module: DiagramModule, artifactType: string): (node: DiagramNode) => boolean {
  const allowed = module.nodeKinds[artifactType]?.nestsOnlyIn;
  return (node) => {
    const kind = module.nodeKinds[node.artifactType];
    return (kind?.isContainer ?? false) && (!allowed || allowed.includes(node.artifactType));
  };
}

/**
 * Vuelve a acomodar en columnas los carriles de los marcos indicados (los que
 * no son marcos de carriles, o null, se ignoran). Forma parte del gesto que lo
 * provocó: no agrega un paso de deshacer.
 */
export function repackLaneFrames(module: DiagramModule, containerIds: readonly (string | null)[]): void {
  const store = useDiagramStore.getState();
  const isContainer = (node: DiagramNode) => module.nodeKinds[node.artifactType]?.isContainer ?? false;
  for (const id of new Set(containerIds)) {
    const frame = id ? store.diagram?.nodes.find((node) => node.id === id) : undefined;
    const laneFrame = frame && module.nodeKinds[frame.artifactType]?.laneFrame;
    if (frame && laneFrame) store.adjustLayout((diagram) => packLanes(diagram, frame.id, laneFrame.headerHeight, isContainer));
  }
}

/**
 * Contenedores a los que se pega el imán: solo los que también tienen imán. Un
 * marco no lo tiene, así que un carril que se acerca a su borde no queda
 * pegado por fuera: entra en él al soltarlo.
 */
export function magneticContainers(module: DiagramModule): (node: DiagramNode) => boolean {
  return (node) => {
    const kind = module.nodeKinds[node.artifactType];
    return kind !== undefined && kind.isContainer && isMagnetic(kind);
  };
}

/**
 * Un marco que se coloca o se suelta encima de carriles sueltos los adopta: los
 * que tienen el centro dentro del marco pasan a ser sus columnas. Forma parte
 * del gesto (sin paso propio de deshacer).
 */
export function adoptLanes(module: DiagramModule, frameId: string): void {
  const store = useDiagramStore.getState();
  const diagram = store.diagram;
  const frame = diagram?.nodes.find((node) => node.id === frameId);
  if (!diagram || !frame || !module.nodeKinds[frame.artifactType]?.laneFrame) return;
  const origin = absolutePosition(diagram, frame);
  const inside = (node: DiagramNode) => {
    const center = { x: node.position.x + node.size.width / 2, y: node.position.y + node.size.height / 2 };
    return center.x >= origin.x && center.x <= origin.x + frame.size.width && center.y >= origin.y && center.y <= origin.y + frame.size.height;
  };
  const lanes = diagram.nodes.filter(
    (node) => node.parentId === null && module.nodeKinds[node.artifactType]?.nestsOnlyIn?.includes(frame.artifactType) && inside(node),
  );
  if (lanes.length === 0) return;
  store.reparentNodes(lanes.map((lane) => lane.id), frame.id);
  repackLaneFrames(module, [frame.id]);
}
