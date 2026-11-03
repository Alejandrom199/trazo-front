import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { StateArtifact as S } from './artifactTypes';
import { ChoiceShape, CompositeStateShape, FinalStateShape, HistoryShape, InitialStateShape, StateShape } from './nodes/StateShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: false,
  resizable: true,
  isContainer: false,
  connectable: true,
  properties: [],
};

/** Pseudoestados redondos o simétricos: se redimensionan conservando su proporción. */
const round = { keepAspectRatio: true };

export const stateNodeKinds: Record<string, NodeKind> = {
  [S.state]: { ...base, component: StateShape, defaultSize: { width: 150, height: 60 }, defaultLabel: 'Nuevo estado', hasLabel: true },
  [S.compositeState]: {
    ...base,
    component: CompositeStateShape,
    defaultSize: { width: 420, height: 260 },
    defaultLabel: 'Estado compuesto',
    hasLabel: true,
    isContainer: true,
    // Las transiciones salen y llegan a su borde: un estado compuesto no se pega a sus vecinos.
    magnetic: false,
    nestable: true,
    previewSize: { width: 120, height: 84 },
  },
  [S.initial]: { ...base, ...round, component: InitialStateShape, defaultSize: { width: 28, height: 28 } },
  [S.final]: { ...base, ...round, component: FinalStateShape, defaultSize: { width: 32, height: 32 } },
  [S.choice]: { ...base, ...round, component: ChoiceShape, defaultSize: { width: 36, height: 36 } },
  [S.history]: { ...base, ...round, component: HistoryShape, defaultSize: { width: 30, height: 30 } },
  [S.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', hasLabel: true, secondaryDetail: true },
};

export const stateEdgeKinds: Record<string, EdgeKind> = {
  [S.transition]: { dashed: false, arrow: 'open', text: 'label', textCaption: 'Evento [guarda] / efecto' },
  [S.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
