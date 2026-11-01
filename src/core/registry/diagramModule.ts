import type { ComponentType, ReactNode } from 'react';
import type {
  ArtifactDefinition,
  ConnectionResult,
  ContainerJoints,
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
  /**
   * Cómo toca a otros contenedores (solo contenedores en el lienzo). Permite,
   * p. ej., dibujar rectas las esquinas donde dos carriles se unen.
   */
  joints?: ContainerJoints;
}

/**
 * Clase CSS de la zona por la que se agarra un contenedor (p. ej. el encabezado
 * de un carril). El resto del contenedor deja pasar el ratón, para poder hacer
 * clic en las flechas que lo cruzan y desplazar el lienzo desde dentro.
 */
export const CONTAINER_GRIP_CLASS = 'container-grip';

/**
 * Propiedad visual configurable de un artefacto (se guarda en DiagramNode.props).
 * El módulo la declara y el panel de propiedades la muestra sin saber qué es:
 * así cada tipo de diagrama agrega las suyas sin tocar la interfaz.
 */
export interface NumberPropertyDefinition {
  kind: 'number';
  key: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
}

export type PropertyDefinition = NumberPropertyDefinition;

/** Lee una propiedad numérica de un nodo; si falta o es inválida (diagramas viejos), usa la de por defecto. */
export function readNumberProperty(node: DiagramNode, definition: NumberPropertyDefinition): number {
  const value = node.props[definition.key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return definition.defaultValue;
  return Math.min(definition.max, Math.max(definition.min, value));
}

/** Cómo se comporta en el lienzo un artefacto que es nodo. */
export interface NodeKind {
  component: ComponentType<ArtifactNodeProps>;
  defaultSize: Size;
  defaultLabel: string;
  defaultProps: Record<string, unknown>;
  /** Si tiene texto editable con doble clic. */
  hasLabel: boolean;
  /** Cómo se llama ese texto en el panel de propiedades (por defecto "Nombre"). */
  labelCaption?: string;
  resizable: boolean;
  /** Si puede contener otros nodos (p. ej. un carril). */
  isContainer: boolean;
  /** Si muestra puntos de conexión. */
  connectable: boolean;
  /** Propiedades visuales que el usuario puede ajustar en el panel de propiedades. */
  properties: PropertyDefinition[];
}

/** Cómo se dibuja un artefacto que es conexión. */
export interface EdgeKind {
  dashed: boolean;
  arrow: boolean;
  /** Si admite guarda ([condición]) editable con doble clic. */
  hasGuard: boolean;
}

/** Un paso de "cómo leer este diagrama", con los artefactos que intervienen. */
export interface GuideStep {
  title: string;
  text: string;
  artifactTypes: string[];
}

/** Contenido introductorio de la página Aprender de un tipo de diagrama. */
export interface DiagramGuide {
  /** Una o dos frases: qué es este diagrama. */
  summary: string;
  purposes: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  /** La idea que, una vez entendida, hace que todo lo demás encaje. */
  keyIdea: { title: string; text: string };
  howToRead: GuideStep[];
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
  /** Guía para la página Aprender. */
  guide: DiagramGuide;
}
