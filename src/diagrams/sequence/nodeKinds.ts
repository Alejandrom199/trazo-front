import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { MESSAGE_TYPES, SequenceArtifact as S } from './artifactTypes';
import { ActivationShape, ActorShape, DestructionShape, FragmentShape, fragmentDivider, LifelineShape } from './nodes/SequenceShapes';

/** Valores comunes; cada artefacto declara solo lo que cambia. */
const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: false,
  resizable: false,
  isContainer: false,
  connectable: false,
  properties: [],
};

/**
 * Participante: contenedor de sus activaciones, que solo se desliza en horizontal
 * (todas las cabeceras en la misma fila) y no se pega a sus vecinos.
 */
const participant: Omit<NodeKind, 'component' | 'defaultLabel'> = {
  ...base,
  defaultSize: { width: 120, height: 460 },
  hasLabel: true,
  resizable: true,
  isContainer: true,
  connectable: true,
  dragAxis: 'x',
  magnetic: false,
};

/** Fragmento combinado: marco detrás de todo, que se agarra por su borde y su pestaña. */
const fragment: Omit<NodeKind, 'component'> = {
  ...base,
  defaultSize: { width: 340, height: 160 },
  previewSize: { width: 150, height: 100 },
  hasLabel: true,
  labelCaption: 'Guarda',
  resizable: true,
  gripOnly: true,
  layer: 'back',
};

const splitFragment: Omit<NodeKind, 'component'> = {
  ...fragment,
  defaultSize: { width: 340, height: 200 },
  defaultProps: { [fragmentDivider.key]: fragmentDivider.defaultValue },
  properties: [fragmentDivider],
};

export const sequenceNodeKinds: Record<string, NodeKind> = {
  [S.lifeline]: { ...participant, component: LifelineShape, defaultLabel: ':Objeto', previewSize: { width: 120, height: 150 } },
  [S.actor]: { ...participant, component: ActorShape, defaultLabel: 'Usuario', previewSize: { width: 90, height: 150 } },
  [S.activation]: {
    ...base,
    component: ActivationShape,
    defaultSize: { width: 14, height: 80 },
    resizable: true,
    centerInContainer: true,
  },
  [S.destruction]: { ...base, component: DestructionShape, defaultSize: { width: 22, height: 22 }, centerInContainer: true },
  [S.altFragment]: { ...splitFragment, component: FragmentShape, defaultLabel: 'condición' },
  [S.optFragment]: { ...fragment, component: FragmentShape, defaultLabel: 'condición' },
  [S.loopFragment]: { ...fragment, component: FragmentShape, defaultLabel: 'mientras…' },
  [S.parFragment]: { ...splitFragment, component: FragmentShape, labelCaption: 'Descripción (opcional)' },
  [S.note]: {
    ...base,
    secondaryDetail: true,
    component: NoteShape,
    defaultSize: { width: 170, height: 80 },
    defaultLabel: 'Comentario',
    hasLabel: true,
    resizable: true,
    connectable: true,
  },
};

/** Los mensajes pueden cambiar de tipo entre sí desde sus propiedades. */
const message = (arrow: EdgeKind['arrow'], dashed: boolean): EdgeKind => ({
  dashed,
  arrow,
  text: 'label',
  textCaption: 'Mensaje',
  layout: 'horizontal',
  switchableTo: [...MESSAGE_TYPES],
});

export const sequenceEdgeKinds: Record<string, EdgeKind> = {
  [S.syncMessage]: message('filled', false),
  [S.asyncMessage]: message('open', false),
  [S.replyMessage]: message('open', true),
  [S.createMessage]: message('open', true),
  [S.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
