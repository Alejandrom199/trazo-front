import {
  answersMatch,
  isElseGuard,
  isLinkAlive,
  nodeName,
  readLinkedDiagramId,
  requirementCoverage,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type DiagramType,
  type ProjectIssue,
  type ProjectRule,
  type ProjectSnapshot,
  type TraceEndpoint,
} from '@/core/model';
import { CLASSIFIER_TYPES } from '../class/artifactTypes';
import { ActivityArtifact } from '../activity/artifactTypes';
import { ComponentArtifact } from '../component/artifactTypes';
import { SequenceArtifact } from '../sequence/artifactTypes';
import { UseCaseArtifact } from '../usecase/artifactTypes';
import { classifierOperations, lifelineTypeName, messageCallName, normalizeName } from './names';

/**
 * Reglas de coherencia entre los diagramas de un proyecto. Cada una se activa
 * solo cuando el proyecto ya tiene el diagrama que haría de respaldo: un
 * proyecto que recién empieza no se llena de avisos por lo que aún no dibujó.
 */

/** Diagramas que cuentan cómo ocurre un caso de uso (lo detallan). */
const BEHAVIOR_TYPES: ReadonlySet<DiagramType> = new Set(['activity', 'sequence', 'state', 'communication', 'interactionOverview', 'timing']);

const nodeEndpoint = (diagram: Diagram, node: DiagramNode): TraceEndpoint => ({ diagramId: diagram.id, elementId: node.id, kind: 'node' });
const ofType = (snapshot: ProjectSnapshot, type: DiagramType) => snapshot.diagrams.filter((diagram) => diagram.diagramType === type);
const hasNodes = (diagrams: readonly Diagram[]) => diagrams.some((diagram) => diagram.nodes.length > 0);

/** Elementos con algún vínculo de trazabilidad, como «diagrama:elemento». */
function linkedElements(snapshot: ProjectSnapshot): Set<string> {
  return new Set(snapshot.traceLinks.flatMap((link) => [link.source, link.target]).map((end) => `${end.diagramId}:${end.elementId}`));
}

/** Clasificadores de los diagramas de clases, por nombre normalizado. */
function classifiersByName(snapshot: ProjectSnapshot): Map<string, DiagramNode> {
  const byName = new Map<string, DiagramNode>();
  for (const diagram of ofType(snapshot, 'class')) {
    for (const node of diagram.nodes) if (CLASSIFIER_TYPES.has(node.artifactType)) byName.set(normalizeName(nodeName(node, '')), node);
  }
  byName.delete('');
  return byName;
}

const issue = (rule: Pick<ProjectRule, 'id' | 'severity'>, details: Omit<ProjectIssue, 'ruleId' | 'severity'>): ProjectIssue => ({ ruleId: rule.id, severity: rule.severity, ...details });

/**
 * Vínculo roto. Un vínculo apunta a un elemento (o diagrama) que ya no está en el
 * proyecto: se borró después de vincularlo. Se arregla quitando el vínculo.
 */
export const brokenTraceLink: ProjectRule = {
  id: 'project.broken-trace-link',
  severity: 'warning',
  title: 'Vínculo roto',
  explanation: 'La trazabilidad solo sirve si cada vínculo apunta a algo que existe. Si borraste el elemento a propósito, quita el vínculo; si no, vuelve a crearlo con el elemento correcto.',
  check(snapshot) {
    const exists = (end: TraceEndpoint) => {
      const diagram = snapshot.diagrams.find((candidate) => candidate.id === end.diagramId);
      const elements = end.kind === 'node' ? diagram?.nodes : diagram?.edges;
      return elements?.some((element) => element.id === end.elementId) ?? false;
    };
    return snapshot.traceLinks
      .filter((link) => !exists(link.source) || !exists(link.target))
      .map((link) => {
        const alive = [link.source, link.target].filter(exists);
        const survivor = alive[0] && snapshot.diagrams.find((diagram) => diagram.id === alive[0]!.diagramId);
        return issue(brokenTraceLink, {
          message: survivor
            ? `Un vínculo «${link.relation}» de «${survivor.name}» apunta a un elemento que ya no existe.`
            : `Un vínculo «${link.relation}» une dos elementos que ya no existen.`,
          suggestion: 'Quita el vínculo o vuelve a crearlo hacia el elemento correcto.',
          elements: alive,
          fix: { label: 'Quitar el vínculo', apply: ({ traceLinks }) => ({ traceLinks: traceLinks.filter((candidate) => candidate.id !== link.id) }) },
        });
      });
  },
};

