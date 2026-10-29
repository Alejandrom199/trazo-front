import type { DiagramNode, Position } from '@/core/model';
import { createId } from '@/core/utils/id';
import type { NodeKind } from './diagramModule';

export interface NewNodeInput {
  artifactType: string;
  kind: NodeKind;
  /** Esquina superior izquierda, relativa a `parentId` si lo hay. */
  position: Position;
  parentId: string | null;
}

/** Crea un nodo con los valores por defecto que declara su módulo. */
export function createNode(input: NewNodeInput): DiagramNode {
  return {
    id: createId(),
    artifactType: input.artifactType,
    label: input.kind.defaultLabel,
    position: input.position,
    size: { ...input.kind.defaultSize },
    parentId: input.parentId,
    props: { ...input.kind.defaultProps },
    notes: '',
    locked: false,
  };
}
