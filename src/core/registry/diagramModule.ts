import type { ComponentType } from 'react';
import type {
  ArtifactDefinition,
  Diagram,
  DiagramNode,
  DiagramType,
  Narration,
  Template,
  ValidationRule,
} from '@/core/model';

/**
 * Props que recibe el componente visual de un artefacto.
 * Se definen aquí (y no con los tipos de React Flow) para que el núcleo
 * no dependa de la librería del lienzo; canvas/ hace la traducción.
 */
export interface ArtifactNodeProps {
  node: DiagramNode;
  selected: boolean;
}

/**
 * Contrato que cumple cada tipo de diagrama. Para soportar un tipo nuevo
 * se crea su carpeta en diagrams/ y se registra; el núcleo no cambia.
 */
export interface DiagramModule {
  diagramType: DiagramType;
  /** Nombre visible, p. ej. "Diagrama de actividades". */
  displayName: string;
  artifacts: ArtifactDefinition[];
  /** Componente visual por artifactType (solo artefactos que son nodos). */
  nodeComponents: Record<string, ComponentType<ArtifactNodeProps>>;
  rules: ValidationRule[];
  narrate: (diagram: Diagram) => Narration;
  templates: Template[];
}
