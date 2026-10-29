import { CURRENT_SCHEMA_VERSION, type Diagram, type DiagramEdge, type DiagramNode } from '@/core/model';

/**
 * Lectura segura de diagramas que vienen de fuera del programa (localStorage o
 * un archivo importado). Nada de eso es de fiar: puede estar corrupto, ser de
 * otra app o de una versión vieja. Etapas: migrar a la versión actual → validar
 * la forma → devolver un Diagram, o un error que se le pueda mostrar al usuario.
 */

export type ParseResult = { ok: true; diagram: Diagram } | { ok: false; error: string };

/**
 * Migraciones por versión: la función de la clave N convierte un diagrama de la
 * versión N a la N+1. Cuando cambie la forma de Diagram se sube
 * CURRENT_SCHEMA_VERSION y se agrega aquí el paso correspondiente.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 → v2: aparece el bloqueo de nodos; todo lo guardado antes queda desbloqueado.
  1: (raw) => ({
    ...raw,
    nodes: Array.isArray(raw.nodes)
      ? raw.nodes.map((node: unknown) => (isRecord(node) ? { ...node, locked: false } : node))
      : raw.nodes,
  }),
};

export function parseDiagram(raw: unknown): ParseResult {
  if (!isRecord(raw)) return fail('El archivo no contiene un diagrama.');

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('El archivo no indica una versión de formato válida.');
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return fail('El diagrama se guardó con una versión más nueva de Trazo. Actualiza la aplicación para abrirlo.');
  }

  const migrated = migrate(raw, version);
  if (!migrated) return fail(`No hay migración disponible desde la versión ${version}.`);
  return validateShape(migrated);
}

function migrate(raw: Record<string, unknown>, fromVersion: number): Record<string, unknown> | null {
  let current = raw;
  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version += 1) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = { ...step(current), schemaVersion: version + 1 };
  }
  return current;
}

function validateShape(raw: Record<string, unknown>): ParseResult {
  const requiredText = ['id', 'name', 'diagramType', 'description', 'createdAt', 'updatedAt'] as const;
  for (const field of requiredText) {
    if (typeof raw[field] !== 'string') return fail(`Falta el campo "${field}" o no es texto.`);
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return fail('El diagrama no tiene listas de nodos y conexiones.');

  const nodes = raw.nodes.map(toNode);
  if (nodes.some((node) => node === null)) return fail('Hay nodos con un formato inválido.');
  const edges = raw.edges.map(toEdge);
  if (edges.some((edge) => edge === null)) return fail('Hay conexiones con un formato inválido.');

  const validNodes = nodes as DiagramNode[];
  const validEdges = edges as DiagramEdge[];
  const nodeIds = new Set(validNodes.map((node) => node.id));
  if (nodeIds.size !== validNodes.length) return fail('Hay nodos con el mismo id.');
  if (validNodes.some((node) => node.parentId !== null && !nodeIds.has(node.parentId))) {
    return fail('Un nodo dice estar dentro de un contenedor que no existe.');
  }
  if (validEdges.some((edge) => !nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId))) {
    return fail('Una conexión apunta a un nodo que no existe.');
  }

  return {
    ok: true,
    diagram: {
      id: raw.id as string,
      name: raw.name as string,
      diagramType: raw.diagramType as Diagram['diagramType'],
      description: raw.description as string,
      nodes: validNodes,
      edges: validEdges,
      templateId: typeof raw.templateId === 'string' ? raw.templateId : null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
    },
  };
}

function toNode(raw: unknown): DiagramNode | null {
  if (!isRecord(raw) || !isRecord(raw.position) || !isRecord(raw.size)) return null;
  const { id, artifactType, label, notes, parentId, props, locked } = raw;
  const { x, y } = raw.position;
  const { width, height } = raw.size;
  if (typeof id !== 'string' || typeof artifactType !== 'string' || typeof label !== 'string') return null;
  if (![x, y, width, height].every(isFiniteNumber)) return null;
  if (parentId !== null && typeof parentId !== 'string') return null;
  return {
    id,
    artifactType,
    label,
    position: { x: x as number, y: y as number },
    size: { width: width as number, height: height as number },
    parentId,
    props: isRecord(props) ? props : {},
    notes: typeof notes === 'string' ? notes : '',
    locked: locked === true,
  };
}

function toEdge(raw: unknown): DiagramEdge | null {
  if (!isRecord(raw)) return null;
  const { id, artifactType, sourceId, targetId, guard, label } = raw;
  if (![id, artifactType, sourceId, targetId].every((value) => typeof value === 'string')) return null;
  if (guard !== null && typeof guard !== 'string') return null;
  return {
    id: id as string,
    artifactType: artifactType as string,
    sourceId: sourceId as string,
    targetId: targetId as string,
    guard,
    label: typeof label === 'string' ? label : '',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}
