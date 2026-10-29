import type { DiagramType } from './diagram';

export type ArtifactCategory =
  | 'nodo de control'
  | 'nodo ejecutable'
  | 'nodo de objeto'
  | 'conector'
  | 'agrupación'
  | 'anotación';

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
