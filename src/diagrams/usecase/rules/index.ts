import type { Diagram, ValidationIssue, ValidationRule } from '@/core/model';
import { UseCaseArtifact as U } from '../artifactTypes';

type RuleMeta = Omit<ValidationRule, 'diagramType' | 'check'>;
const rule = (meta: RuleMeta, check: (diagram: Diagram) => ValidationIssue[]): ValidationRule => ({ ...meta, diagramType: 'usecase', check });
const issue = (ruleId: string, severity: ValidationIssue['severity'], message: string, suggestion: string, nodeIds: string[] = [], edgeIds: string[] = []): ValidationIssue => ({ ruleId, severity, message, suggestion, nodeIds, edgeIds });
const hasContent = (diagram: Diagram) => diagram.nodes.length > 0;

const boundaryMissing = rule({
  id: 'usecase.boundary-missing', severity: 'warning', title: 'Falta el límite del sistema',
  explanation: 'La frontera distingue qué capacidades pertenecen al sistema y qué actores quedan fuera.',
}, (diagram) => !hasContent(diagram) || diagram.nodes.some((node) => node.artifactType === U.systemBoundary) ? [] : [
  issue('usecase.boundary-missing', 'warning', 'No hay un límite del sistema.', 'Agrega un «Límite del sistema» y coloca dentro los casos de uso.'),
]);

const useCaseOutside = rule({
  id: 'usecase.usecase-outside', severity: 'warning', title: 'Caso de uso fuera del sistema',
  explanation: 'Un caso de uso representa una capacidad ofrecida por el sistema y por eso pertenece a su frontera.',
}, (diagram) => diagram.nodes.filter((node) => node.artifactType === U.useCase && !node.parentId).map((node) =>
  issue('usecase.usecase-outside', 'warning', `«${node.label || 'Caso sin nombre'}» está fuera del sistema.`, 'Muévelo dentro del límite del sistema.', [node.id]),
));

const actorInside = rule({
  id: 'usecase.actor-inside', severity: 'warning', title: 'Actor dentro del sistema',
  explanation: 'El actor representa un rol externo; si está dentro parece una parte implementada por el propio sistema.',
}, (diagram) => diagram.nodes.filter((node) => node.artifactType === U.actor && node.parentId).map((node) =>
  issue('usecase.actor-inside', 'warning', `El actor «${node.label || 'sin nombre'}» está dentro del sistema.`, 'Muévelo fuera del límite.', [node.id]),
));

const isolated = rule({
  id: 'usecase.isolated', severity: 'warning', title: 'Elemento sin relaciones',
  explanation: 'Un actor sin participación y un caso de uso sin actor no aportan información al modelo.',
}, (diagram) => diagram.nodes.filter((node) => [U.actor, U.useCase].includes(node.artifactType as typeof U.actor) && !diagram.edges.some((edge) => edge.sourceId === node.id || edge.targetId === node.id)).map((node) =>
  issue('usecase.isolated', 'warning', `«${node.label || 'Elemento sin nombre'}» no tiene relaciones.`, 'Conéctalo con el actor o caso de uso correspondiente.', [node.id]),
));

const unnamed = rule({
  id: 'usecase.unnamed', severity: 'warning', title: 'Nombre poco explícito',
  explanation: 'Los nombres permiten acordar el alcance sin tener que abrir documentación adicional.',
}, (diagram) => diagram.nodes.filter((node) => [U.actor, U.useCase, U.systemBoundary].includes(node.artifactType as typeof U.actor) && !node.label.trim()).map((node) =>
  issue('usecase.unnamed', 'warning', 'Hay un elemento principal sin nombre.', 'Escribe un nombre que describa el rol, objetivo o sistema.', [node.id]),
));

const goalAsVerb = rule({
  id: 'usecase.goal-as-verb', severity: 'info', title: 'La meta no empieza con un verbo',
  explanation: 'Un verbo en infinitivo mantiene el foco en el resultado que el actor quiere conseguir.',
}, (diagram) => diagram.nodes.filter((node) => {
  if (node.artifactType !== U.useCase || !node.label.trim()) return false;
  const firstWord = node.label.trim().split(/\s+/)[0]!.toLocaleLowerCase('es');
  return !/(ar|er|ir)$/.test(firstWord);
}).map((node) => issue('usecase.goal-as-verb', 'info', `«${node.label}» no expresa claramente una acción.`, 'Nómbralo con un verbo y un resultado, por ejemplo «Consultar pedido».', [node.id])));

const interfaceDetail = rule({
  id: 'usecase.interface-detail', severity: 'warning', title: 'Detalle de interfaz usado como meta',
  explanation: 'Botones, formularios y pantallas explican una solución de interfaz, no el objetivo estable del actor.',
}, (diagram) => diagram.nodes.filter((node) => node.artifactType === U.useCase && /\b(bot[oó]n|pantalla|formulario|clic|click|endpoint|base de datos)\b/i.test(node.label)).map((node) =>
  issue('usecase.interface-detail', 'warning', `«${node.label}» parece describir la interfaz o la implementación.`, 'Renómbralo según el resultado que busca el actor.', [node.id]),
));

export const useCaseRules: ValidationRule[] = [boundaryMissing, useCaseOutside, actorInside, isolated, unnamed, goalAsVerb, interfaceDetail];
