import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { ComponentArtifact as C } from './artifactTypes';
import { ComponentShape, ProvidedInterfaceShape, RequiredInterfaceShape, SubsystemShape } from './nodes/ComponentShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: true,
  resizable: true,
  isContainer: false,
  connectable: true,
  properties: [],
};

/** Las interfaces son solo su símbolo (28 px): el nombre se dibuja debajo, fuera del nodo. */
const interfaceKind = { ...base, defaultSize: { width: 28, height: 28 }, resizable: false, labelCaption: 'Nombre del contrato' };

export const componentNodeKinds: Record<string, NodeKind> = {
  [C.component]: { ...base, component: ComponentShape, defaultSize: { width: 180, height: 90 }, defaultLabel: 'Componente', previewSize: { width: 90, height: 56 } },
  [C.providedInterface]: { ...interfaceKind, component: ProvidedInterfaceShape, defaultLabel: 'IServicio' },
  [C.requiredInterface]: { ...interfaceKind, component: RequiredInterfaceShape, defaultLabel: 'IServicio' },
  [C.subsystem]: {
    ...base,
    component: SubsystemShape,
    defaultSize: { width: 480, height: 280 },
    previewSize: { width: 150, height: 100 },
    defaultLabel: 'Subsistema',
    isContainer: true,
    connectable: false,
    magnetic: false,
    layer: 'back',
  },
  [C.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', secondaryDetail: true },
};

export const componentEdgeKinds: Record<string, EdgeKind> = {
  [C.provision]: { dashed: false, arrow: null, text: null },
  [C.requirement]: { dashed: false, arrow: null, text: null },
  [C.assembly]: { dashed: false, arrow: null, text: null },
  [C.dependency]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Uso' },
  [C.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
