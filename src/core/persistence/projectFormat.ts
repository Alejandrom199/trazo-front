import {
  PROJECT_FILE_FORMAT,
  PROJECT_SCHEMA_VERSION,
  type Diagram,
  type DiagramProject,
  type DiagramProjectFile,
} from '@/core/model';
import { parseDiagram } from './diagramFormat';

export type ProjectParseResult = { ok: true; project: DiagramProjectFile } | { ok: false; error: string };

export function projectToJson(project: DiagramProject, diagrams: Diagram[]): string {
  const file: DiagramProjectFile = {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: project.id,
    name: project.name,
    diagrams,
    traceLinks: project.traceLinks,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  return JSON.stringify(file, null, 2);
}

export function projectFromJson(text: string): ProjectParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (!isRecord(raw) || raw.format !== PROJECT_FILE_FORMAT) {
    return { ok: false, error: 'El archivo no es un proyecto de Trazo.' };
  }
  if (raw.schemaVersion !== 1 && raw.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return { ok: false, error: 'El proyecto usa una versión que esta versión de Trazo no puede abrir.' };
  }
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || !raw.name.trim()) {
    return { ok: false, error: 'El proyecto no tiene un nombre válido.' };
  }
  if (!Array.isArray(raw.diagrams) || raw.diagrams.length === 0) {
    return { ok: false, error: 'El proyecto no contiene diagramas.' };
  }
  const diagrams: Diagram[] = [];
  for (const candidate of raw.diagrams) {
    const parsed = parseDiagram(candidate);
    if (!parsed.ok) return { ok: false, error: `Uno de los diagramas es inválido: ${parsed.error}` };
    diagrams.push(parsed.diagram);
  }
  if (new Set(diagrams.map((diagram) => diagram.id)).size !== diagrams.length) {
    return { ok: false, error: 'El proyecto contiene diagramas con el mismo id.' };
  }
  const traceLinks = raw.schemaVersion === 1 ? [] : parseTraceLinks(raw.traceLinks, diagrams);
  if (typeof traceLinks === 'string') return { ok: false, error: traceLinks };
  return {
    ok: true,
    project: {
      format: PROJECT_FILE_FORMAT,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      id: raw.id,
      name: raw.name.trim(),
      diagrams,
      traceLinks,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
    },
  };
}

function parseTraceLinks(value: unknown, diagrams: Diagram[]): DiagramProjectFile['traceLinks'] | string {
  if (!Array.isArray(value)) return 'El proyecto no contiene una lista válida de vínculos.';
  const elements = new Map(diagrams.map((diagram) => [diagram.id, new Set([...diagram.nodes.map((node) => node.id), ...diagram.edges.map((edge) => edge.id)])]));
  const relations = new Set(['detalla', 'implementa', 'verifica', 'depende de', 'relacionado con']);
  const links: DiagramProjectFile['traceLinks'] = [];
  for (const link of value) {
    if (!isRecord(link) || typeof link.id !== 'string' || !isRecord(link.source) || !isRecord(link.target)
      || typeof link.source.diagramId !== 'string' || typeof link.source.elementId !== 'string'
      || typeof link.target.diagramId !== 'string' || typeof link.target.elementId !== 'string'
      || (link.source.kind !== 'node' && link.source.kind !== 'edge') || (link.target.kind !== 'node' && link.target.kind !== 'edge')
      || !relations.has(String(link.relation))) return 'El proyecto contiene un vínculo de trazabilidad inválido.';
    if (!elements.get(link.source.diagramId)?.has(link.source.elementId) || !elements.get(link.target.diagramId)?.has(link.target.elementId)) {
      return 'El proyecto contiene un vínculo hacia un elemento que no existe.';
    }
    links.push({
      id: link.id,
      source: { diagramId: link.source.diagramId, elementId: link.source.elementId, kind: link.source.kind },
      target: { diagramId: link.target.diagramId, elementId: link.target.elementId, kind: link.target.kind },
      relation: link.relation as DiagramProjectFile['traceLinks'][number]['relation'],
      createdAt: typeof link.createdAt === 'string' ? link.createdAt : new Date(0).toISOString(),
    });
  }
  return links;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
