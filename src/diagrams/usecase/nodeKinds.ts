import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { USE_CASE_RELATION_TYPES, UseCaseArtifact as U } from './artifactTypes';
import { ActorShape, SystemBoundaryShape, UseCaseShape } from './nodes/UseCaseShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '', defaultProps: {}, hasLabel: false, resizable: false,
  isContainer: false, connectable: true, properties: [],
};

export const useCaseNodeKinds: Record<string, NodeKind> = {
  [U.actor]: { ...base, component: ActorShape, defaultSize: { width: 90, height: 120 }, defaultLabel: 'Actor', hasLabel: true, resizable: true },
  [U.useCase]: { ...base, component: UseCaseShape, defaultSize: { width: 170, height: 72 }, defaultLabel: 'Nuevo caso de uso', hasLabel: true, resizable: true },
  [U.systemBoundary]: {
    ...base, component: SystemBoundaryShape, defaultSize: { width: 620, height: 430 }, defaultLabel: 'Sistema',
    hasLabel: true, resizable: true, isContainer: true, connectable: false, magnetic: false,
  },
  [U.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', hasLabel: true, resizable: true },
};

const dependency = (): EdgeKind => ({
  dashed: true, arrow: 'open', text: 'label', textCaption: 'Estereotipo', switchableTo: [...USE_CASE_RELATION_TYPES],
});

export const useCaseEdgeKinds: Record<string, EdgeKind> = {
  [U.association]: { dashed: false, arrow: null, text: null },
  [U.include]: dependency(),
  [U.extend]: dependency(),
  [U.generalization]: { dashed: false, arrow: 'open', text: null },
  [U.annotationLink]: { dashed: true, arrow: null, text: null },
};
