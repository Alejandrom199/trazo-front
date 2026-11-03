import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/** Proyecto Biblioteca Digital: colaboración completa al solicitar un préstamo. */
const b = createSequenceTemplateBuilder();
const HEIGHT = 520;

const student = b.participant(S.actor, 'Estudiante', 0, HEIGHT);
const portal = b.participant(S.lifeline, ':PortalBiblioteca', 190, HEIGHT);
const catalog = b.participant(S.lifeline, ':Catálogo', 380, HEIGHT);
const loans = b.participant(S.lifeline, ':ServicioPréstamos', 570, HEIGHT);
const notifications = b.participant(S.lifeline, ':Notificaciones', 760, HEIGHT);

b.activation(portal, 90, 455);
b.activation(catalog, 130, 205);
b.activation(loans, 245, 405);
b.activation(notifications, 365, 405);

b.message(S.syncMessage, student, portal, 'solicitarPréstamo(isbn)', 90);
b.message(S.syncMessage, portal, catalog, 'consultarDisponibilidad(isbn)', 130);
b.message(S.replyMessage, catalog, portal, 'ejemplar disponible', 190);
b.message(S.syncMessage, portal, loans, 'crearPréstamo(estudiante, ejemplar)', 245);
b.message(S.replyMessage, loans, portal, 'préstamo confirmado', 325);
b.message(S.asyncMessage, loans, notifications, 'notificarConfirmación(préstamo)', 365);
b.message(S.replyMessage, portal, student, 'mostrar fecha de devolución', 445);

export const libraryLoanSequenceTemplate = b.build({
  id: 'sequence.library-loan',
  name: 'Préstamo en Biblioteca Digital',
  description: 'El estudiante solicita el préstamo; el portal consulta el catálogo, delega la creación al servicio de préstamos y este avisa a notificaciones.',
  difficulty: 'básico',
  learningGoals: [S.actor, S.lifeline, S.syncMessage, S.asyncMessage, S.replyMessage, S.activation],
});
