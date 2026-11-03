import { addNodeBeside, anchorNoteFix, connectNodes, nearestNode, relabelEdges, type Diagram, type DiagramNode, type ValidationIssue, type ValidationRule } from '@/core/model';
import { StateArtifact as S, STATE_TYPES } from './artifactTypes';
import { stateNodeKinds } from './nodeKinds';

type RuleMeta = Omit<ValidationRule, 'diagramType' | 'check'>;
type Found = Omit<ValidationIssue, 'ruleId' | 'severity' | 'nodeIds' | 'edgeIds'> & { nodeIds?: string[]; edgeIds?: string[] };

/** Crea una regla: describe lo que encontró; id y gravedad los pone este envoltorio. */
function rule(meta: RuleMeta, find: (diagram: Diagram) => Found[]): ValidationRule {
  return {
    ...meta,
    diagramType: 'state',
    check: (diagram) =>
      diagram.nodes.length === 0 ? [] : find(diagram).map((found) => ({ ruleId: meta.id, severity: meta.severity, nodeIds: [], edgeIds: [], ...found })),
  };
}

const name = (node: DiagramNode | undefined) => `«${node?.label.trim() || 'sin nombre'}»`;
const transitions = (diagram: Diagram) => diagram.edges.filter((edge) => edge.artifactType === S.transition);
const outgoing = (diagram: Diagram, id: string) => transitions(diagram).filter((edge) => edge.sourceId === id);
const ofType = (diagram: Diagram, type: string) => diagram.nodes.filter((node) => node.artifactType === type);

/**
 * Estados a los que se puede llegar desde el estado inicial de primer nivel.
 * Llegar a un estado compuesto activa su inicial y su historia; llegar a un
 * subestado activa también a sus contenedores (y con ellos sus salidas).
 */
export function reachableFrom(diagram: Diagram): Set<string> {
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const reached = new Set<string>();
  const pending = ofType(diagram, S.initial).filter((node) => node.parentId === null).map((node) => node.id);
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    const node = byId.get(id);
    if (node?.parentId) pending.push(node.parentId);
    for (const child of diagram.nodes.filter((candidate) => candidate.parentId === id)) {
      if (child.artifactType === S.initial || child.artifactType === S.history) pending.push(child.id);
    }
    for (const edge of outgoing(diagram, id)) pending.push(edge.targetId);
  }
  return reached;
}

/** Regla: todo estado tiene nombre. */
const unnamed = rule(
  { id: 'state.unnamed', severity: 'warning', title: 'Estado sin nombre', explanation: 'Un estado sin nombre no dice en qué situación está el objeto.' },
  (diagram) =>
    diagram.nodes
      .filter((node) => STATE_TYPES.has(node.artifactType) && !node.label.trim())
      .map((node) => ({ message: 'Hay un estado sin nombre.', suggestion: 'Haz doble clic y nómbralo con un adjetivo o participio: «Pagado», «En revisión».', nodeIds: [node.id] })),
);

/** Regla: la máquina tiene un estado inicial en el primer nivel. */
const missingInitial = rule(
  { id: 'state.missing-initial', severity: 'error', title: 'Falta el estado inicial', explanation: 'Sin estado inicial no se sabe en qué estado empieza la máquina.' },
  (diagram) =>
    diagram.nodes.some((node) => STATE_TYPES.has(node.artifactType)) && !ofType(diagram, S.initial).some((node) => node.parentId === null)
      ? [{ message: 'La máquina no tiene estado inicial.', suggestion: 'Agrega un estado inicial (círculo negro) y únelo al primer estado.', fix: addInitialFix }]
      : [],
);

/** Regla: un solo estado inicial por nivel (la máquina o cada estado compuesto). */
const duplicateInitial = rule(
  { id: 'state.duplicate-initial', severity: 'error', title: 'Dos estados iniciales', explanation: 'Cada nivel empieza en un solo lugar: la máquina y cada estado compuesto tienen un único estado inicial.' },
  (diagram) => {
    const byParent = new Map<string | null, DiagramNode[]>();
    for (const node of ofType(diagram, S.initial)) byParent.set(node.parentId, [...(byParent.get(node.parentId) ?? []), node]);
    return [...byParent.values()]
      .filter((initials) => initials.length > 1)
      .map((initials) => ({ message: `Hay ${initials.length} estados iniciales en el mismo nivel.`, suggestion: 'Deja uno solo y une los demás caminos como transiciones.', nodeIds: initials.map((node) => node.id) }));
  },
);

