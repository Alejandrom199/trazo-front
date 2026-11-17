import { nodeName, type Diagram, type DiagramNode } from '@/core/model';
import { UseCaseArtifact as U } from './artifactTypes';

/**
 * Ficha de un caso de uso (especificación textual), con los campos de una
 * ficha académica clásica: código, propósito, tipo, resumen, precondiciones,
 * postcondiciones, curso típico y curso alterno de eventos.
 *
 * Lo que el diagrama ya dice no se escribe dos veces: los actores, lo que el
 * caso «incluye» y lo que lo «extiende» se leen del dibujo. Las referencias a
 * requisitos son los vínculos de requisitos del proyecto. La ficha vive en el
 * propio nodo (props), así viaja con el diagrama.
 */

export const USE_CASE_SPEC_KEY = 'useCaseSpec';

/** Primario: la razón de ser del sistema. Secundario: de apoyo. Opcional: puede no hacerse. */
export const USE_CASE_IMPORTANCE = ['primario', 'secundario', 'opcional'] as const;
/** Esencial: qué se hace, sin tecnología. Real: cómo, con pantallas y botones concretos. */
export const USE_CASE_LEVEL = ['esencial', 'real'] as const;

/** Un paso del curso típico: lo hace el actor o lo responde el sistema. */
export interface UseCaseStep {
  by: 'actor' | 'system';
  text: string;
}

/** Un camino alterno: en qué paso del curso típico se desvía y qué pasa. */
export interface AlternateFlow {
  step: number;
  text: string;
}

export interface UseCaseSpec {
  /** «CU01». */
  code: string;
  purpose: string;
  importance: (typeof USE_CASE_IMPORTANCE)[number];
  level: (typeof USE_CASE_LEVEL)[number];
  summary: string;
  preconditions: string[];
  postconditions: string[];
  typicalCourse: UseCaseStep[];
  alternateCourses: AlternateFlow[];
}

