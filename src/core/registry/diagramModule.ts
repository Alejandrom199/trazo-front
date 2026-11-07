import type { ComponentType, ReactNode } from 'react';
import type {
  ArtifactDefinition,
  ConnectionResult,
  ContainerJoints,
  Diagram,
  DiagramEdge,
  DiagramNode,
  DiagramType,
  Difficulty,
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
  /** Indica que la etiqueta contiene el editor activo en lugar de su vista de lectura. */
  editing?: boolean;
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
  /**
   * Se dibuja como miniatura (paleta, Aprender): sin textos internos, que a ese
   * tamaño no se leen; la figura usa símbolos en su lugar.
   */
  preview?: boolean;
}

/**
 * Clase CSS de la zona por la que se agarra un contenedor (p. ej. el encabezado
 * de un carril). El resto del contenedor deja pasar el ratón, para poder hacer
 * clic en las flechas que lo cruzan y desplazar el lienzo desde dentro.
 */
export const CONTAINER_GRIP_CLASS = 'container-grip';

/**
 * Propiedad configurable de un artefacto (se guarda en DiagramNode.props).
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

export interface TextPropertyDefinition {
  kind: 'text';
  key: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}

export interface SelectPropertyDefinition {
  kind: 'select';
  key: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  hint?: string;
}

export type PropertyDefinition = NumberPropertyDefinition | TextPropertyDefinition | SelectPropertyDefinition;

/** Lee una propiedad numérica de un nodo; si falta o es inválida (diagramas viejos), usa la de por defecto. */
export function readNumberProperty(node: DiagramNode, definition: NumberPropertyDefinition): number {
  const value = node.props[definition.key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return definition.defaultValue;
  return Math.min(definition.max, Math.max(definition.min, value));
}

/** Lee una propiedad de texto; si falta, usa el valor por defecto del módulo. */
export function readTextProperty(node: DiagramNode, definition: TextPropertyDefinition): string {
  const value = node.props[definition.key];
  return typeof value === 'string' ? value : (definition.defaultValue ?? '');
}

/** Lee una opción; si el valor guardado no está entre las opciones, usa el de por defecto. */
export function readSelectProperty(node: DiagramNode, definition: SelectPropertyDefinition): string {
  const value = node.props[definition.key];
  if (typeof value === 'string' && definition.options.some((option) => option.value === value)) return value;
  return definition.defaultValue;
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
  /**
   * 'x': solo se desliza en horizontal y comparte fila con los demás nodos que
   * también lo hacen (p. ej. los participantes de un diagrama de secuencia).
   */
  dragAxis?: 'x';
  /** Si se pega a los contenedores vecinos al acercarlo (imán). Por defecto, todo contenedor. */
  magnetic?: boolean;
  /**
   * Se agarra solo por las partes marcadas con CONTAINER_GRIP_CLASS; el resto deja
   * pasar el ratón (como un contenedor). Para marcos que encierran flechas.
   */
  gripOnly?: boolean;
  /** 'back': se dibuja detrás de todo lo demás (p. ej. un fragmento combinado). */
  layer?: 'back';
  /** Al soltarlo dentro de un contenedor, se centra en él horizontalmente. */
  centerInContainer?: boolean;
  /**
   * Tamaño con el que se dibuja fuera del lienzo (paleta, Aprender) si el de
   * por defecto es muy alargado y su miniatura no se reconocería.
   */
  previewSize?: Size;
  /** Detalle secundario (p. ej. una nota): la vista compacta del lienzo lo oculta al alejarse. */
  secondaryDetail?: boolean;
  /** Al redimensionarlo conserva su proporción (figuras redondas o simétricas, como un círculo o un rombo). */
  keepAspectRatio?: boolean;
  /** Contenedor que a su vez puede ir dentro de otro (p. ej. un entorno de ejecución dentro de un servidor). */
  nestable?: boolean;
  /**
   * Cuánto se mete la figura visible dentro de su caja, por lado, para que las
   * flechas lleguen a ella y no al aire (p. ej. la cara frontal de un cubo 3D).
   */
  edgeInsets?: { top?: number; right?: number; bottom?: number; left?: number };
}

/** Lee si un nodo se pega a sus vecinos (imán). */
export const isMagnetic = (kind: NodeKind): boolean => kind.magnetic ?? kind.isContainer;

/**
 * Punta de flecha: llena (triángulo relleno), abierta (dos trazos) o hueca
 * (triángulo vacío, el de la generalización y la realización en UML).
 */
export type ArrowHead = 'filled' | 'open' | 'hollow';

/**
 * Texto editable con doble clic sobre una conexión:
 *   guard: una guarda, que se dibuja entre corchetes ([condición]).
 *   label: un texto libre, como el nombre de un mensaje.
 */
export type EdgeTextKind = 'guard' | 'label';

/** Cómo se dibuja un artefacto que es conexión. */
export interface EdgeKind {
  dashed: boolean;
  /** Punta en el destino; null = sin punta. */
  arrow: ArrowHead | null;
  /** Rombo en el origen para agregación y composición. */
  sourceMarker?: 'diamond-open' | 'diamond-filled';
  /** Qué texto admite; null = ninguno. */
  text: EdgeTextKind | null;
  /** Cómo se llama ese texto en el panel de propiedades (por defecto "Guarda" o "Texto"). */
  textCaption?: string;
  /**
   * 'horizontal': va de lado a lado a una altura propia (ver core/model/horizontalEdge),
   * sin vértices, como un mensaje de secuencia. Por defecto, un recorrido libre.
   */
  layout?: 'horizontal';
  /** Otros tipos de conexión a los que el usuario puede cambiarla en sus propiedades. */
  switchableTo?: string[];
  /** Detalle secundario (p. ej. una nota): la vista compacta del lienzo lo oculta al alejarse. */
  secondaryDetail?: boolean;
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
  /** Qué hace que un ejemplo sea básico, intermedio o avanzado en este tipo concreto. */
  difficultyCriteria?: { name: Difficulty; description: string }[];
  /** Talleres opcionales que convierten la guía en práctica guiada. */
  workshop?: LearningWorkshop;
}

export interface LearningOption {
  id: string;
  label: string;
  explanation: string;
  correct: boolean;
}

export interface LearningQuestion {
  id: string;
  prompt: string;
  options: LearningOption[];
}

export interface CorrectionChallenge {
  id: string;
  title: string;
  context: string;
  diagram: Template;
  question: LearningQuestion;
  expectedProblems: number;
}

export interface BriefExercise {
  id: string;
  title: string;
  brief: string;
  questions: LearningQuestion[];
}

export interface ModelComparison {
  id: string;
  title: string;
  context: string;
  options: LearningOption[];
}

export interface LearningWorkshop {
  levels: { name: Difficulty; description: string }[];
  correctionChallenges: CorrectionChallenge[];
  briefExercises: BriefExercise[];
  comparisons: ModelComparison[];
}

/**
 * Contrato que cumple cada tipo de diagrama. Para soportar un tipo nuevo
 * se crea su carpeta en diagrams/ y se registra; el núcleo no cambia.
 */
export interface DiagramModule {
  diagramType: DiagramType;
  /** Nombre visible, p. ej. "Diagrama de actividades". */
  displayName: string;
  /**
   * Los módulos construidos sobre el editor genérico todavía no igualan la
   * madurez de Actividad, Secuencia o Clases. La interfaz lo dice en voz alta.
   */
  maturity?: 'preview';
  artifacts: ArtifactDefinition[];
  /** Comportamiento visual por artifactType (solo artefactos que son nodos). */
  nodeKinds: Record<string, NodeKind>;
  /** Comportamiento visual por artifactType (solo artefactos que son conexiones). */
  edgeKinds: Record<string, EdgeKind>;
  /** Decide si se pueden unir dos nodos y con qué tipo de conexión. Función pura. */
  resolveConnection: (diagram: Diagram, sourceId: string, targetId: string) => ConnectionResult;
  /**
   * Valores iniciales de una conexión recién creada por el usuario (p. ej. a qué
   * altura queda un mensaje). Si no se define, empieza sin texto ni propiedades.
   */
  initialEdge?: (diagram: Diagram, edgeType: string, sourceId: string, targetId: string) => Pick<DiagramEdge, 'label' | 'props'>;
  rules: ValidationRule[];
  narrate: (diagram: Diagram) => Narration;
  templates: Template[];
  /** Guía para la página Aprender. */
  guide: DiagramGuide;
}