/**
 * Caso de uso sin detallar. Si el proyecto ya tiene diagramas de comportamiento,
 * cada caso de uso debería estar contado en alguno: por un vínculo de
 * trazabilidad, o porque un diagrama de comportamiento lleva su nombre.
 */
export const useCaseNotDetailed: ProjectRule = {
  id: 'project.usecase-not-detailed',
  severity: 'info',
  title: 'Caso de uso sin detallar',
  explanation: 'Un caso de uso dice QUÉ ofrece el sistema; un diagrama de actividades, secuencia o estados dice CÓMO ocurre. Si ningún diagrama lo detalla, esa función queda sin diseñar.',
  check(snapshot) {
    const behaviors = snapshot.diagrams.filter((diagram) => BEHAVIOR_TYPES.has(diagram.diagramType));
    if (!hasNodes(behaviors)) return [];
    const behaviorIds = new Set(behaviors.map((diagram) => diagram.id));
    const behaviorNames = behaviors.map((diagram) => normalizeName(diagram.name));

    return ofType(snapshot, 'usecase').flatMap((diagram) =>
      diagram.nodes
        .filter((node) => node.artifactType === UseCaseArtifact.useCase)
        .filter((node) => {
          const linkedToBehavior = snapshot.traceLinks.some((link) =>
            [[link.source, link.target], [link.target, link.source]].some(([self, other]) =>
              self!.diagramId === diagram.id && self!.elementId === node.id && behaviorIds.has(other!.diagramId)));
          const name = normalizeName(nodeName(node, ''));
          return !linkedToBehavior && !(name && behaviorNames.some((behavior) => behavior.includes(name)));
        })
        .map((node) => issue(useCaseNotDetailed, {
          message: `El caso de uso «${nodeName(node)}» no está detallado en ningún diagrama de comportamiento.`,
          suggestion: 'Vincúlalo («detalla») con la actividad o secuencia que lo cuenta, o crea ese diagrama.',
          elements: [nodeEndpoint(diagram, node)],
        })));
  },
};

/**
 * Participante sin respaldo estructural. Una línea de vida representa una
 * instancia de algún tipo; ese tipo debería existir como clase o componente en
 * el proyecto. Un vínculo de trazabilidad explícito también cuenta como respaldo.
 */
export const lifelineWithoutType: ProjectRule = {
  id: 'project.lifeline-without-type',
  severity: 'info',
  title: 'Participante sin clase ni componente',
  explanation: 'En una secuencia, «:Catálogo» es una instancia del tipo Catálogo. Si ese tipo no aparece en el diagrama de clases ni en el de componentes, la colaboración habla de algo que la estructura no define.',
  check(snapshot) {
    const classes = ofType(snapshot, 'class');
    const components = ofType(snapshot, 'component');
    if (!hasNodes(classes) && !hasNodes(components)) return [];

    const known = new Set(classifiersByName(snapshot).keys());
    for (const diagram of components) {
      for (const node of diagram.nodes) if (node.artifactType === ComponentArtifact.component) known.add(normalizeName(nodeName(node, '')));
    }
    const linked = linkedElements(snapshot);

    return ofType(snapshot, 'sequence').flatMap((diagram) =>
      diagram.nodes
        .filter((node) => node.artifactType === SequenceArtifact.lifeline && !linked.has(`${diagram.id}:${node.id}`))
        .flatMap((node) => {
          const type = lifelineTypeName(node.label);
          if (!type || known.has(normalizeName(type))) return [];
          return [issue(lifelineWithoutType, {
            message: `«${type}» participa en «${diagram.name}», pero no es una clase ni un componente del proyecto.`,
            suggestion: `Agrega «${type}» al diagrama de clases o de componentes, renombra la línea de vida con el nombre que ya usas, o vincúlala con el elemento que la respalda.`,
            elements: [nodeEndpoint(diagram, node)],
          })];
        }));
  },
};

/**
 * Mensaje sin operación. Un mensaje de llamada hacia una instancia de una clase
 * invoca una operación de esa clase; si la clase no la declara, el diagrama de
 * clases y la secuencia se contradicen.
 */
