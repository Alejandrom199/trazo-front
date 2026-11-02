import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/**
 * Inicio de sesión: llamadas síncronas con sus respuestas, activaciones anidadas
 * y un alt con el camino feliz y el de error.
 */
const b = createSequenceTemplateBuilder();
const HEIGHT = 470;

const user = b.participant(S.actor, 'Usuario', 0, HEIGHT);
const screen = b.participant(S.lifeline, ':PantallaDeAcceso', 200, HEIGHT);
const auth = b.participant(S.lifeline, ':ServicioAuth', 400, HEIGHT);
const database = b.participant(S.lifeline, ':BaseDeDatos', 600, HEIGHT);

b.activation(screen, 100, 410);
b.activation(auth, 140, 380);
b.activation(database, 180, 220);

b.message(S.syncMessage, user, screen, 'iniciarSesión(usuario, clave)', 100);
b.message(S.syncMessage, screen, auth, 'validar(usuario, clave)', 140);
b.message(S.syncMessage, auth, database, 'buscarUsuario(usuario)', 180);
b.message(S.replyMessage, database, auth, 'datos del usuario', 220);

b.fragment(S.altFragment, 'credenciales válidas', { x: -10, y: 245, width: 540, height: 185 }, 340);
b.message(S.replyMessage, auth, screen, 'usuario válido', 280);
b.message(S.replyMessage, screen, user, 'mostrar inicio', 310);
b.message(S.replyMessage, auth, screen, 'credenciales inválidas', 370);
b.message(S.replyMessage, screen, user, 'mostrar error', 400);

export const loginSequenceTemplate = b.build({
  id: 'sequence.login',
  name: 'Inicio de sesión',
  description: 'Un usuario inicia sesión: la pantalla valida con el servicio, que consulta la base de datos. Un alt separa el acceso del error.',
  difficulty: 'básico',
  learningGoals: [S.actor, S.lifeline, S.syncMessage, S.replyMessage, S.activation, S.altFragment],
});