export function emptySpec(code: string): UseCaseSpec {
  return { code, purpose: '', importance: 'primario', level: 'esencial', summary: '', preconditions: [], postconditions: [], typicalCourse: [], alternateCourses: [] };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/** La ficha guardada en el nodo, leída con tolerancia; null si todavía no tiene. */
export function readSpec(node: Pick<DiagramNode, 'props'>): UseCaseSpec | null {
  const raw = node.props[USE_CASE_SPEC_KEY];
  if (!isRecord(raw) || typeof raw.code !== 'string') return null;
  return {
    code: raw.code,
    purpose: typeof raw.purpose === 'string' ? raw.purpose : '',
    importance: USE_CASE_IMPORTANCE.includes(raw.importance as never) ? (raw.importance as UseCaseSpec['importance']) : 'primario',
    level: USE_CASE_LEVEL.includes(raw.level as never) ? (raw.level as UseCaseSpec['level']) : 'esencial',
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    preconditions: strings(raw.preconditions),
    postconditions: strings(raw.postconditions),
    typicalCourse: (Array.isArray(raw.typicalCourse) ? raw.typicalCourse : [])
      .filter((step): step is UseCaseStep => isRecord(step) && (step.by === 'actor' || step.by === 'system') && typeof step.text === 'string'),
    alternateCourses: (Array.isArray(raw.alternateCourses) ? raw.alternateCourses : [])
      .filter((flow): flow is AlternateFlow => isRecord(flow) && typeof flow.step === 'number' && typeof flow.text === 'string'),
  };
}

export const withSpec = (props: Record<string, unknown>, spec: UseCaseSpec): Record<string, unknown> => ({ ...props, [USE_CASE_SPEC_KEY]: spec });

/** Siguiente código libre entre los casos de uso de `diagrams`: CU01, CU02… */
export function nextUseCaseCode(diagrams: readonly Diagram[]): string {
  const used = diagrams.flatMap((diagram) => diagram.nodes).map((node) => readSpec(node)?.code ?? '');
  const highest = Math.max(0, ...used.map((code) => Number(/^CU-?(\d+)$/i.exec(code)?.[1] ?? 0)));
  return `CU${String(highest + 1).padStart(2, '0')}`;
}

/** Lo que el diagrama dice del caso: sus actores y los casos que incluye, lo extienden o él extiende. */
export interface UseCaseContext {
  actors: string[];
  includes: string[];
  extendedBy: string[];
  extends: string[];
}

export function useCaseContext(diagram: Diagram, useCaseId: string): UseCaseContext {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const names = (ids: string[]) => [...new Set(ids.map((id) => nodeName(byId.get(id))))];
  const touching = (type: string) => diagram.edges.filter((edge) => edge.artifactType === type && (edge.sourceId === useCaseId || edge.targetId === useCaseId));
  const other = (edge: { sourceId: string; targetId: string }) => (edge.sourceId === useCaseId ? edge.targetId : edge.sourceId);
  return {
    actors: names(touching(U.association).map(other).filter((id) => byId.get(id)?.artifactType === U.actor)),
    includes: names(diagram.edges.filter((edge) => edge.artifactType === U.include && edge.sourceId === useCaseId).map((edge) => edge.targetId)),
    // En «extend» la flecha va del caso que extiende al extendido.
    extendedBy: names(diagram.edges.filter((edge) => edge.artifactType === U.extend && edge.targetId === useCaseId).map((edge) => edge.sourceId)),
    extends: names(diagram.edges.filter((edge) => edge.artifactType === U.extend && edge.sourceId === useCaseId).map((edge) => edge.targetId)),
  };
}

/** Número de cada paso del curso típico (1, 2, 3…), en orden, como en la tabla de dos columnas. */
export const stepNumbers = (spec: UseCaseSpec) => spec.typicalCourse.map((_, index) => index + 1);

export interface SpecHint {
  level: 'warning' | 'tip';
  text: string;
}

/**
 * Revisa la ficha: lo que falta para que sirva de guía al diseño y a las
 * pruebas. `actors` sale del diagrama y `references` de los vínculos.
 */
export function reviewSpec(spec: UseCaseSpec, context: UseCaseContext, references: number): SpecHint[] {
  const hints: SpecHint[] = [];
  const warn = (text: string) => hints.push({ level: 'warning', text });
  const tip = (text: string) => hints.push({ level: 'tip', text });
  if (context.actors.length === 0) warn('El caso no tiene actores: únelo en el diagrama con quien lo inicia.');
  if (!spec.purpose.trim()) warn('Falta el propósito: para qué lo hace el actor.');
  if (spec.typicalCourse.length < 2) warn('El curso típico necesita al menos una acción del actor y una respuesta del sistema.');
  if (spec.typicalCourse.length > 0 && spec.typicalCourse[0]!.by !== 'actor') tip('El curso típico suele empezar con una acción del actor.');
  if (spec.typicalCourse.length >= 2 && !spec.typicalCourse.some((step) => step.by === 'system')) warn('El sistema no responde en ningún paso: falta su parte.');
  if (spec.postconditions.length === 0) warn('Falta la postcondición: cómo queda el sistema cuando el caso termina bien.');
  if (spec.preconditions.length === 0) tip('Agrega las precondiciones: qué debe ser cierto antes de empezar.');
  if (spec.alternateCourses.length === 0) tip('Agrega al menos un curso alterno: qué pasa si algo falla.');
  const outOfRange = spec.alternateCourses.filter((flow) => flow.step < 1 || flow.step > spec.typicalCourse.length);
  if (outOfRange.length > 0) warn(`Hay cursos alternos que apuntan a pasos que no existen (${outOfRange.map((flow) => flow.step).join(', ')}).`);
  if (references === 0) tip('Vincúlalo con el requisito que cumple (Referencias): así queda trazado.');
  if (!spec.summary.trim()) tip('Agrega un resumen de una o dos frases.');
  return hints;
}