export const messageWithoutOperation: ProjectRule = {
  id: 'project.message-without-operation',
  severity: 'warning',
  title: 'Mensaje sin operación en la clase',
  explanation: 'Un mensaje síncrono o asíncrono pide al receptor que ejecute una operación. Si el receptor es una clase del proyecto, esa operación debería estar declarada en ella.',
  check(snapshot) {
    const classifiers = classifiersByName(snapshot);
    if (classifiers.size === 0) return [];
    const calls: ReadonlySet<string> = new Set([SequenceArtifact.syncMessage, SequenceArtifact.asyncMessage]);

    return ofType(snapshot, 'sequence').flatMap((diagram) =>
      diagram.edges
        .filter((edge) => calls.has(edge.artifactType))
        .flatMap((edge) => {
          const call = messageCallName(edge.label);
          const receiver = diagram.nodes.find((node) => node.id === edge.targetId);
          const type = receiver?.artifactType === SequenceArtifact.lifeline ? lifelineTypeName(receiver.label) : null;
          const classifier = type ? classifiers.get(normalizeName(type)) : undefined;
          if (!call || !classifier) return [];
          if (classifierOperations(classifier).some((operation) => normalizeName(operation) === normalizeName(call))) return [];
          return [issue(messageWithoutOperation, {
            message: `«${call}()» se envía a «${nodeName(classifier)}», pero esa clase no declara la operación.`,
            suggestion: `Agrega «+${call}()» a la clase «${nodeName(classifier)}» o corrige el nombre del mensaje.`,
            elements: [{ diagramId: diagram.id, elementId: edge.id, kind: 'edge' }],
          })];
        }));
  },
};

/**
 * Mismo concepto, distinta escritura. Clases, componentes, actores y tipos de
 * líneas de vida que solo difieren en mayúsculas, tildes o espacios son, casi
 * siempre, el mismo concepto escrito de dos formas.
 */
export const inconsistentName: ProjectRule = {
  id: 'project.inconsistent-name',
  severity: 'warning',
  title: 'Mismo concepto, distinta escritura',
  explanation: 'Si «Préstamo» y «Prestamo» son lo mismo, escribirlos distinto rompe las búsquedas, la trazabilidad y la lectura. Elige una forma y úsala en todos los diagramas.',
  check(snapshot) {
    const groups = new Map<string, { spellings: Set<string>; elements: TraceEndpoint[] }>();
    const add = (diagram: Diagram, node: DiagramNode, name: string | null) => {
      const key = name ? normalizeName(name) : '';
      if (!key) return;
      const group = groups.get(key) ?? { spellings: new Set(), elements: [] };
      group.spellings.add(name!.trim());
      group.elements.push(nodeEndpoint(diagram, node));
      groups.set(key, group);
    };
    for (const diagram of snapshot.diagrams) {
      for (const node of diagram.nodes) {
        if (diagram.diagramType === 'class' && CLASSIFIER_TYPES.has(node.artifactType)) add(diagram, node, nodeName(node, ''));
        else if (diagram.diagramType === 'component' && node.artifactType === ComponentArtifact.component) add(diagram, node, nodeName(node, ''));
        else if (diagram.diagramType === 'usecase' && node.artifactType === UseCaseArtifact.actor) add(diagram, node, nodeName(node, ''));
        else if (diagram.diagramType === 'sequence' && node.artifactType === SequenceArtifact.actor) add(diagram, node, nodeName(node, ''));
        else if (diagram.diagramType === 'sequence' && node.artifactType === SequenceArtifact.lifeline) add(diagram, node, lifelineTypeName(node.label));
      }
    }
    return [...groups.values()]
      .filter((group) => group.spellings.size > 1)
      .map((group) => {
        const spellings = [...group.spellings].map((spelling) => `«${spelling}»`).join(', ');
        return issue(inconsistentName, {
          message: `${spellings} parecen el mismo concepto escrito de formas distintas.`,
          suggestion: 'Elige una escritura y úsala igual en todos los diagramas.',
          elements: group.elements,
        });
      });
  },
};

/**
 * Enlace a un diagrama que no está. Un nodo (p. ej. una acción de subproceso)
 * apunta a un diagrama que se borró o que no pertenece al proyecto.
 */
