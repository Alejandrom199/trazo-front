import type { Diagram, ValidationIssue, ValidationRule } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';
import { buildComponentModel, componentsInCycles, nameOf, type ComponentModel } from './componentModel';

type RuleMeta = Omit<ValidationRule, 'diagramType' | 'check'>;
type Found = Omit<ValidationIssue, 'ruleId' | 'severity' | 'nodeIds' | 'edgeIds'> & { nodeIds?: string[]; edgeIds?: string[] };

/** Crea una regla: describe lo que encontró; id, gravedad y el modelo los pone este envoltorio. */
function rule(meta: RuleMeta, find: (model: ComponentModel, diagram: Diagram) => Found[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'component',
    check: (diagram) => {
      if (diagram.nodes.length === 0) return [];
      return find(buildComponentModel(diagram), diagram).map((found) => ({ ruleId: meta.id, severity: meta.severity, nodeIds: [], edgeIds: [], ...found }));
    },
  };
}

/** Regla: componentes e interfaces tienen nombre. */
const unnamed = rule(
  { id: 'component.unnamed', severity: 'warning', title: 'Elemento sin nombre', explanation: 'Un componente o una interfaz sin nombre no dicen qué parte del sistema son ni qué contrato ofrecen.' },
  (model) =>
    [...model.components, ...model.provided, ...model.required]
      .filter((node) => !node.label.trim())
      .map((node) => ({ message: 'Hay un componente o una interfaz sin nombre.', suggestion: 'Haz doble clic y escribe su nombre: «Pedidos», «IPagos».', nodeIds: [node.id] })),
);

/** Regla: toda interfaz pertenece a un componente. */
const interfaceOrphan = rule(
  { id: 'component.interface-orphan', severity: 'warning', title: 'Interfaz sin componente', explanation: 'Una interfaz es la cara de un componente: suelta, no se sabe quién la ofrece o la necesita.' },
  (model) =>
    [...model.provided, ...model.required]
      .filter((node) => !model.ownerOf(node.id))
      .map((node) => ({
        message: `La interfaz ${nameOf(node)} no está unida a ningún componente.`,
        suggestion: node.artifactType === C.providedInterface ? 'Únela con una línea al componente que la ofrece.' : 'Únela con una línea al componente que la necesita.',
        nodeIds: [node.id],
      })),
);

/** Regla: lo que un componente necesita lo cumple alguien. */
const requiredUnsatisfied = rule(
  { id: 'component.required-unsatisfied', severity: 'warning', title: 'Necesidad sin cubrir', explanation: 'Si nadie ofrece lo que un componente necesita, el sistema está incompleto o falta una pieza.' },
  (model) =>
    model.required
      .filter((node) => !model.assemblies.some((assembly) => assembly.required.id === node.id))
      .map((node) => ({
        message: `Nadie cubre ${nameOf(node)}${model.ownerOf(node.id) ? `, que necesita ${nameOf(model.ownerOf(node.id))}` : ''}.`,
        suggestion: 'Únela con un ensamble a la interfaz provista que la cumple (la piruleta del componente que la ofrece).',
        nodeIds: [node.id],
      })),
);

/** Regla: sin ciclos de dependencias (directas o a través de ensambles). */
const dependencyCycle = rule(
  { id: 'component.dependency-cycle', severity: 'warning', title: 'Ciclo de dependencias', explanation: 'Si A depende de B y B de A, ninguna de las dos se puede construir, probar ni reemplazar por separado.' },
  (model, diagram) =>
    componentsInCycles(model).map((cycle) => {
      const names = cycle.map((id) => nameOf(diagram.nodes.find((node) => node.id === id)));
      return {
        message: `Hay un ciclo de dependencias: ${[...names, names[0]].join(' → ')}.`,
        suggestion: 'Rompe el ciclo: extrae lo común a un componente nuevo o invierte una dependencia con una interfaz.',
        nodeIds: cycle,
      };
    }),
);

/** Regla (informativa): un ensamble une el mismo contrato por ambos lados. */
const assemblyMismatch = rule(
  { id: 'component.assembly-mismatch', severity: 'info', title: 'Ensamble entre contratos distintos', explanation: 'En un ensamble, lo que se necesita y lo que se ofrece deberían ser el mismo contrato; nombres distintos suelen ser un error.' },
  (model) =>
    model.assemblies
      .filter(({ required, provided }) => required.label.trim() && provided.label.trim() && required.label.trim().toLowerCase() !== provided.label.trim().toLowerCase())
      .map(({ edge, required, provided }) => ({
        message: `El ensamble une ${nameOf(required)} con ${nameOf(provided)}: ¿es el mismo contrato?`,
        suggestion: 'Si es el mismo, usa el mismo nombre en ambos lados; si no, revisa qué interfaz cumple la necesidad.',
        edgeIds: [edge.id],
      })),
);

/** Regla (informativa): un componente sin conexiones suele estar fuera de lugar. */
const isolated = rule(
  { id: 'component.isolated', severity: 'info', title: 'Componente aislado', explanation: 'Un componente que no ofrece ni necesita nada puede estar fuera del alcance o faltarle conexiones.' },
  (model, diagram) =>
    model.components
      .filter((node) => !diagram.edges.some((edge) => edge.artifactType !== C.annotationLink && (edge.sourceId === node.id || edge.targetId === node.id)))
      .map((node) => ({ message: `${nameOf(node)} no está conectado con nada.`, suggestion: 'Agrega lo que ofrece o necesita, o quítalo si no forma parte del sistema.', nodeIds: [node.id] })),
);

/** Regla (informativa): toda nota se ancla a algo. */
const noteLoose = rule(
  { id: 'component.note-loose', severity: 'info', title: 'Nota sin anclar', explanation: 'Una nota suelta puede leerse como comentario de cualquier elemento.' },
  (_model, diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType === C.note && !diagram.edges.some((edge) => edge.artifactType === C.annotationLink && (edge.sourceId === node.id || edge.targetId === node.id)))
      .map((node) => ({ message: 'Hay una nota sin anclar.', suggestion: 'Únela al elemento que comenta.', nodeIds: [node.id] })),
);

/** Todas las reglas, en el orden en que conviene leerlas. */
export const componentRules: ValidationRule[] = [unnamed, interfaceOrphan, requiredUnsatisfied, dependencyCycle, assemblyMismatch, isolated, noteLoose];

