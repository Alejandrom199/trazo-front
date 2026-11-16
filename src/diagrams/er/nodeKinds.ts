import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { ErArtifact as E } from './artifactTypes';
import {
  AttributeShape,
  DerivedAttributeShape,
  EntityShape,
  IdentifyingRelationshipShape,
  KeyAttributeShape,
  MultivaluedAttributeShape,
  RelationshipShape,
  WeakEntityShape,
} from './nodes/ErShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: true,
  resizable: true,
  isContainer: false,
  connectable: true,
  properties: [],
};

const entity = { ...base, defaultSize: { width: 150, height: 60 }, defaultLabel: 'Entidad' };
const relationship = { ...base, defaultSize: { width: 130, height: 76 }, defaultLabel: 'relación' };
const attribute = { ...base, defaultSize: { width: 120, height: 46 }, defaultLabel: 'atributo' };

export const erNodeKinds: Record<string, NodeKind> = {
  [E.entity]: { ...entity, component: EntityShape },
  [E.weakEntity]: { ...entity, component: WeakEntityShape, defaultLabel: 'Entidad débil' },
  [E.relationship]: { ...relationship, component: RelationshipShape },
  [E.identifyingRelationship]: { ...relationship, component: IdentifyingRelationshipShape, defaultLabel: 'identifica' },
  [E.attribute]: { ...attribute, component: AttributeShape },
  [E.keyAttribute]: { ...attribute, component: KeyAttributeShape, defaultLabel: 'id' },
  [E.multivaluedAttribute]: { ...attribute, component: MultivaluedAttributeShape, defaultLabel: 'teléfonos' },
  [E.derivedAttribute]: { ...attribute, component: DerivedAttributeShape, defaultLabel: 'edad' },
  [E.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', secondaryDetail: true },
};

export const erEdgeKinds: Record<string, EdgeKind> = {
  // Una línea simple: el atributo pertenece a su entidad o relación.
  [E.attributeLink]: { dashed: false, arrow: null, text: null, defaultRouting: 'straight' },
  // Entidad — relación, con la cardinalidad (mín,máx) del lado de la entidad.
  [E.participation]: { dashed: false, arrow: null, text: 'label', textCaption: 'Cardinalidad (mín,máx)', defaultRouting: 'straight' },
  [E.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true, defaultRouting: 'straight' },
};
