import type { EdgeKind, NodeKind } from '@/core/registry';
import { ActivityArtifact as A } from './artifactTypes';
import { BarShape, DiamondShape, FlowFinalShape, ActivityFinalShape, InitialNodeShape } from './nodes/ControlNodes';
import { AcceptEventShape, ActionShape, ObjectNodeShape, SendSignalShape } from './nodes/ExecutableNodes';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { containerCornerRadius, PartitionShape } from './nodes/GroupingNodes';

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

/** Figuras redondas o simétricas: se redimensionan conservando su proporción. */
const round = { resizable: true, keepAspectRatio: true };

export const activityNodeKinds: Record<string, NodeKind> = {
  [A.initialNode]: { ...base, ...round, component: InitialNodeShape, defaultSize: { width: 30, height: 30 } },
  [A.activityFinal]: { ...base, ...round, component: ActivityFinalShape, defaultSize: { width: 32, height: 32 } },
  [A.flowFinal]: { ...base, ...round, component: FlowFinalShape, defaultSize: { width: 30, height: 30 } },
  [A.action]: {
    ...base,
    component: ActionShape,
    defaultSize: { width: 140, height: 60 },
    defaultLabel: 'Nueva acción',
    hasLabel: true,
    resizable: true,
  },
  // La decisión admite una pregunta, que se dibuja junto al rombo (no dentro, para que no crezca).
  [A.decision]: {
    ...base,
    ...round,
    component: DiamondShape,
    defaultSize: { width: 44, height: 44 },
    hasLabel: true,
    labelCaption: 'Pregunta',
  },
  [A.merge]: { ...base, ...round, component: DiamondShape, defaultSize: { width: 44, height: 44 } },
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
    secondaryDetail: true,
    component: NoteShape,
    defaultSize: { width: 170, height: 80 },
    defaultLabel: 'Comentario',
    hasLabel: true,
    resizable: true,
  },
};

export const activityEdgeKinds: Record<string, EdgeKind> = {
  [A.controlFlow]: { dashed: false, arrow: 'filled', text: 'guard' },
  [A.objectFlow]: { dashed: false, arrow: 'filled', text: 'guard' },
  [A.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