export const brokenDiagramLink: ProjectRule = {
  id: 'project.broken-diagram-link',
  severity: 'warning',
  title: 'Subproceso que no está en el proyecto',
  explanation: 'El ⋔ promete que el detalle está en otro diagrama. Si ese diagrama ya no está en el proyecto, el lector no puede seguir el proceso.',
  check(snapshot) {
    const present = new Set(snapshot.diagrams.map((diagram) => diagram.id));
    return snapshot.diagrams.flatMap((diagram) =>
      diagram.nodes
        .filter((node) => {
          const linked = readLinkedDiagramId(node);
          return linked !== null && !present.has(linked);
        })
        .map((node) => issue(brokenDiagramLink, {
          message: `«${nodeName(node)}» enlaza un diagrama que ya no está en el proyecto.`,
          suggestion: 'Selecciónalo y, en Propiedades, elige el diagrama que lo detalla o crea uno nuevo.',
          elements: [nodeEndpoint(diagram, node)],
        })));
  },
};

/** Acción de subproceso sin diagrama enlazado: el ⋔ promete un detalle que no existe. */
export const subprocessUnlinked: ProjectRule = {
  id: 'project.subprocess-unlinked',
  severity: 'info',
  title: 'Subproceso sin diagrama',
  explanation: 'Una acción de subproceso dice que su detalle está en otro diagrama. Enlázalo para poder abrirlo desde aquí y volver.',
  check(snapshot) {
    return ofType(snapshot, 'activity').flatMap((diagram) =>
      diagram.nodes
        .filter((node) => node.artifactType === ActivityArtifact.callBehavior && readLinkedDiagramId(node) === null)
        .map((node) => issue(subprocessUnlinked, {
          message: `El subproceso «${nodeName(node)}» no tiene un diagrama que lo detalle.`,
          suggestion: 'Selecciónalo y, en Propiedades, elige su diagrama o créalo con un clic.',
          elements: [nodeEndpoint(diagram, node)],
        })));
  },
};

/** Decisiones a las que se llega desde `nodeId` sin más pasos que fusiones: las que deciden sobre su resultado. */
function decisionsAfter(diagram: Diagram, nodeId: string): DiagramNode[] {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const found: DiagramNode[] = [];
  const seen = new Set<string>([nodeId]);
  const pending = [nodeId];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const edge of diagram.edges.filter((candidate) => candidate.sourceId === current)) {
      const target = byId.get(edge.targetId);
      if (!target || seen.has(target.id)) continue;
      seen.add(target.id);
      if (target.artifactType === ActivityArtifact.merge) pending.push(target.id);
      else if (target.artifactType === ActivityArtifact.decision && diagram.edges.filter((out) => out.sourceId === target.id).length > 1) found.push(target);
    }
  }
  return found;
}

const exitGuard = (edge: Pick<DiagramEdge, 'guard' | 'label'>) => edge.guard?.trim() || edge.label.trim();

/**
 * Resultado del subproceso sin camino. Cuando una decisión sigue a un
 * subproceso, decide sobre cómo terminó: sus salidas deben llamarse como los
 * finales del subproceso. Si los finales no tienen nombre, el lector (y el
 * recorrido) no sabe qué resultado trae; si un final no tiene salida, ese
 * resultado queda sin camino. Las reglas de coincidencia son las del recorrido.
 */
