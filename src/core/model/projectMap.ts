import type { Diagram, DiagramType } from './diagram';
import { readLinkedDiagramId } from './diagramLink';
import type { DiagramProject } from './project';

/**
 * Mapa del proyecto: los diagramas como tarjetas ordenadas por fase y las
 * flechas que los unen. Las flechas no se guardan: se calculan de lo que ya
 * existe (subprocesos, vínculos entre elementos y relaciones entre diagramas),
 * así el mapa nunca queda desactualizado.
 */

/** Fases del proyecto, de izquierda a derecha: de qué hace el sistema a dónde corre. */
export const MAP_PHASES = [
  { id: 'scope', name: 'Alcance', question: '¿Qué ofrece el sistema y a quién?' },
  { id: 'process', name: 'Proceso', question: '¿Cómo ocurre cada función?' },
  { id: 'collaboration', name: 'Colaboración', question: '¿Quién habla con quién y cuándo?' },
  { id: 'domain', name: 'Dominio', question: '¿Qué conceptos y reglas tiene?' },
  { id: 'data', name: 'Datos', question: '¿Cómo se guardan los datos?' },
  { id: 'architecture', name: 'Arquitectura', question: '¿En qué piezas se organiza?' },
  { id: 'deployment', name: 'Despliegue', question: '¿Dónde se ejecuta?' },
] as const;

export type MapPhaseId = (typeof MAP_PHASES)[number]['id'];

/** Fase de cada tipo de diagrama. Única fuente: el mapa y su leyenda la leen de aquí. */
export const PHASE_OF: Record<DiagramType, MapPhaseId> = {
  usecase: 'scope',
  activity: 'process',
  interactionOverview: 'process',
  sequence: 'collaboration',
  communication: 'collaboration',
  timing: 'collaboration',
  class: 'domain',
  object: 'domain',
  state: 'domain',
  er: 'data',
  component: 'architecture',
  package: 'architecture',
  composite: 'architecture',
  profile: 'architecture',
  deployment: 'deployment',
};

export type MapEdgeKind = 'subprocess' | 'trace' | 'relation';

/** Una flecha del mapa entre dos diagramas, ya agrupada (p. ej. «detalla ×4»). */
export interface MapEdge {
  sourceId: string;
  targetId: string;
  kind: MapEdgeKind;
  label: string;
  count: number;
}

/**
 * Flechas entre los diagramas de `diagrams` (los demás se ignoran):
 * - subproceso: un paso de A invoca a B (A → B), una por par de diagramas;
 * - vínculos: los de elementos de A hacia elementos de B, agrupados por relación;
 * - relación: las relaciones entre diagramas completos.
 */
export function buildMapEdges(
  diagrams: readonly Diagram[],
  project: Pick<DiagramProject, 'traceLinks' | 'diagramRelations'>,
): MapEdge[] {
  const present = new Set(diagrams.map((diagram) => diagram.id));
  const grouped = new Map<string, MapEdge>();
  const add = (sourceId: string, targetId: string, kind: MapEdgeKind, label: string) => {
    if (sourceId === targetId || !present.has(sourceId) || !present.has(targetId)) return;
    const key = [sourceId, targetId, kind, label].join('|');
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else grouped.set(key, { sourceId, targetId, kind, label, count: 1 });
  };

  for (const diagram of diagrams) {
    for (const node of diagram.nodes) {
      const linked = readLinkedDiagramId(node);
      if (linked) add(diagram.id, linked, 'subprocess', 'subproceso');
    }
  }
  for (const link of project.traceLinks) add(link.source.diagramId, link.target.diagramId, 'trace', link.relation);
  for (const relation of project.diagramRelations) add(relation.sourceDiagramId, relation.targetDiagramId, 'relation', relation.relation);
  return [...grouped.values()];
}

/** Diagramas por fase, en el orden del proyecto. Todas las fases aparecen, aunque estén vacías. */
export function diagramsByPhase(diagrams: readonly Diagram[]): Map<MapPhaseId, Diagram[]> {
  const byPhase = new Map<MapPhaseId, Diagram[]>(MAP_PHASES.map((phase) => [phase.id, []]));
  for (const diagram of diagrams) byPhase.get(PHASE_OF[diagram.diagramType])!.push(diagram);
  return byPhase;
}
