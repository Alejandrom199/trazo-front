import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/** Básico: una consulta de ida y vuelta, con llamadas anidadas y sus respuestas. */
const b = createSequenceTemplateBuilder();
const HEIGHT = 300;

const customer = b.participant(S.actor, 'Cliente', 0, HEIGHT);
const app = b.participant(S.lifeline, ':AppBanco', 200, HEIGHT);
const accounts = b.participant(S.lifeline, ':ServicioCuentas', 400, HEIGHT);

b.activation(app, 100, 220);
b.activation(accounts, 140, 180);

b.message(S.syncMessage, customer, app, 'consultarSaldo()', 100);
b.message(S.syncMessage, app, accounts, 'obtenerSaldo(cuenta)', 140);
b.message(S.replyMessage, accounts, app, 'saldo', 180);
b.message(S.replyMessage, app, customer, 'mostrar saldo', 220);

export const balanceSequenceTemplate = b.build({
  id: 'sequence.balance',
  name: 'Consulta de saldo',
  description: 'El cliente pide su saldo a la app, que lo consulta al servicio de cuentas y se lo muestra. Cada llamada tiene su respuesta.',
  difficulty: 'básico',
  learningGoals: [S.actor, S.lifeline, S.syncMessage, S.replyMessage, S.activation],
});
