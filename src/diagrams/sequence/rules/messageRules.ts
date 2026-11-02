import { absolutePosition } from '@/core/model';
import { SequenceArtifact as S } from '../artifactTypes';
import { nameOf, type TimedMessage } from '../sequenceModel';
import { defineRule } from './defineRule';

const touches = (message: TimedMessage, participantId: string) =>
  message.edge.sourceId === participantId || message.edge.targetId === participantId;

const messageName = (message: TimedMessage) => message.edge.label.trim() || 'sin nombre';

/** Regla: todo mensaje (salvo una respuesta) dice qué se pide. */
export const messageUnnamed = defineRule(
  {
    id: 'sequence.message-unnamed',
    severity: 'warning',
    title: 'Mensaje sin nombre',
    explanation: 'Un mensaje sin nombre no dice qué se pide: el diagrama deja de contar la conversación.',
  },
  (model) =>
    model.messages
      .filter(({ edge }) => edge.artifactType !== S.replyMessage && !edge.label.trim())
      .map(({ edge }) => ({
        message: 'Hay un mensaje sin nombre.',
        suggestion: 'Haz doble clic sobre la flecha y escribe la operación, p. ej. «validar(usuario)».',
        edgeIds: [edge.id],
      })),
);

/** Regla: una respuesta contesta a una llamada síncrona anterior en sentido contrario. */
export const replyWithoutCall = defineRule(
  {
    id: 'sequence.reply-without-call',
    severity: 'warning',
    title: 'Respuesta sin llamada',
    explanation: 'Una respuesta devuelve el control a quien llamó; si nadie llamó antes, no hay nada que responder.',
  },
  (model, diagram) =>
    model.messages
      .filter(
        ({ edge, y }) =>
          edge.artifactType === S.replyMessage &&
          !model.messages.some(
            (call) =>
              call.y < y &&
              call.edge.artifactType === S.syncMessage &&
              call.edge.sourceId === edge.targetId &&
              call.edge.targetId === edge.sourceId,
          ),
      )
      .map(({ edge }) => ({
        message: `«${nameOf(diagram, edge.sourceId)}» responde a «${nameOf(diagram, edge.targetId)}», pero antes no hay una llamada síncrona en sentido contrario.`,
        suggestion: 'Agrega más arriba el mensaje síncrono que origina esta respuesta, o cambia el tipo de este mensaje.',
        edgeIds: [edge.id],
      })),
);

/** Regla (informativa): una llamada síncrona entre dos participantes suele tener respuesta. */
export const callWithoutReply = defineRule(
  {
    id: 'sequence.call-without-reply',
    severity: 'info',
    title: 'Llamada sin respuesta',
    explanation:
      'En una llamada síncrona el emisor se queda esperando. Dibujar la respuesta deja claro qué devuelve y cuándo termina la espera. Puede omitirse si no aporta.',
  },
  (model, diagram) =>
    model.messages
      .filter(
        ({ edge, y }) =>
          edge.artifactType === S.syncMessage &&
          edge.sourceId !== edge.targetId &&
          !model.messages.some(
            (reply) =>
              reply.y > y &&
              reply.edge.artifactType === S.replyMessage &&
              reply.edge.sourceId === edge.targetId &&
              reply.edge.targetId === edge.sourceId,
          ),
      )
      .map((message) => ({
        message: `La llamada «${messageName(message)}» de «${nameOf(diagram, message.edge.sourceId)}» no tiene respuesta.`,
        suggestion: 'Si el resultado importa, agrega debajo un mensaje de respuesta en sentido contrario. Si el emisor no espera, hazlo asíncrono.',
        edgeIds: [message.edge.id],
      })),
);

/** Regla: nadie envía ni recibe mensajes después de su destrucción. */
export const messageAfterDestruction = defineRule(
  {
    id: 'sequence.message-after-destruction',
    severity: 'error',
    title: 'Mensaje después de la destrucción',
    explanation: 'Un participante destruido ya no existe: no puede enviar ni recibir mensajes por debajo de su X.',
  },
  (model, diagram) =>
    model.destructions.flatMap((destruction) =>
      model.messages
        .filter((message) => message.y > destruction.y && touches(message, destruction.lifelineId))
        .map(({ edge }) => ({
          message: `«${nameOf(diagram, destruction.lifelineId)}» recibe o envía un mensaje después de ser destruido.`,
          suggestion: 'Sube el mensaje por encima de la X, o baja la destrucción.',
          nodeIds: [destruction.node.id],
          edgeIds: [edge.id],
        })),
    ),
);

/** Regla: el mensaje de creación es el primero que toca al participante creado. */
export const createNotFirst = defineRule(
  {
    id: 'sequence.create-not-first',
    severity: 'error',
    title: 'Creación que no es lo primero',
    explanation: 'Un participante no existe antes de ser creado: ningún mensaje puede tocarlo por encima de su creación.',
  },
  (model, diagram) =>
    model.messages
      .filter(
        ({ edge, y }) =>
          edge.artifactType === S.createMessage &&
          model.messages.some((other) => other.y < y && other.edge.id !== edge.id && touches(other, edge.targetId)),
      )
      .map(({ edge }) => ({
        message: `«${nameOf(diagram, edge.targetId)}» participa en mensajes antes de ser creado.`,
        suggestion: 'Sube el mensaje de creación para que sea el primero que toca a ese participante.',
        edgeIds: [edge.id],
      })),
);

/** Regla: los mensajes ocurren mientras existen las líneas de vida (no por debajo de su final). */
export const messageBeyondLifeline = defineRule(
  {
    id: 'sequence.message-beyond-lifeline',
    severity: 'warning',
    title: 'Mensaje fuera de la línea de vida',
    explanation:
      'La línea discontinua es el tiempo de vida del participante: un mensaje por debajo de su final no se lee como parte de la conversación.',
  },
  (model, diagram) =>
    model.messages
      .filter(({ edge, y }) =>
        [edge.sourceId, edge.targetId].some((id) => {
          const node = diagram.nodes.find((candidate) => candidate.id === id);
          return node ? y > absolutePosition(diagram, node).y + node.size.height : false;
        }),
      )
      .map((message) => ({
        message: `El mensaje «${messageName(message)}» queda por debajo del final de una línea de vida.`,
        suggestion: 'Alarga la línea de vida (arrastra su borde inferior) o sube el mensaje.',
        edgeIds: [message.edge.id],
      })),
);
