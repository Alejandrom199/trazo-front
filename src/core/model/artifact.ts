import type { DiagramType } from './diagram';

export type ArtifactCategory =
  | 'nodo de control'
  | 'nodo ejecutable'
  | 'nodo de objeto'
  | 'conector'
  | 'agrupación'
  | 'anotación'
  | 'participante'
  | 'ocurrencia'
  | 'fragmento combinado'
  | 'mensaje'
  | 'caso de uso'
  | 'clasificador'
  | 'componente'
  | 'interfaz';

/**
 * Orden y nombres de las categorías: la paleta, el menú del lienzo y la página
 * Aprender agrupan los artefactos con esta misma lista.
 */
export const ARTIFACT_CATEGORIES: readonly { category: ArtifactCategory; title: string; shortTitle: string }[] = [
  { category: 'participante', title: 'Participantes', shortTitle: 'Participantes' },
  { category: 'ocurrencia', title: 'Activación y destrucción', shortTitle: 'Ocurrencias' },
  { category: 'fragmento combinado', title: 'Fragmentos combinados', shortTitle: 'Fragmentos' },
  { category: 'mensaje', title: 'Mensajes', shortTitle: 'Mensajes' },
  { category: 'caso de uso', title: 'Casos de uso', shortTitle: 'Casos de uso' },
  { category: 'clasificador', title: 'Clasificadores', shortTitle: 'Clasificadores' },
  { category: 'componente', title: 'Componentes', shortTitle: 'Componentes' },
  { category: 'interfaz', title: 'Interfaces', shortTitle: 'Interfaces' },
  { category: 'nodo de control', title: 'Nodos de control', shortTitle: 'Control' },
  { category: 'nodo ejecutable', title: 'Acciones', shortTitle: 'Acciones' },
  { category: 'nodo de objeto', title: 'Objetos', shortTitle: 'Objetos' },
  { category: 'conector', title: 'Conexiones', shortTitle: 'Conexiones' },
  { category: 'agrupación', title: 'Agrupación', shortTitle: 'Agrupación' },
  { category: 'anotación', title: 'Anotaciones', shortTitle: 'Anotación' },
];

/**
 * Cuántas conexiones de control/objeto admite un artefacto.
 * null en un máximo significa "sin límite".
 */
export interface ConnectionRules {
  minIn: number;
  maxIn: number | null;
  minOut: number;
  maxOut: number | null;
}

/** El "conocimiento" de un artefacto: cómo se dibuja, qué es, cuándo usarlo. */
export interface ArtifactDefinition {
  /** Clave única dentro del módulo; coincide con DiagramNode/DiagramEdge.artifactType. */
  type: string;
  diagramType: DiagramType;
  category: ArtifactCategory;
  /** Nombre en español, p. ej. "Nodo de decisión". */
  name: string;
  /** Nombre oficial UML en inglés, p. ej. "DecisionNode". */
  umlName: string;
  notation: string;
  whatIs: string;
  whatFor: string;
  whyExists: string;
  whenToUse: string[];
  whenNotToUse: string[];
  rules: string[];
  commonMistakes: string[];
  example: string;
  /** Claves (type) de artefactos relacionados del mismo módulo. */
  relatedArtifacts: string[];
  connectionRules: ConnectionRules;
}