export const subprocessOutcomeUnmatched: ProjectRule = {
  id: 'project.subprocess-outcome-unmatched',
  severity: 'info',
  title: 'Resultado del subproceso sin camino',
  explanation: 'Un subproceso que puede terminar de varias formas devuelve su resultado con el nombre de cada final («Sin ejemplares»). La decisión que lo sigue debe tener una salida para cada resultado, con la misma palabra en la guarda, o una [else]. Así el proceso no vuelve a preguntar lo que el subproceso ya resolvió.',
  check(snapshot) {
    const byId = new Map(snapshot.diagrams.map((diagram) => [diagram.id, diagram]));
    return ofType(snapshot, 'activity').flatMap((diagram) =>
      diagram.nodes
        .filter((node) => node.artifactType === ActivityArtifact.callBehavior)
        .flatMap((call) => {
          const sub = byId.get(readLinkedDiagramId(call) ?? '');
          if (!sub || sub.diagramType !== 'activity') return [];
          const finals = sub.nodes.filter((node) => node.artifactType === ActivityArtifact.activityFinal);
          const outcomes = [...new Set(finals.map((node) => node.label.trim()).filter(Boolean))];
          return decisionsAfter(diagram, call.id).flatMap((decision): ProjectIssue[] => {
            const guards = diagram.edges.filter((edge) => edge.sourceId === decision.id).map(exitGuard);
            const question = nodeName(decision, 'sin pregunta');
            const elements = [nodeEndpoint(diagram, decision), ...finals.map((node) => nodeEndpoint(sub, node))];
            if (outcomes.length === 0) {
              return [{
                ruleId: subprocessOutcomeUnmatched.id,
                severity: 'info',
                message: `La decisión «${question}» sigue a «${nodeName(call)}», pero los finales de «${sub.name}» no tienen nombre: no se sabe qué resultado trae.`,
                suggestion: `Nombra cada final de «${sub.name}» como la guarda que le corresponde${guards.some(Boolean) ? ` (${guards.filter(Boolean).map((guard) => `«${guard}»`).join(', ')})` : ''}.`,
                elements,
              }];
            }
            if (guards.some(isElseGuard)) return [];
            const orphan = outcomes.filter((outcome) => !guards.some((guard) => answersMatch(guard, outcome)));
            return orphan.length === 0 ? [] : [{
              ruleId: subprocessOutcomeUnmatched.id,
              severity: 'warning',
              message: `«${sub.name}» puede terminar en ${orphan.map((outcome) => `«${outcome}»`).join(', ')}, pero la decisión «${question}» no tiene salida para ${orphan.length > 1 ? 'esos resultados' : 'ese resultado'}.`,
              suggestion: 'Agrega la salida con esa guarda, renombra la guarda o el final para que coincidan, o usa [else].',
              elements,
            }];
          });
        }));
  },
};

/**
 * Requisito sin cubrir: ningún diagrama ni elemento lo cumple. Si ya está
 * aprobado o implementado, es una advertencia; si solo está propuesto, una
 * sugerencia. Los descartados no se revisan.
 */
export const requirementUncovered: ProjectRule = {
  id: 'project.requirement-uncovered',
  severity: 'warning',
  title: 'Requisito sin cubrir',
  explanation: 'Un requisito que ningún diagrama cumple es una promesa sin diseño: o falta modelarlo, o falta vincularlo con lo que ya lo resuelve.',
  check(snapshot) {
    const coverage = requirementCoverage(snapshot.requirements ?? [], snapshot.requirementLinks ?? [], snapshot.diagrams);
    return coverage
      .filter((item) => !item.covered && item.requirement.status !== 'descartado')
      .map((item) => ({
        ruleId: requirementUncovered.id,
        severity: item.requirement.status === 'propuesto' ? 'info' : 'warning',
        message: `${item.requirement.code} «${item.requirement.title}» no lo cumple ningún diagrama.`,
        suggestion: 'Vincúlalo (Requisitos o pestaña Vínculos) con el diagrama o el elemento que lo resuelve.',
        elements: [],
      }));
  },
};

/** Vínculo de requisito roto: apunta a un elemento o diagrama que ya no está. */
export const brokenRequirementLink: ProjectRule = {
  id: 'project.broken-requirement-link',
  severity: 'warning',
  title: 'Vínculo de requisito roto',
  explanation: 'El requisito dice que lo cumple algo que ya se borró: la cobertura que muestra no es real.',
  check(snapshot) {
    const requirements = snapshot.requirements ?? [];
    return (snapshot.requirementLinks ?? [])
      .filter((link) => !isLinkAlive(link, snapshot.diagrams))
      .map((link) => {
        const requirement = requirements.find((item) => item.id === link.requirementId);
        return issue(brokenRequirementLink, {
          message: `${requirement?.code ?? 'Un requisito'} apunta a un elemento que ya no existe.`,
          suggestion: 'Quita el vínculo o vuelve a vincularlo con lo que hoy lo cumple.',
          elements: [],
          fix: { label: 'Quitar el vínculo', apply: ({ requirementLinks }) => ({ requirementLinks: requirementLinks.filter((candidate) => candidate.id !== link.id) }) },
        });
      });
  },
};

/** Reglas de proyecto, en el orden en que se muestran dentro de cada gravedad. */
export const projectRules: readonly ProjectRule[] = [
  brokenTraceLink, brokenDiagramLink, brokenRequirementLink, messageWithoutOperation, inconsistentName, requirementUncovered, lifelineWithoutType, subprocessUnlinked, subprocessOutcomeUnmatched, useCaseNotDetailed,
];
