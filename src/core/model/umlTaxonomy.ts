import type { DiagramType } from './diagram';

/**
 * Los 14 diagramas de UML 2.5 y su clasificación oficial: 7 de estructura y 7 de
 * comportamiento, de los cuales 4 son de interacción. Única fuente de esta
 * clasificación: Aprender y «Nuevo diagrama» agrupan con ella. Los que ya tienen
 * módulo en Trazo llevan su `diagramType`.
 */

export type UmlFamily = 'structure' | 'behavior';

export interface UmlDiagramKind {
  name: string;
  family: UmlFamily;
  /** Subfamilia de comportamiento: quién se comunica con quién y cuándo. */
  interaction: boolean;
  summary: string;
  diagramType?: DiagramType;
}

export const UML_FAMILIES: Record<UmlFamily, { name: string; question: string }> = {
  structure: { name: 'Diagramas de estructura', question: '¿De qué está hecho el sistema? Lo estático: piezas y relaciones.' },
  behavior: { name: 'Diagramas de comportamiento', question: '¿Qué hace el sistema y cómo cambia? Lo dinámico: flujos, estados y mensajes.' },
};

/** Nombre de la subfamilia de interacción (dentro de comportamiento). */
export const UML_INTERACTION_NAME = 'Diagramas de interacción';

const structure = (name: string, summary: string, diagramType?: DiagramType): UmlDiagramKind => ({ name, family: 'structure', interaction: false, summary, diagramType });
const behavior = (name: string, summary: string, diagramType?: DiagramType): UmlDiagramKind => ({ name, family: 'behavior', interaction: false, summary, diagramType });
const interaction = (name: string, summary: string, diagramType?: DiagramType): UmlDiagramKind => ({ name, family: 'behavior', interaction: true, summary, diagramType });

/** En el orden en que se presentan: estructura, comportamiento y, dentro de este, interacción. */
export const UML_DIAGRAMS: UmlDiagramKind[] = [
  structure('Clases', 'Clases, atributos, operaciones y sus relaciones.', 'class'),
  structure('Componentes', 'Piezas del software y las interfaces por las que se conectan.', 'component'),
  structure('Despliegue', 'En qué máquinas se instala cada artefacto y cómo se comunican.', 'deployment'),
  structure('Objetos', 'Una foto de instancias concretas en un momento dado.'),
  structure('Paquetes', 'Cómo se organiza el modelo en grupos y sus dependencias.'),
  structure('Estructura compuesta', 'Las partes internas de una clase o componente y cómo colaboran.'),
  structure('Perfiles', 'Extensiones de UML con estereotipos propios de un dominio.'),
  behavior('Casos de uso', 'Qué puede hacer cada actor con el sistema.', 'usecase'),
  behavior('Actividades', 'El flujo de un proceso: pasos, decisiones y trabajo en paralelo.', 'activity'),
  behavior('Máquina de estados', 'Los estados por los que pasa algo y qué lo hace cambiar.'),
  interaction('Secuencia', 'Los mensajes entre participantes, en orden temporal.', 'sequence'),
  interaction('Comunicación', 'Los mismos mensajes, vistos como una red de enlaces numerados.'),
  interaction('Descripción general de la interacción', 'Un flujo de actividades cuyos pasos son interacciones.'),
  interaction('Tiempos', 'Cómo cambian los estados a lo largo de un eje de tiempo exacto.'),
];

export function umlKindOf(diagramType: DiagramType): UmlDiagramKind | undefined {
  return UML_DIAGRAMS.find((kind) => kind.diagramType === diagramType);
}

/** Agrupa elementos por familia UML (estructura, comportamiento) en el orden de la clasificación. */
export function groupByUmlFamily<T>(items: T[], typeOf: (item: T) => DiagramType): { family: UmlFamily; items: T[] }[] {
  const position = (item: T) => UML_DIAGRAMS.findIndex((kind) => kind.diagramType === typeOf(item));
  const sorted = [...items].sort((a, b) => position(a) - position(b));
  return (Object.keys(UML_FAMILIES) as UmlFamily[])
    .map((family) => ({ family, items: sorted.filter((item) => umlKindOf(typeOf(item))?.family === family) }))
    .filter((group) => group.items.length > 0);
}