/** Regla: el estado inicial lleva a algún estado. */
const initialWithoutExit = rule(
  { id: 'state.initial-without-exit', severity: 'warning', title: 'Estado inicial sin salida', explanation: 'El estado inicial señala el primer estado con una transición; sin ella no apunta a nada.' },
  (diagram) =>
    ofType(diagram, S.initial)
      .filter((node) => outgoing(diagram, node.id).length === 0)
      .map((node) => ({
        message: 'Un estado inicial no lleva a ningún estado.',
        suggestion: 'Arrastra desde el círculo negro hasta el primer estado.',
        nodeIds: [node.id],
        fix: {
          label: 'Unirlo al estado más cercano',
          apply: (current: Diagram, createId: () => string) => {
            const start = current.nodes.find((candidate) => candidate.id === node.id);
            const target = start && nearestNode(current, start, (candidate) => STATE_TYPES.has(candidate.artifactType) && candidate.parentId === start.parentId);
            return start && target ? connectNodes(current, start.id, target.id, S.transition, createId) : current;
          },
        },
      })),
);

/** Regla: se puede llegar a todos los estados desde el inicial. */
const unreachable = rule(
  { id: 'state.unreachable', severity: 'warning', title: 'Estado inalcanzable', explanation: 'Si ninguna transición lleva a un estado, el objeto nunca estará en él.' },
  (diagram) => {
    if (!ofType(diagram, S.initial).some((node) => node.parentId === null)) return [];
    const reached = reachableFrom(diagram);
    return diagram.nodes
      .filter((node) => (STATE_TYPES.has(node.artifactType) || node.artifactType === S.final) && !reached.has(node.id))
      .map((node) => ({ message: `No se puede llegar a ${node.artifactType === S.final ? 'un estado final' : name(node)}.`, suggestion: 'Agrega la transición que lleva hasta él, o bórralo si sobra.', nodeIds: [node.id] }));
  },
);

/** Regla (informativa): un estado sin salidas atrapa al objeto para siempre. */
const deadEnd = rule(
  { id: 'state.dead-end', severity: 'info', title: 'Estado sin salida', explanation: 'Un estado (que no es final) sin transiciones de salida deja al objeto ahí para siempre. A veces es lo que se quiere; casi siempre falta una flecha.' },
  (diagram) => {
    const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
    // Una salida del contenedor también saca a sus subestados.
    const canLeave = (node: DiagramNode | undefined): boolean => !!node && (outgoing(diagram, node.id).length > 0 || canLeave(byId.get(node.parentId ?? '')));
    return ofType(diagram, S.state)
      .filter((node) => !canLeave(node))
      .map((node) => ({
        message: `${name(node)} no tiene salidas.`,
        suggestion: '¿Qué evento lo hace cambiar? Agrega esa transición, o llévalo a un estado final si ahí termina.',
        nodeIds: [node.id],
        fix: {
          label: 'Llevarlo a un estado final',
          apply: (current: Diagram, createId: () => string) => {
            const state = current.nodes.find((candidate) => candidate.id === node.id);
            if (!state) return current;
            const added = addNodeBeside(current, state, 'right', { artifactType: S.final, size: stateNodeKinds[S.final]!.defaultSize }, createId);
            return connectNodes(added.diagram, state.id, added.id, S.transition, createId);
          },
        },
      }));
  },
);

/** Regla: una elección tiene al menos dos salidas, todas con guarda. */
const choiceGuards = rule(
  { id: 'state.choice-guards', severity: 'warning', title: 'Elección incompleta', explanation: 'Una elección reparte el camino según condiciones: necesita dos o más salidas y cada una con su guarda entre corchetes.' },
  (diagram) =>
    ofType(diagram, S.choice).flatMap((node) => {
      const exits = outgoing(diagram, node.id);
      const unguarded = exits.filter((edge) => !/\[.+\]/.test(edge.label));
      if (exits.length < 2) return [{ message: 'Una elección tiene menos de dos salidas.', suggestion: 'Agrega una salida por cada resultado posible, p. ej. «[aprobado]» y «[rechazado]».', nodeIds: [node.id] }];
      return unguarded.length > 0
        ? [
            {
              message: 'Una salida de la elección no tiene guarda.',
              suggestion: 'Escribe la condición entre corchetes en cada salida; usa «[else]» para el resto de casos.',
              nodeIds: [node.id],
              edgeIds: unguarded.map((edge) => edge.id),
              fix: { label: 'Poner guardas en sus salidas', apply: (current: Diagram) => relabelEdges(current, guardLabels(unguarded.map((edge) => edge.label))(unguarded.map((edge) => edge.id))) },
            },
          ]
        : [];
    }),
);

