import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { DEPENDENCY_TYPES, PackageArtifact as P } from './artifactTypes';
import { ElementShape, PackageShape } from './nodes/PackageShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: true,
  resizable: true,
  isContainer: false,
  connectable: true,
  properties: [],
};

export const packageNodeKinds: Record<string, NodeKind> = {
  [P.package]: {
    ...base,
    component: PackageShape,
    defaultSize: { width: 320, height: 200 },
    previewSize: { width: 120, height: 84 },
    defaultLabel: 'Paquete',
    labelCaption: 'Nombre',
    isContainer: true,
    // Los paquetes se separan y se unen con dependencias: no se pegan a sus vecinos.
    magnetic: false,
    nestable: true,
  },
  [P.element]: { ...base, component: ElementShape, defaultSize: { width: 140, height: 50 }, defaultLabel: 'Clase' },
  [P.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', secondaryDetail: true },
};

const switchableTo = [...DEPENDENCY_TYPES];

export const packageEdgeKinds: Record<string, EdgeKind> = {
  [P.dependency]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Uso', switchableTo },
  [P.packageImport]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Estereotipo', switchableTo },
  [P.packageAccess]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Estereotipo', switchableTo },
  [P.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
