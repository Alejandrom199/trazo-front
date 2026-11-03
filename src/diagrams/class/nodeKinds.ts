import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { ClassArtifact as C, CLASS_RELATION_TYPES } from './artifactTypes';
import { AbstractClassShape, ClassShape, EnumerationShape, InterfaceShape, PackageShape } from './nodes/ClassShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = { defaultLabel: '', defaultProps: {}, hasLabel: true, labelCaption: 'Nombre, atributos y operaciones', resizable: true, isContainer: false, connectable: true, properties: [] };
const classifier = { ...base, defaultSize: { width: 210, height: 150 } };

export const classNodeKinds: Record<string, NodeKind> = {
  [C.class]: { ...classifier, component: ClassShape, defaultLabel: 'Clase\n--\n+ atributo: Tipo\n--\n+ operación(): Tipo' },
  [C.abstractClass]: { ...classifier, component: AbstractClassShape, defaultLabel: 'ClaseAbstracta\n--\n# atributo: Tipo\n--\n+ operaciónAbstracta()' },
  [C.interface]: { ...classifier, component: InterfaceShape, defaultLabel: 'Interfaz\n--\n\n--\n+ operación()' },
  [C.enumeration]: { ...classifier, component: EnumerationShape, defaultLabel: 'Estado\n--\nACTIVO\nINACTIVO\n--\n' },
  [C.package]: { ...base, component: PackageShape, defaultSize: { width: 520, height: 360 }, previewSize: { width: 150, height: 100 }, defaultLabel: 'Paquete', labelCaption: 'Nombre', isContainer: true, connectable: false, magnetic: false, layer: 'back' },
  [C.note]: { ...base, component: NoteShape, defaultSize: { width: 180, height: 90 }, defaultLabel: 'Comentario', labelCaption: 'Texto', secondaryDetail: true },
};

const switchableTo = [...CLASS_RELATION_TYPES];
export const classEdgeKinds: Record<string, EdgeKind> = {
  [C.association]: { dashed: false, arrow: null, text: 'label', textCaption: 'Nombre y multiplicidad', switchableTo },
  [C.aggregation]: { dashed: false, arrow: null, sourceMarker: 'diamond-open', text: 'label', textCaption: 'Nombre y multiplicidad', switchableTo },
  [C.composition]: { dashed: false, arrow: null, sourceMarker: 'diamond-filled', text: 'label', textCaption: 'Nombre y multiplicidad', switchableTo },
  [C.generalization]: { dashed: false, arrow: 'open', text: null, switchableTo },
  [C.realization]: { dashed: true, arrow: 'open', text: null, switchableTo },
  [C.dependency]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Uso', switchableTo },
  [C.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
