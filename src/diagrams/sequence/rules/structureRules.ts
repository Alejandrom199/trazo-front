import type { DiagramNode } from '@/core/model';
import { SequenceArtifact as S } from '../artifactTypes';
import { isInside } from '../sequenceModel';
import { defineRule } from './defineRule';

/** Regla: todo participante envía o recibe algún mensaje. */
export const participantIdle = defineRule(
  {
    id: 'sequence.participant-idle',
    severity: 'warning',
    title: 'Participante sin mensajes',
    explanation: 'Un participante que no envía ni recibe nada no forma parte de la conversación: sobra o falta dibujar sus mensajes.',
  },
  (model) =>
    model.participants
      .filter((participant) => !model.messages.some(({ edge }) => edge.sourceId === participant.id || edge.targetId === participant.id))
      .map((participant) => ({
        message: `«${participant.label.trim() || 'Participante sin nombre'}» no envía ni recibe mensajes.`,
        suggestion: 'Arrastra desde su línea hasta la de otro participante para crear un mensaje, o quítalo.',
        nodeIds: [participant.id],
      })),
);

/** Regla: cada participante aparece una sola vez. */
export const participantDuplicate = defineRule(
  {
    id: 'sequence.participant-duplicate',
    severity: 'warning',
    title: 'Participante repetido',
    explanation: 'Dos líneas de vida con el mismo nombre parecen dos objetos distintos; quien lo lee no sabe si son el mismo.',
  },
  (model) => {
    const byName = new Map<string, DiagramNode[]>();
    for (const participant of model.participants) {
      const name = participant.label.trim().toLowerCase();
      if (name) byName.set(name, [...(byName.get(name) ?? []), participant]);
    }
    return [...byName.values()]
      .filter((group) => group.length > 1)
      .map((group) => ({
        message: `«${group[0]!.label.trim()}» aparece ${group.length} veces.`,
        suggestion: 'Usa una sola línea de vida por participante y envía todos sus mensajes desde ella.',
        nodeIds: group.map((participant) => participant.id),
      }));
  },
);

/** Regla: activaciones y destrucciones van sobre una línea de vida. */
export const occurrenceLoose = defineRule(
  {
    id: 'sequence.occurrence-loose',
    severity: 'warning',
    title: 'Activación o destrucción suelta',
    explanation: 'Una barra de activación o una X siempre pertenecen a un participante: sueltas no dicen de quién son.',
  },
  (_model, diagram) =>
    diagram.nodes
      .filter((node) => (node.artifactType === S.activation || node.artifactType === S.destruction) && node.parentId === null)
      .map((node) => ({
        message:
          node.artifactType === S.activation
            ? 'Hay una barra de activación fuera de una línea de vida.'
            : 'Hay una destrucción fuera de una línea de vida.',
        suggestion: 'Arrástrala sobre la línea de vida del participante: quedará centrada en ella.',
        nodeIds: [node.id],
      })),
);

/** Regla: alt, opt y loop dicen cuándo ocurren. */
export const fragmentGuardMissing = defineRule(
  {
    id: 'sequence.fragment-guard-missing',
    severity: 'warning',
    title: 'Fragmento sin guarda',
    explanation: 'La guarda dice cuándo ocurre (alt, opt) o cuándo se repite (loop) el tramo; sin ella no se sabe.',
  },
  (model) =>
    model.fragments
      .filter(({ node }) => node.artifactType !== S.parFragment && !node.label.trim())
      .map(({ node }) => ({
        message: 'Hay un fragmento sin guarda.',
        suggestion: 'Haz doble clic en el marco y escribe la condición, p. ej. «stock disponible».',
        nodeIds: [node.id],
      })),
);

/** Regla: un fragmento encierra al menos un mensaje. */
export const fragmentEmpty = defineRule(
  {
    id: 'sequence.fragment-empty',
    severity: 'warning',
    title: 'Fragmento vacío',
    explanation: 'Un fragmento combinado afecta a los mensajes que encierra; vacío no dice nada.',
  },
  (model) =>
    model.fragments
      .filter((fragment) => !model.messages.some((message) => isInside(model, message, fragment)))
      .map((fragment) => ({
        message: 'Hay un fragmento que no encierra ningún mensaje.',
        suggestion: 'Agrándalo o muévelo para que cubra los mensajes a los que afecta.',
        nodeIds: [fragment.node.id],
      })),
);
