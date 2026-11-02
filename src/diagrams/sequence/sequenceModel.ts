import { absolutePosition, horizontalEdgeY, type Diagram, type DiagramEdge, type DiagramNode } from '@/core/model';
import { readNumberProperty } from '@/core/registry';
import { FRAGMENT_TYPES, MESSAGE_TYPES, PARTICIPANT_TYPES, SequenceArtifact as S, SPLIT_FRAGMENT_TYPES } from './artifactTypes';
import { fragmentDivider } from './nodes/SequenceShapes';

/**
 * Vista "en el tiempo" de un diagrama de secuencia: la comparten las reglas, el
 * narrador y las conexiones, para que todos entiendan igual qué ocurre antes.
 * El tiempo corre hacia abajo: un mensaje ocurre antes que otro si está más arriba.
 */

export interface TimedMessage {
  edge: DiagramEdge;
  /** Altura absoluta en el lienzo (ver core/model/horizontalEdge). */
  y: number;
}

export interface FragmentArea {
  node: DiagramNode;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Altura de la línea que separa las dos regiones (alt, par); null si no se divide. */
  dividerY: number | null;
}

export interface Destruction {
  node: DiagramNode;
  lifelineId: string;
  y: number;
}

export interface SequenceModel {
  participants: DiagramNode[];
  /** Ordenados de arriba abajo (del primero al último). */
  messages: TimedMessage[];
  fragments: FragmentArea[];
  destructions: Destruction[];
  /** Línea central de cada participante, para saber qué abarca un fragmento. */
  centerXOf: (participantId: string) => number;
}

const MESSAGE_SET = new Set(MESSAGE_TYPES);

export const isMessage = (edge: DiagramEdge) => MESSAGE_SET.has(edge.artifactType);

export function buildSequenceModel(diagram: Diagram): SequenceModel {
  const participants = diagram.nodes.filter((node) => PARTICIPANT_TYPES.has(node.artifactType));
  const centers = new Map(participants.map((node) => [node.id, absolutePosition(diagram, node).x + node.size.width / 2]));

  const messages = diagram.edges
    .filter(isMessage)
    .map((edge) => ({ edge, y: horizontalEdgeY(diagram, edge) }))
    .sort((a, b) => a.y - b.y);

  const fragments = diagram.nodes
    .filter((node) => FRAGMENT_TYPES.has(node.artifactType))
    .map((node) => {
      const origin = absolutePosition(diagram, node);
      const top = origin.y;
      const bottom = origin.y + node.size.height;
      const dividerY = SPLIT_FRAGMENT_TYPES.has(node.artifactType)
        ? top + (node.size.height * readNumberProperty(node, fragmentDivider)) / 100
        : null;
      return { node, top, bottom, left: origin.x, right: origin.x + node.size.width, dividerY };
    });

  const destructions = diagram.nodes
    .filter((node) => node.artifactType === S.destruction && node.parentId !== null)
    .map((node) => ({ node, lifelineId: node.parentId!, y: absolutePosition(diagram, node).y + node.size.height / 2 }));

  return { participants, messages, fragments, destructions, centerXOf: (id) => centers.get(id) ?? 0 };
}

/**
 * Un mensaje está dentro de un fragmento si ocurre entre su borde superior e
 * inferior y al menos uno de sus extremos cae dentro del marco en horizontal.
 */
export function isInside(model: SequenceModel, message: TimedMessage, fragment: FragmentArea): boolean {
  if (message.y <= fragment.top || message.y >= fragment.bottom) return false;
  const xs = [model.centerXOf(message.edge.sourceId), model.centerXOf(message.edge.targetId)];
  return xs.some((x) => x >= fragment.left && x <= fragment.right);
}

/** En qué región de un fragmento dividido cae un mensaje: 0 arriba, 1 abajo. */
export function regionOf(fragment: FragmentArea, message: TimedMessage): 0 | 1 {
  return fragment.dividerY !== null && message.y > fragment.dividerY ? 1 : 0;
}

/** Nombre legible de un participante (o de cualquier nodo) por su id. */
export function nameOf(diagram: Diagram, nodeId: string): string {
  return diagram.nodes.find((node) => node.id === nodeId)?.label.trim() || 'participante sin nombre';
}
