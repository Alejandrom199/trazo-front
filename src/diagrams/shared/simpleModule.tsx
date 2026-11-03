import {
  addEdge,
  addNode,
  createEmptyDiagram,
  DEFAULT_EDGE_SHAPE,
  type ArtifactCategory,
  type ArtifactDefinition,
  type ConnectionResult,
  type Diagram,
  type DiagramType,
  type Difficulty,
  type Narration,
  type Position,
  type Size,
  type Template,
  type ValidationRule,
} from '@/core/model';
import type { ArtifactNodeProps, DiagramGuide, DiagramModule, EdgeKind, NodeKind } from '@/core/registry';
import { centeredLabelClass, SHAPE_FILL, STROKE_WIDTH, strokeFor } from './shapeStyles';

export type SimpleVisual = 'box' | 'object' | 'profile' | 'stereotype' | 'frame' | 'part' | 'port' | 'interaction' | 'timeLane' | 'stateBar' | 'diamond';

export interface SimpleNodeSpec {
  type: string;
  name: string;
  umlName: string;
  category: ArtifactCategory;
  visual: SimpleVisual;
  defaultLabel: string;
  size: Size;
  notation: string;
  whatIs: string;
  whatFor: string;
  example: string;
  container?: boolean;
  connectable?: boolean;
  resizable?: boolean;
}

export interface SimpleEdgeSpec {
  type: string;
  name: string;
  umlName: string;
  category?: ArtifactCategory;
  dashed?: boolean;
  arrow?: EdgeKind['arrow'];
  notation: string;
  whatIs: string;
  whatFor: string;
  example: string;
  defaultLabel?: string;
}

export interface SimpleTemplateNode {
  id: string;
  type: string;
  label: string;
  position: Position;
  size?: Size;
  parentId?: string | null;
}

export interface SimpleTemplateEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface SimpleTemplateSpec {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  learningGoals: string[];
  nodes: SimpleTemplateNode[];
  edges: SimpleTemplateEdge[];
}

interface SimpleModuleSpec {
  diagramType: DiagramType;
  displayName: string;
  nodes: SimpleNodeSpec[];
  edges: SimpleEdgeSpec[];
  defaultEdge: string;
  guide: DiagramGuide;
  templates: SimpleTemplateSpec[];
  /** Seis contextos que reutilizan la misma notación base con nombres de dominio distintos. */
  scenarios?: SimpleScenario[];
}

interface SimpleScenario {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  nodeLabels?: Record<string, string>;
  edgeLabels?: Record<string, string>;
}

/** Crea módulos UML declarativos que conservan edición, paleta, reglas, narración y ejemplos. */
export function createSimpleModule(spec: SimpleModuleSpec): DiagramModule {
  const artifacts: ArtifactDefinition[] = [
    ...spec.nodes.map((node) => artifact(spec.diagramType, node)),
    ...spec.edges.map((edge) => artifact(spec.diagramType, { ...edge, category: edge.category ?? 'conector' })),
  ];
  const nodeKinds = Object.fromEntries(spec.nodes.map((node) => [node.type, nodeKind(node)]));
  const edgeKinds = Object.fromEntries(spec.edges.map((edge) => [edge.type, edgeKind(edge, spec.edges.map((item) => item.type))]));
  const templateSpecs = spec.scenarios && spec.templates.length === 1 ? expandScenarios(spec.templates[0]!, spec.scenarios) : spec.templates;
  const templates = templateSpecs.map((template) => buildTemplate(spec, template));

  return {
    diagramType: spec.diagramType,
    displayName: spec.displayName,
    artifacts,
    nodeKinds,
    edgeKinds,
    resolveConnection: (diagram, sourceId, targetId) => resolve(diagram, sourceId, targetId, spec.defaultEdge),
    initialEdge: (_diagram, edgeType) => ({ label: spec.edges.find((edge) => edge.type === edgeType)?.defaultLabel ?? '', props: {} }),
    rules: rulesFor(spec.diagramType),
    narrate: narrate,
    templates,
    guide: spec.guide,
  };
}

