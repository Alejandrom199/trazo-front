import { anchorNoteFix, isInsideOf, type Diagram, type DiagramNode, type ValidationIssue, type ValidationRule } from '@/core/model';
import { DeploymentArtifact as D, HOST_TYPES, MACHINE_TYPES } from './artifactTypes';

type RuleMeta = Omit<ValidationRule, 'diagramType' | 'check'>;
type Found = Omit<ValidationIssue, 'ruleId' | 'severity' | 'nodeIds' | 'edgeIds'> & { nodeIds?: string[]; edgeIds?: string[] };

/** Crea una regla: describe lo que encontró; id y gravedad los pone este envoltorio. */
function rule(meta: RuleMeta, find: (diagram: Diagram) => Found[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'deployment',
    check: (diagram) =>
      diagram.nodes.length === 0 ? [] : find(diagram).map((found) => ({ ruleId: meta.id, severity: meta.severity, nodeIds: [], edgeIds: [], ...found })),
  };
}

const parentOf = (diagram: Diagram, node: DiagramNode) => diagram.nodes.find((candidate) => candidate.id === node.parentId);
const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;

/** Dónde se despliega un artefacto: el nodo o entorno que lo contiene, o al que apunta un «deploy». */
export function hostsOf(diagram: Diagram, artifact: DiagramNode): DiagramNode[] {
  const parent = parentOf(diagram, artifact);
  const byDeploy = diagram.edges
    .filter((edge) => edge.artifactType === D.deployment && edge.sourceId === artifact.id)
    .map((edge) => diagram.nodes.find((node) => node.id === edge.targetId))
    .filter((node): node is DiagramNode => node !== undefined);
  return [...(parent && HOST_TYPES.has(parent.artifactType) ? [parent] : []), ...byDeploy];
}

/** Regla: todo tiene nombre. */
const unnamed = rule(
  { id: 'deployment.unnamed', severity: 'warning', title: 'Elemento sin nombre', explanation: 'Una máquina o un archivo sin nombre no se puede instalar ni mantener.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType !== D.note && !node.label.trim())
      .map((node) => ({ message: 'Hay un elemento sin nombre.', suggestion: 'Haz doble clic y nómbralo: «Servidor web», «api.jar».', nodeIds: [node.id] })),
);

/** Regla: todo artefacto se despliega en alguna parte. */
const artifactNotDeployed = rule(
  { id: 'deployment.artifact-not-deployed', severity: 'warning', title: 'Artefacto sin desplegar', explanation: 'Un artefacto es algo que se instala: si no está en ninguna máquina, el diagrama no dice dónde corre.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType === D.artifact && hostsOf(diagram, node).length === 0)
      .map((node) => ({
        message: `${name(node)} no está desplegado en ninguna parte.`,
        suggestion: 'Arrástralo dentro de un nodo o entorno de ejecución, o únelo con «deploy» a donde se instala.',
        nodeIds: [node.id],
      })),
);

/** Regla: un entorno de ejecución corre dentro de una máquina. */
const environmentLoose = rule(
  { id: 'deployment.environment-loose', severity: 'warning', title: 'Entorno fuera de una máquina', explanation: 'Un entorno de ejecución (Docker, la JVM) siempre corre en un nodo o un dispositivo.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType === D.executionEnvironment && !MACHINE_TYPES.has(parentOf(diagram, node)?.artifactType ?? '') && parentOf(diagram, node)?.artifactType !== D.executionEnvironment)
      .map((node) => ({ message: `${name(node)} no está dentro de ninguna máquina.`, suggestion: 'Arrástralo dentro del nodo o dispositivo donde corre.', nodeIds: [node.id] })),
);

/** Regla (informativa): con varias máquinas, cada una se comunica con alguna. */
const machineIsolated = rule(
  { id: 'deployment.machine-isolated', severity: 'info', title: 'Máquina incomunicada', explanation: 'Si una máquina no tiene caminos de comunicación, no se ve cómo participa en el sistema.' },
  (diagram) => {
    const machines = diagram.nodes.filter((node) => MACHINE_TYPES.has(node.artifactType));
    if (machines.length < 2) return [];
    // Cuenta también lo que se comunica desde dentro (un contenedor de esa máquina).
    const talks = (id: string) => diagram.edges.some((edge) => edge.artifactType === D.communicationPath && (edge.sourceId === id || edge.targetId === id));
    return machines
      .filter((node) => !talks(node.id) && !diagram.nodes.some((inner) => isInsideOf(diagram, inner, node.id) && talks(inner.id)))
      .map((node) => ({ message: `${name(node)} no se comunica con ninguna otra máquina.`, suggestion: 'Únela con un camino de comunicación y escribe el protocolo.', nodeIds: [node.id] }));
  },
);

/** Regla (informativa): un camino de comunicación dice su protocolo. */
const pathWithoutProtocol = rule(
  { id: 'deployment.path-without-protocol', severity: 'info', title: 'Comunicación sin protocolo', explanation: 'El protocolo (HTTPS, JDBC, AMQP) decide puertos, cifrado y reglas de red.' },
  (diagram) =>
    diagram.edges
      .filter((edge) => edge.artifactType === D.communicationPath && !edge.label.trim())
      .map((edge) => ({ message: 'Hay un camino de comunicación sin protocolo.', suggestion: 'Haz doble clic sobre la línea y escribe el protocolo, p. ej. «HTTPS».', edgeIds: [edge.id] })),
);

/** Regla (informativa): toda nota se ancla a algo. */
const noteLoose = rule(
  { id: 'deployment.note-loose', severity: 'info', title: 'Nota sin anclar', explanation: 'Una nota suelta puede leerse como comentario de cualquier elemento.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => node.artifactType === D.note && !diagram.edges.some((edge) => edge.artifactType === D.annotationLink && (edge.sourceId === node.id || edge.targetId === node.id)))
      .map((node) => ({ message: 'Hay una nota sin anclar.', suggestion: 'Únela al elemento que comenta.', nodeIds: [node.id], fix: anchorNoteFix(node.id, D.note, D.annotationLink) })),
);

/** Todas las reglas, en el orden en que conviene leerlas. */
export const deploymentRules: ValidationRule[] = [unnamed, artifactNotDeployed, environmentLoose, machineIsolated, pathWithoutProtocol, noteLoose];
