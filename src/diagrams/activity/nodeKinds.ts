import type { EdgeKind, NodeKind } from '@/core/registry';
import { ActivityArtifact as A } from './artifactTypes';
import { BarShape, DiamondShape, FlowFinalShape, ActivityFinalShape, InitialNodeShape } from './nodes/ControlNodes';
import { AcceptEventShape, ActionShape, ObjectNodeShape, SendSignalShape } from './nodes/ExecutableNodes';
import { containerCornerRadius, NoteShape, PartitionShape } from './nodes/GroupingNodes';

/** Valores comunes; cada artefacto declara solo lo que cambia. */
const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: false,
  resizable: false,
  isContainer: false,
  connectable: true,
  properties: [],
};

export const activityNodeKinds: Record<string, NodeKind> = {
  [A.initialNode]: { ...base, component: InitialNodeShape, defaultSize: { width: 30, height: 30 } },
  [A.activityFinal]: { ...base, component: ActivityFinalShape, defaultSize: { width: 32, height: 32 } },
  [A.flowFinal]: { ...base, component: FlowFinalShape, defaultSize: { width: 30, height: 30 } },
  [A.action]: {
    ...base,
    component: ActionShape,
    defaultSize: { width: 140, height: 60 },
    defaultLabel: 'Nueva acción',
    hasLabel: true,
    resizable: true,
  },
  [A.decision]: { ...base, component: DiamondShape, defaultSize: { width: 44, height: 44 } },
  [A.merge]: { ...base, component: DiamondShape, defaultSize: { width: 44, height: 44 } },
  [A.fork]: { ...base, component: BarShape, defaultSize: { width: 140, height: 8 }, resizable: true },
  [A.join]: { ...base, component: BarShape, defaultSize: { width: 140, height: 8 }, resizable: true },
  [A.objectNode]: {
    ...base,
    component: ObjectNodeShape,
    defaultSize: { width: 130, height: 50 },
    defaultLabel: 'Objeto',
    hasLabel: true,
    resizable: true,
  },
  [A.sendSignal]: {
    ...base,
    component: SendSignalShape,
    defaultSize: { width: 160, height: 56 },
    defaultLabel: 'Enviar señal',
    hasLabel: true,
    resizable: true,
  },
  [A.acceptEvent]: {
    ...base,
    component: AcceptEventShape,
    defaultSize: { width: 160, height: 56 },
    defaultLabel: 'Evento recibido',
    hasLabel: true,
    resizable: true,
  },
  [A.partition]: {
    ...base,
    component: PartitionShape,
    defaultSize: { width: 280, height: 520 },
    defaultLabel: 'Responsable',
    defaultProps: { [containerCornerRadius.key]: containerCornerRadius.defaultValue },
    properties: [containerCornerRadius],
    hasLabel: true,
    resizable: true,
    isContainer: true,
    connectable: false,
  },
  [A.note]: {
    ...base,
    component: NoteShape,
    defaultSize: { width: 170, height: 80 },
    defaultLabel: 'Comentario',
    hasLabel: true,
    resizable: true,
  },
};

export const activityEdgeKinds: Record<string, EdgeKind> = {
  [A.controlFlow]: { dashed: false, arrow: true, hasGuard: true },
  [A.objectFlow]: { dashed: false, arrow: true, hasGuard: true },
  [A.annotationLink]: { dashed: true, arrow: false, hasGuard: false },
};
