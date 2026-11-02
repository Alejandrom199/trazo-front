import { canvasViewRole, type Diagram, type ElementIds } from '@/core/model';
import type { CanvasViewMode } from './canvasViewStore';

export interface CanvasPresentation {
  dimmedNodeIds: ReadonlySet<string>;
  dimmedEdgeIds: ReadonlySet<string>;
}

const EMPTY: CanvasPresentation = { dimmedNodeIds: new Set(), dimmedEdgeIds: new Set() };

/** Calcula qué queda en segundo plano. Nunca elimina elementos del modelo ni del lienzo. */
export function canvasPresentation(diagram: Diagram, selection: ElementIds, mode: CanvasViewMode, focus: boolean): CanvasPresentation {
  if (mode === 'all' && (!focus || (selection.nodeIds.length === 0 && selection.edgeIds.length === 0))) return EMPTY;
  let activeNodes = new Set(diagram.nodes.map((node) => node.id));
  let activeEdges = new Set(diagram.edges.map((edge) => edge.id));

  if (mode !== 'all') {
    const taggedNodes = diagram.nodes.filter((node) => canvasViewRole(node.props) === mode).map((node) => node.id);
    const taggedEdges = diagram.edges.filter((edge) => canvasViewRole(edge.props) === mode).map((edge) => edge.id);
    const seeds = new Set([...taggedNodes, ...fallbackNodes(diagram, mode)]);
    activeEdges = new Set([...taggedEdges, ...fallbackEdges(diagram, mode)]);
    for (const edge of diagram.edges) if (activeEdges.has(edge.id)) { seeds.add(edge.sourceId); seeds.add(edge.targetId); }
    // Contenedores y conexiones internas conservan el contexto de los elementos activos.
    for (const node of diagram.nodes) if (node.parentId && seeds.has(node.id)) seeds.add(node.parentId);
    for (const edge of diagram.edges) if (seeds.has(edge.sourceId) && seeds.has(edge.targetId)) activeEdges.add(edge.id);
    activeNodes = seeds;
  }

  if (focus && (selection.nodeIds.length > 0 || selection.edgeIds.length > 0)) {
    const focusNodes = new Set(selection.nodeIds);
    const focusEdges = new Set(selection.edgeIds);
    for (const edge of diagram.edges) {
      if (focusEdges.has(edge.id) || focusNodes.has(edge.sourceId) || focusNodes.has(edge.targetId)) {
        focusEdges.add(edge.id); focusNodes.add(edge.sourceId); focusNodes.add(edge.targetId);
      }
    }
    for (const node of diagram.nodes) {
      if (node.parentId && focusNodes.has(node.id)) focusNodes.add(node.parentId);
      if (node.parentId && focusNodes.has(node.parentId)) focusNodes.add(node.id);
    }
    activeNodes = intersection(activeNodes, focusNodes);
    activeEdges = intersection(activeEdges, focusEdges);
  }

  return {
    dimmedNodeIds: new Set(diagram.nodes.filter((node) => !activeNodes.has(node.id)).map((node) => node.id)),
    dimmedEdgeIds: new Set(diagram.edges.filter((edge) => !activeEdges.has(edge.id)).map((edge) => edge.id)),
  };
}

function fallbackNodes(diagram: Diagram, mode: Exclude<CanvasViewMode, 'all'>): string[] {
  if (mode === 'primary') return diagram.nodes.filter((node) => canvasViewRole(node.props) !== 'alternative').map((node) => node.id);
  if (mode === 'alternative') return diagram.nodes.filter((node) => /decision|merge|alt|opt|loop|par/i.test(node.artifactType)).map((node) => node.id);
  return diagram.nodes.filter((node) => node.artifactType === 'actor' || /sistema|servicio|pasarela|proveedor|api|base de datos/i.test(node.label)).map((node) => node.id);
}

function fallbackEdges(diagram: Diagram, mode: Exclude<CanvasViewMode, 'all'>): string[] {
  if (mode === 'primary') return diagram.edges.filter((edge) => canvasViewRole(edge.props) !== 'alternative').map((edge) => edge.id);
  if (mode === 'alternative') return diagram.edges.filter((edge) => Boolean(edge.guard) || canvasViewRole(edge.props) === 'alternative').map((edge) => edge.id);
  return diagram.edges.filter((edge) => canvasViewRole(edge.props) === 'integration').map((edge) => edge.id);
}

function intersection<T>(a: Set<T>, b: Set<T>): Set<T> { return new Set([...a].filter((value) => b.has(value))); }
