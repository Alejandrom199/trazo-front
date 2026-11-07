import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { profileSemantics } from '@/diagrams/shared/simpleSemantics';

const P = { profile: 'profile', stereotype: 'stereotype', metaclass: 'metaclass', extension: 'extension', reference: 'profileReference' } as const;

const baseMetaclass: PropertyDefinition = {
  kind: 'text',
  key: 'baseMetaclass',
  label: 'Metaclase base',
  placeholder: 'p. ej. Component',
  hint: 'Elemento UML que este estereotipo puede marcar',
};
const taggedValue: PropertyDefinition = {
  kind: 'text',
  key: 'taggedValues',
  label: 'Valores etiquetados',
  placeholder: 'p. ej. path: String',
  hint: 'Propiedades que el estereotipo añade',
};

const templates: SimpleTemplateSpec[] = [
  {
    id: 'profile.rest-api', name: 'Perfil para API REST', description: 'Define «resource» y «endpoint» sobre componentes y operaciones.', difficulty: 'básico', learningGoals: [P.profile, P.stereotype, P.metaclass, P.extension],
    nodes: [
      { id: 'p1', type: P.profile, label: 'API REST', position: { x: 0, y: 0 }, size: { width: 520, height: 300 } },
      { id: 'p2', type: P.stereotype, label: 'resource', position: { x: 35, y: 90 }, parentId: 'p1' },
      { id: 'p3', type: P.stereotype, label: 'endpoint', position: { x: 290, y: 90 }, parentId: 'p1' },
      { id: 'p4', type: P.metaclass, label: 'Component', position: { x: 650, y: 40 } },
      { id: 'p5', type: P.metaclass, label: 'Operation', position: { x: 650, y: 210 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'p2', targetId: 'p4' },
      { id: 'e2', type: P.extension, sourceId: 'p3', targetId: 'p5' },
      { id: 'e3', type: P.reference, sourceId: 'p3', targetId: 'p2', label: 'pertenece a' },
    ],
  },
  {
    id: 'profile.persistence', name: 'Perfil de persistencia', description: 'Distingue entidades y repositorios sobre clases e interfaces.', difficulty: 'básico', learningGoals: [P.stereotype, P.extension],
    nodes: [
      { id: 'a1', type: P.profile, label: 'Persistencia', position: { x: 0, y: 0 }, size: { width: 480, height: 280 } },
      { id: 'a2', type: P.stereotype, label: 'entity', position: { x: 40, y: 90 }, parentId: 'a1' },
      { id: 'a3', type: P.stereotype, label: 'repository', position: { x: 260, y: 90 }, parentId: 'a1' },
      { id: 'a4', type: P.metaclass, label: 'Class', position: { x: 580, y: 40 } },
      { id: 'a5', type: P.metaclass, label: 'Interface', position: { x: 580, y: 200 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'a2', targetId: 'a4' },
      { id: 'e2', type: P.extension, sourceId: 'a3', targetId: 'a5' },
      { id: 'e3', type: P.reference, sourceId: 'a3', targetId: 'a2', label: 'gestiona' },
    ],
  },
  {
    id: 'profile.cloud', name: 'Perfil de nube', description: 'Extiende componentes y nodos con servicio gestionado y región.', difficulty: 'intermedio', learningGoals: [P.stereotype, P.metaclass],
    nodes: [
      { id: 'b1', type: P.profile, label: 'Cloud', position: { x: 20, y: 20 }, size: { width: 500, height: 300 } },
      { id: 'b2', type: P.stereotype, label: 'managedService', position: { x: 50, y: 100 }, parentId: 'b1' },
      { id: 'b3', type: P.stereotype, label: 'region', position: { x: 280, y: 100 }, parentId: 'b1' },
      { id: 'b4', type: P.metaclass, label: 'Component', position: { x: 620, y: 40 } },
      { id: 'b5', type: P.metaclass, label: 'Node', position: { x: 620, y: 220 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'b2', targetId: 'b4' },
      { id: 'e2', type: P.extension, sourceId: 'b3', targetId: 'b5' },
      { id: 'e3', type: P.reference, sourceId: 'b2', targetId: 'b3', label: 'se despliega en' },
    ],
  },
  {
    id: 'profile.security', name: 'Perfil de seguridad', description: 'Marca recursos protegidos y operaciones auditadas.', difficulty: 'intermedio', learningGoals: [P.stereotype, P.extension],
    nodes: [
      { id: 'c1', type: P.profile, label: 'Seguridad', position: { x: 0, y: 0 }, size: { width: 460, height: 260 } },
      { id: 'c2', type: P.stereotype, label: 'protected', position: { x: 40, y: 90 }, parentId: 'c1' },
      { id: 'c3', type: P.stereotype, label: 'audited', position: { x: 250, y: 90 }, parentId: 'c1' },
      { id: 'c4', type: P.metaclass, label: 'Class', position: { x: 560, y: 30 } },
      { id: 'c5', type: P.metaclass, label: 'Operation', position: { x: 560, y: 180 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'c2', targetId: 'c4' },
      { id: 'e2', type: P.extension, sourceId: 'c3', targetId: 'c5' },
      { id: 'e3', type: P.reference, sourceId: 'c3', targetId: 'c2', label: 'requiere' },
    ],
  },
  {
    id: 'profile.realtime', name: 'Perfil de tiempo real', description: 'Añade plazos y periodicidad a operaciones y señales.', difficulty: 'avanzado', learningGoals: [P.stereotype, P.metaclass],
    nodes: [
      { id: 'd1', type: P.profile, label: 'Tiempo real', position: { x: 0, y: 0 }, size: { width: 500, height: 280 } },
      { id: 'd2', type: P.stereotype, label: 'deadline', position: { x: 40, y: 100 }, parentId: 'd1' },
      { id: 'd3', type: P.stereotype, label: 'periodic', position: { x: 270, y: 100 }, parentId: 'd1' },
      { id: 'd4', type: P.metaclass, label: 'Operation', position: { x: 600, y: 40 } },
      { id: 'd5', type: P.metaclass, label: 'Signal', position: { x: 600, y: 200 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'd2', targetId: 'd4' },
      { id: 'e2', type: P.extension, sourceId: 'd3', targetId: 'd5' },
      { id: 'e3', type: P.reference, sourceId: 'd3', targetId: 'd2', label: 'coordina' },
    ],
  },
  {
    id: 'profile.medical', name: 'Perfil clínico', description: 'Normaliza registros clínicos y consentimientos sobre clases y casos de uso.', difficulty: 'avanzado', learningGoals: [P.profile, P.stereotype],
    nodes: [
      { id: 'e1n', type: P.profile, label: 'Salud', position: { x: 0, y: 0 }, size: { width: 520, height: 300 } },
      { id: 'e2n', type: P.stereotype, label: 'clinicalRecord', position: { x: 40, y: 100 }, parentId: 'e1n' },
      { id: 'e3n', type: P.stereotype, label: 'consentRequired', position: { x: 290, y: 100 }, parentId: 'e1n' },
      { id: 'e4n', type: P.metaclass, label: 'Class', position: { x: 620, y: 40 } },
      { id: 'e5n', type: P.metaclass, label: 'UseCase', position: { x: 620, y: 210 } },
    ],
    edges: [
      { id: 'e1', type: P.extension, sourceId: 'e2n', targetId: 'e4n' },
      { id: 'e2', type: P.extension, sourceId: 'e3n', targetId: 'e5n' },
      { id: 'e3', type: P.reference, sourceId: 'e3n', targetId: 'e2n', label: 'protege' },
    ],
  },
];

export const profileModule = createSimpleModule({
  diagramType: 'profile', displayName: 'Diagrama de perfiles', defaultEdge: P.extension, semantics: profileSemantics,
  nodes: [
    { type: P.profile, name: 'Perfil', umlName: 'Profile', category: 'agrupación', visual: 'profile', defaultLabel: 'Perfil', size: { width: 360, height: 230 }, notation: 'Paquete rotulado «profile».', whatIs: 'Un paquete que reúne extensiones UML para un dominio.', whatFor: 'Definir un vocabulario de modelado propio sin cambiar UML.', example: 'Perfil API REST', container: true, labelCaption: 'Nombre del perfil' },
    { type: P.stereotype, name: 'Estereotipo', umlName: 'Stereotype', category: 'clasificador', visual: 'stereotype', defaultLabel: 'Estereotipo', size: { width: 170, height: 70 }, notation: 'Clase rotulada «stereotype».', whatIs: 'Una especialización que añade significado y propiedades.', whatFor: 'Marcar elementos UML con conceptos del dominio.', example: '«endpoint»', labelCaption: 'Estereotipo', properties: [baseMetaclass, taggedValue] },
    { type: P.metaclass, name: 'Metaclase', umlName: 'Metaclass', category: 'clasificador', visual: 'box', defaultLabel: 'Metaclase', size: { width: 170, height: 70 }, notation: 'Clase del metamodelo UML.', whatIs: 'El tipo UML que puede recibir un estereotipo.', whatFor: 'Indicar qué elementos UML extiende el perfil.', example: 'Component', labelCaption: 'Metaclase UML' },
  ],
  edges: [
    { type: P.extension, name: 'Extensión', umlName: 'Extension', notation: 'Flecha de extensión desde el estereotipo a la metaclase.', whatIs: 'Relaciona un estereotipo con la metaclase que amplía.', whatFor: 'Restringir dónde puede aplicarse el estereotipo.', example: '«service» extiende Component', dashed: true, arrow: 'hollow' },
    { type: P.reference, name: 'Referencia', umlName: 'Dependency', notation: 'Dependencia discontinua.', whatIs: 'Relaciona elementos del perfil.', whatFor: 'Mostrar dependencias entre conceptos del perfil.', example: '«endpoint» depende de «service»', dashed: true, textCaption: 'Relación' },
  ],
  guide: {
    summary: 'Un perfil adapta UML a un dominio mediante estereotipos, valores etiquetados y restricciones.',
    purposes: ['Crear un vocabulario UML para una organización o tecnología.', 'Definir dónde puede aplicarse cada estereotipo.'],
    whenToUse: ['Cuando UML necesita conceptos de un dominio concreto.', 'Para normalizar modelos entre equipos.'],
    whenNotToUse: ['Para reemplazar clases normales del dominio.', 'Si una simple nota comunica lo mismo.'],
    keyIdea: { title: 'Extender sin modificar UML', text: 'Un estereotipo añade significado a una metaclase existente; no inventa un UML incompatible.' },
    howToRead: [
      { title: 'Ubica el perfil', text: 'El paquete «profile» contiene el vocabulario.', artifactTypes: [P.profile] },
      { title: 'Lee los estereotipos', text: 'Cada estereotipo nombra una extensión del dominio.', artifactTypes: [P.stereotype] },
      { title: 'Sigue las extensiones', text: 'La flecha indica sobre qué metaclase puede aplicarse.', artifactTypes: [P.extension, P.metaclass] },
    ],
  },
  templates,
});
