import type { ArtifactDefinition, ConnectionResult, Diagram, DiagramEdge, DiagramNode } from '@/core/model';
import { activityArtifacts } from './artifacts';
import { ActivityArtifact as A } from './artifactTypes';

const definitionByType = new Map(activityArtifacts.map((artifact) => [artifact.type, artifact]));

/** Conexiones que son flujos (transportan tokens) y por tanto cuentan en connectionRules. */
const FLOW_TYPES: ReadonlySet<string> = new Set([A.controlFlow, A.objectFlow]);

function reject(reason: string): ConnectionResult {
  return { allowed: false, reason };
}

/**
 * Decide si se puede unir `sourceId` → `targetId` y con qué conexión.
 * Etapas: obtener nodos → reglas estructurales → elegir tipo → capacidad (connectionRules).
 */
export function resolveActivityConnection(diagram: Diagram, sourceId: string, targetId: string): ConnectionResult {
  const source = diagram.nodes.find((node) => node.id === sourceId);
  const target = diagram.nodes.find((node) => node.id === targetId);
  if (!source || !target) return reject('Uno de los extremos ya no existe.');

  if (source.id === target.id) {
    return reject('Un nodo no puede conectarse consigo mismo. Para repetir un paso usa una decisión y una fusión.');
  }
  if (source.artifactType === A.partition || target.artifactType === A.partition) {
    return reject('Los carriles no se conectan: conecta los nodos que están dentro de ellos.');
  }
  if (isAlreadyConnected(diagram.edges, source.id, target.id)) {
    return reject('Estos dos nodos ya están conectados.');
  }

  const edgeType = chooseEdgeType(source, target);
  if (!edgeType.allowed) return edgeType;
  if (!FLOW_TYPES.has(edgeType.edgeType)) return edgeType;

  return checkCapacity(diagram.edges, source, target) ?? edgeType;
}

function isAlreadyConnected(edges: DiagramEdge[], sourceId: string, targetId: string): boolean {
  return edges.some(
    (edge) =>
      (edge.sourceId === sourceId && edge.targetId === targetId) ||
      (edge.sourceId === targetId && edge.targetId === sourceId),
  );
}

/** El tipo de conexión se deduce de los extremos: el usuario no tiene que elegirlo. */
function chooseEdgeType(source: DiagramNode, target: DiagramNode): ConnectionResult {
  const isNote = (node: DiagramNode) => node.artifactType === A.note;
  const isObject = (node: DiagramNode) => node.artifactType === A.objectNode;

  if (isNote(source) && isNote(target)) return reject('Una nota se ancla a un elemento, no a otra nota.');
  if (isNote(source) || isNote(target)) return { allowed: true, edgeType: A.annotationLink };

  if (isObject(source) || isObject(target)) {
    if (source.artifactType === A.initialNode) {
      return reject('Del nodo inicial solo salen flujos de control, no de objeto.');
    }
    return { allowed: true, edgeType: A.objectFlow };
  }
  return { allowed: true, edgeType: A.controlFlow };
}

/** Aplica maxOut del origen y maxIn del destino. Devuelve null si hay capacidad. */
function checkCapacity(edges: DiagramEdge[], source: DiagramNode, target: DiagramNode): ConnectionResult | null {
  const sourceDefinition = definitionByType.get(source.artifactType);
  const targetDefinition = definitionByType.get(target.artifactType);
  if (!sourceDefinition || !targetDefinition) return reject('Artefacto desconocido.');

  const flows = edges.filter((edge) => FLOW_TYPES.has(edge.artifactType));
  const outgoing = flows.filter((edge) => edge.sourceId === source.id).length;
  const incoming = flows.filter((edge) => edge.targetId === target.id).length;

  const { maxOut } = sourceDefinition.connectionRules;
  if (maxOut !== null && outgoing >= maxOut) return reject(capacityMessage(sourceDefinition, 'salida', maxOut));

  const { maxIn } = targetDefinition.connectionRules;
  if (maxIn !== null && incoming >= maxIn) return reject(capacityMessage(targetDefinition, 'entrada', maxIn));

  return null;
}

function capacityMessage(definition: ArtifactDefinition, direction: 'entrada' | 'salida', max: number): string {
  if (max === 0) return `${definition.name}: no admite flujos de ${direction}.`;
  const plural = max === 1 ? `un solo flujo de ${direction}` : `como máximo ${max} flujos de ${direction}`;
  return `${definition.name}: admite ${plural}.`;
}