/**
 * Regla (informativa): las transiciones suelen decir qué evento las dispara.
 * No se avisa al llegar a un estado final: terminar al acabar lo que se hacía
 * (transición de finalización) es lo habitual.
 */
const transitionWithoutEvent = rule(
  { id: 'state.transition-without-event', severity: 'info', title: 'Transición sin evento', explanation: 'Sin evento, una transición ocurre en cuanto el estado termina lo que hace (transición de finalización). Es válido, pero casi siempre falta el evento.' },
  (diagram) => {
    const silentSources = new Set(diagram.nodes.filter((node) => node.artifactType === S.initial || node.artifactType === S.choice || node.artifactType === S.history).map((node) => node.id));
    const finals = new Set(ofType(diagram, S.final).map((node) => node.id));
    return transitions(diagram)
      .filter((edge) => !silentSources.has(edge.sourceId) && !finals.has(edge.targetId) && !edge.label.trim())
      .map((edge) => ({ message: 'Hay una transición sin evento.', suggestion: 'Haz doble clic sobre la flecha y escribe qué la dispara: «pagar», «cancelar», «tras 15 días».', edgeIds: [edge.id] }));
  },
);

/** Regla: la historia va dentro de un estado compuesto. */
const historyOutside = rule(
  { id: 'state.history-outside', severity: 'warning', title: 'Historia fuera de un estado compuesto', explanation: 'La historia recuerda el último subestado de un estado compuesto: fuera de uno no tiene qué recordar.' },
  (diagram) =>
    ofType(diagram, S.history)
      .filter((node) => diagram.nodes.find((candidate) => candidate.id === node.parentId)?.artifactType !== S.compositeState)
      .map((node) => ({ message: 'Una historia (H) está fuera de un estado compuesto.', suggestion: 'Arrástrala dentro del estado compuesto cuyo avance debe recordar.', nodeIds: [node.id] })),
);

/** Regla (informativa): toda nota se ancla a algo. */
const noteLoose = rule(
  { id: 'state.note-loose', severity: 'info', title: 'Nota sin anclar', explanation: 'Una nota suelta puede leerse como comentario de cualquier elemento.' },
  (diagram) =>
    ofType(diagram, S.note)
      .filter((node) => !diagram.edges.some((edge) => edge.artifactType === S.annotationLink && (edge.sourceId === node.id || edge.targetId === node.id)))
      .map((node) => ({ message: 'Hay una nota sin anclar.', suggestion: 'Únela al elemento que comenta.', nodeIds: [node.id], fix: anchorNoteFix(node.id, S.note, S.annotationLink) })),
);

/** Corrección: estado inicial a la izquierda del primer estado de primer nivel (el de más arriba a la izquierda). */
const addInitialFix = {
  label: 'Agregar el estado inicial',
  apply: (diagram: Diagram, createId: () => string): Diagram => {
    const first = diagram.nodes
      .filter((node) => node.parentId === null && STATE_TYPES.has(node.artifactType))
      .sort((a, b) => a.position.x + a.position.y - (b.position.x + b.position.y))[0];
    if (!first) return diagram;
    const added = addNodeBeside(diagram, first, 'left', { artifactType: S.initial, size: stateNodeKinds[S.initial]!.defaultSize }, createId);
    return connectNodes(added.diagram, added.id, first.id, S.transition, createId);
  },
};

/**
 * Guardas para las salidas de una elección que no la tienen: lo escrito se pone
 * entre corchetes; las vacías, «[condición]», y la última vacía, «[else]».
 */
function guardLabels(labels: string[]): (edgeIds: string[]) => Map<string, string> {
  const lastEmpty = labels.map((label) => label.trim()).lastIndexOf('');
  return (edgeIds) => new Map(edgeIds.map((id, index) => [id, labels[index]!.trim() ? `[${labels[index]!.trim()}]` : index === lastEmpty ? '[else]' : '[condición]']));
}

/** Todas las reglas, en el orden en que conviene leerlas. */
export const stateRules: ValidationRule[] = [
  missingInitial,
  duplicateInitial,
  initialWithoutExit,
  unnamed,
  unreachable,
  choiceGuards,
  historyOutside,
  deadEnd,
  transitionWithoutEvent,
  noteLoose,
];