function expandScenarios(base: SimpleTemplateSpec, scenarios: SimpleScenario[]): SimpleTemplateSpec[] {
  return scenarios.map((scenario) => ({
    ...base,
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    difficulty: scenario.difficulty,
    nodes: base.nodes.map((node) => ({ ...node, label: scenario.nodeLabels?.[node.id] ?? node.label })),
    edges: base.edges.map((edge) => ({ ...edge, label: scenario.edgeLabels?.[edge.id] ?? edge.label })),
  }));
}

function artifact(diagramType: DiagramType, item: SimpleNodeSpec | (SimpleEdgeSpec & { category: ArtifactCategory })): ArtifactDefinition {
  return {
    type: item.type,
    diagramType,
    category: item.category,
    name: item.name,
    umlName: item.umlName,
    notation: item.notation,
    whatIs: item.whatIs,
    whatFor: item.whatFor,
    whyExists: item.whatFor,
    whenToUse: [`Cuando ${item.whatFor.charAt(0).toLowerCase()}${item.whatFor.slice(1)}`],
    whenNotToUse: ['Cuando el elemento no aporta una decisión o información nueva al modelo.'],
    rules: ['Usa un nombre concreto y coherente con el resto del diagrama.'],
    commonMistakes: ['Agregarlo sin explicar qué representa en este modelo.'],
    example: item.example,
    relatedArtifacts: [],
    connectionRules: { minIn: 0, maxIn: null, minOut: 0, maxOut: null },
  };
}

function nodeKind(spec: SimpleNodeSpec): NodeKind {
  return {
    component: SimpleShape,
    defaultSize: spec.size,
    defaultLabel: spec.defaultLabel,
    defaultProps: { visual: spec.visual },
    hasLabel: true,
    resizable: spec.resizable ?? true,
    isContainer: spec.container ?? false,
    connectable: spec.connectable ?? true,
    properties: [],
    keepAspectRatio: spec.visual === 'port' || spec.visual === 'diamond',
    magnetic: false,
    nestable: spec.container,
  };
}

function edgeKind(spec: SimpleEdgeSpec, switchableTo: string[]): EdgeKind {
  return { dashed: spec.dashed ?? false, arrow: spec.arrow === undefined ? 'open' : spec.arrow, text: 'label', switchableTo };
}

function resolve(diagram: Diagram, sourceId: string, targetId: string, edgeType: string): ConnectionResult {
  if (sourceId === targetId) return { allowed: false, reason: 'Un elemento no puede conectarse consigo mismo.' };
  if (!diagram.nodes.some((node) => node.id === sourceId) || !diagram.nodes.some((node) => node.id === targetId)) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
  if (diagram.edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)) return { allowed: false, reason: 'Estos elementos ya están conectados en ese sentido.' };
  return { allowed: true, edgeType };
}

function rulesFor(diagramType: DiagramType): ValidationRule[] {
  return [
    {
      id: `${diagramType}.unnamed`, diagramType, severity: 'warning', title: 'Elemento sin nombre', explanation: 'Un elemento anónimo no puede relacionarse con el resto del modelo.',
      check: (diagram) => diagram.nodes.filter((node) => !node.label.trim()).map((node) => ({ ruleId: `${diagramType}.unnamed`, severity: 'warning', message: 'Hay un elemento sin nombre.', suggestion: 'Haz doble clic y escribe un nombre concreto.', nodeIds: [node.id], edgeIds: [] })),
    },
    {
      id: `${diagramType}.isolated`, diagramType, severity: 'info', title: 'Elemento aislado', explanation: 'Un elemento aislado puede ser correcto, pero conviene comprobar si falta una relación.',
      check: (diagram) => diagram.nodes.length < 2 ? [] : diagram.nodes.filter((node) => !diagram.edges.some((edge) => edge.sourceId === node.id || edge.targetId === node.id)).map((node) => ({ ruleId: `${diagramType}.isolated`, severity: 'info', message: `«${node.label || 'Sin nombre'}» está aislado.`, suggestion: 'Conéctalo si participa en la historia que cuenta el diagrama.', nodeIds: [node.id], edgeIds: [] })),
    },
  ];
}

