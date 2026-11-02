import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/**
 * Cierre de sesión: la sesión se invalida y se destruye; después, dos tareas
 * ocurren a la vez (registrar la salida y limpiar la caché).
 */
const b = createSequenceTemplateBuilder();
const HEIGHT = 440;

const user = b.participant(S.actor, 'Usuario', 0, HEIGHT);
const app = b.participant(S.lifeline, ':Aplicación', 200, HEIGHT);
const session = b.participant(S.lifeline, ':Sesión', 400, 240);
const log = b.participant(S.lifeline, ':Registro', 600, HEIGHT);

b.activation(app, 100, 390);
b.activation(session, 140, 180);

b.message(S.syncMessage, user, app, 'cerrarSesión()', 100);
b.message(S.syncMessage, app, session, 'invalidar()', 140);
b.message(S.replyMessage, session, app, 'invalidada', 180);
b.destruction(session, 215);

b.fragment(S.parFragment, '', { x: 150, y: 240, width: 590, height: 110 }, 290);
b.message(S.asyncMessage, app, log, 'anotarSalida(usuario)', 270);
b.message(S.syncMessage, app, app, 'limpiarCaché()', 310);
b.message(S.replyMessage, app, user, 'sesión cerrada', 380);

b.note('La sesión deja de existir: nadie puede volver a usarla.', { x: 450, y: 130, width: 140, height: 70 }, session);

export const logoutSequenceTemplate = b.build({
  id: 'sequence.logout',
  name: 'Cierre de sesión',
  description: 'La aplicación invalida la sesión, que se destruye. Luego registra la salida y limpia la caché en paralelo.',
  difficulty: 'intermedio',
  learningGoals: [S.destruction, S.parFragment, S.asyncMessage, S.note],
});
