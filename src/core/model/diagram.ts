/**
 * Modelo genérico de un diagrama. No sabe nada de React ni de React Flow:
 * es la "entidad" que se guarda, se valida y se narra.
 */

/** Tipos de diagrama conocidos. Hoy solo se implementa "activity". */
export type DiagramType = 'activity' | 'sequence' | 'usecase' | 'class';

/**
 * Versión actual del formato guardado. Súbela cuando cambie la forma de Diagram
 * y agrega la migración correspondiente en core/persistence/diagramFormat.ts.
 * v2: los nodos tienen `locked`.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DiagramNode {
  id: string;
  /** Clave del catálogo del módulo, p. ej. "action" o "decision". */
  artifactType: string;
  label: string;
  /**
   * Esquina superior izquierda. Si el nodo está dentro de un contenedor (parentId),
   * es relativa a ese contenedor; si no, es absoluta en el lienzo.
   */
  position: Position;
  size: Size;
  /** Partición (carril) que lo contiene, o null si está suelto en el lienzo. */
  parentId: string | null;
  /** Propiedades específicas del artefacto (p. ej. orientación de un carril). */
  props: Record<string, unknown>;
  /** Comentario libre del usuario. */
  notes: string;
  /** Bloqueado: no se puede mover, redimensionar ni borrar desde el lienzo. */
  locked: boolean;
}

export interface DiagramEdge {
  id: string;
  /**
   * Clave del catálogo del módulo (p. ej. "controlFlow", "objectFlow").
   * Es string y no una unión cerrada para que cada tipo de diagrama
   * defina sus propias conexiones sin modificar el núcleo.
   */
  artifactType: string;
  sourceId: string;
  targetId: string;
  /** Texto de la guarda SIN corchetes ("usuario válido"); la UI dibuja los [ ]. */
  guard: string | null;
  label: string;
}

export interface Diagram {
  id: string;
  name: string;
  diagramType: DiagramType;
  description: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Plantilla de origen, si el diagrama se creó desde una. */
  templateId: string | null;
  schemaVersion: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}