function narrate(diagram: Diagram): Narration {
  if (diagram.nodes.length === 0) return [];
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const lines: Narration = [{ text: `El diagrama contiene ${diagram.nodes.length} elementos.`, kind: 'start', depth: 0, nodeIds: diagram.nodes.map((node) => node.id), edgeIds: [] }];
  for (const edge of diagram.edges) {
    const source = byId.get(edge.sourceId)?.label || 'elemento sin nombre';
    const target = byId.get(edge.targetId)?.label || 'elemento sin nombre';
    lines.push({ text: `«${source}» se relaciona con «${target}»${edge.label ? ` mediante «${edge.label}»` : ''}.`, kind: 'step', depth: 0, nodeIds: [edge.sourceId, edge.targetId], edgeIds: [edge.id] });
  }
  return lines;
}

function buildTemplate(spec: SimpleModuleSpec, input: SimpleTemplateSpec): Template {
  let diagram = createEmptyDiagram({ diagramType: spec.diagramType, name: input.name }, new Date(0));
  const nodeSpecs = new Map(spec.nodes.map((node) => [node.type, node]));
  for (const item of input.nodes) {
    const definition = nodeSpecs.get(item.type);
    if (!definition) throw new Error(`Plantilla ${input.id}: nodo desconocido ${item.type}.`);
    diagram = addNode(diagram, { id: item.id, artifactType: item.type, label: item.label, position: item.position, size: item.size ?? definition.size, parentId: item.parentId ?? null, props: { visual: definition.visual }, notes: '', locked: false });
  }
  for (const item of input.edges) {
    diagram = addEdge(diagram, { id: item.id, artifactType: item.type, sourceId: item.sourceId, targetId: item.targetId, guard: null, label: item.label ?? '', ...DEFAULT_EDGE_SHAPE, props: {} });
  }
  return { id: input.id, diagramType: spec.diagramType, name: input.name, description: input.description, difficulty: input.difficulty, learningGoals: input.learningGoals, diagram: { ...diagram, id: input.id, name: input.name, description: input.description, templateId: input.id } };
}

function SimpleShape({ node, selected, label, preview }: ArtifactNodeProps) {
  const visual = (node.props.visual as SimpleVisual | undefined) ?? 'box';
  const border = `${STROKE_WIDTH}px solid ${strokeFor(selected)}`;
  if (visual === 'port') return <div className="size-full" style={{ border, background: SHAPE_FILL }} />;
  if (visual === 'diamond') return <div className="absolute inset-[15%] rotate-45" style={{ border, background: SHAPE_FILL }}><div className="absolute inset-[-30%] -rotate-45">{!preview && <span className={centeredLabelClass}>{label}</span>}</div></div>;
  if (visual === 'timeLane') return <div className="relative size-full border-l-2 border-ink-400"><div className="absolute top-1/2 right-0 left-0 border-t border-dashed border-ink-400" />{!preview && <div className="absolute top-1 left-3 text-xs font-medium text-ink-900">{label}</div>}</div>;
  if (visual === 'stateBar') return <div className="relative size-full rounded-sm" style={{ border, background: 'var(--color-accent-soft)' }}>{!preview && <span className={centeredLabelClass}>{label}</span>}</div>;
  if (visual === 'frame') return <div className="relative size-full" style={{ border, background: 'color-mix(in oklch, var(--color-shape-fill) 30%, transparent)' }}><div className="absolute top-0 left-0 border-r border-b border-ink-400 px-3 py-1 text-xs font-semibold text-ink-900">{!preview && label}</div></div>;
  const prefix = visual === 'profile' ? '«profile»' : visual === 'stereotype' ? '«stereotype»' : visual === 'interaction' ? 'ref' : '';
  return <div className={`relative size-full ${visual === 'interaction' ? 'rounded-lg' : ''}`} style={{ border, background: SHAPE_FILL }}>{prefix && !preview && <div className="pt-1 text-center text-[10px] text-ink-400">{prefix}</div>}{!preview && <div className={`${centeredLabelClass} ${visual === 'object' ? 'underline underline-offset-4' : ''}`}>{label}</div>}</div>;
}
