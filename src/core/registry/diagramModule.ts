import type { ComponentType, ReactNode } from 'react';
import type {
  ArtifactDefinition,
  ConnectionResult,
  Diagram,
  DiagramNode,
  DiagramType,
  Narration,
  Size,
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
  /**
   * La etiqueta ya resuelta por el lienzo: texto, o un campo de edición si el
   * usuario está escribiendo. El componente solo decide DÓNDE ponerla.
   */
  label: ReactNode;
}

/**
 * Clase CSS de la zona por la que se agarra un contenedor (p. ej. el encabezado
 * de un carril). El resto del contenedor deja pasar el ratón, para poder hacer
 * clic en las flechas que lo cruzan y desplazar el lienzo desde dentro.
 */
export const CONTAINER_GRIP_CLASS = 'container-grip';

/** Cómo se comporta en el lienzo un artefacto que es nodo. */
export interface NodeKind {
  component: ComponentType<ArtifactNodeProps>;
  defaultSize: Size;
  defaultLabel: string;
  defaultProps: Record<string, unknown>;
  /** Si tiene texto editable con doble clic. */
  hasLabel: boolean;
  resizable: boolean;
  /** Si puede contener otros nodos (p. ej. un carril). */
  isContainer: boolean;
  /** Si muestra puntos de conexión. */
  connectable: boolean;
}

/** Cómo se dibuja un artefacto que es conexión. */
export interface EdgeKind {
  dashed: boolean;
  arrow: boolean;
  /** Si admite guarda ([condición]) editable con doble clic. */
  hasGuard: boolean;
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
  /** Comportamiento visual por artifactType (solo artefactos que son nodos). */
  nodeKinds: Record<string, NodeKind>;
  /** Comportamiento visual por artifactType (solo artefactos que son conexiones). */
  edgeKinds: Record<string, EdgeKind>;
  /** Decide si se pueden unir dos nodos y con qué tipo de conexión. Función pura. */
  resolveConnection: (diagram: Diagram, sourceId: string, targetId: string) => ConnectionResult;
  rules: ValidationRule[];
  narrate: (diagram: Diagram) => Narration;
  templates: Template[];
}
