import { CANVAS_VIEW_ROLE_KEY, LINKED_TEMPLATE_ID_KEY } from '@/core/model';
import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

const primary = { [CANVAS_VIEW_ROLE_KEY]: 'primary' };
const alternative = { [CANVAS_VIEW_ROLE_KEY]: 'alternative' };
const integration = { [CANVAS_VIEW_ROLE_KEY]: 'integration' };

const b = createSequenceTemplateBuilder();
const HEIGHT = 880;
const customer = b.participant(S.actor, 'Cliente', 0, HEIGHT, primary);
const checkout = b.participant(S.lifeline, ':Checkout', 220, HEIGHT, { ...primary, [LINKED_TEMPLATE_ID_KEY]: 'activity.resilient-fulfillment' });
const inventory = b.participant(S.lifeline, ':Inventario', 440, HEIGHT, primary);
const payment = b.participant(S.lifeline, ':Pagos', 660, HEIGHT, integration);
const bank = b.participant(S.lifeline, 'Banco externo', 880, HEIGHT, integration);
const notifier = b.participant(S.lifeline, ':Notificador', 1100, HEIGHT, integration);

b.activation(checkout, 90, 820);
b.activation(payment, 250, 440);
b.message(S.syncMessage, customer, checkout, 'confirmarCompra()', 90, primary);
b.message(S.syncMessage, checkout, inventory, 'reservar(productos)', 145, primary);
b.message(S.replyMessage, inventory, checkout, 'reserva', 195, primary);
b.message(S.syncMessage, checkout, payment, 'cobrar(total)', 250, integration);
b.fragment(S.loopFragment, 'máximo 3 intentos', { x: 600, y: 270, width: 460, height: 125 }, undefined, alternative);
b.message(S.syncMessage, payment, bank, 'autorizar(importe)', 310, integration);
b.message(S.replyMessage, bank, payment, 'resultado', 360, integration);
b.fragment(S.altFragment, 'pago aprobado | pago rechazado', { x: 160, y: 410, width: 1060, height: 430 }, 620, alternative);
b.message(S.replyMessage, payment, checkout, 'aprobado', 445, primary);
b.fragment(S.parFragment, 'confirmar y notificar', { x: 380, y: 475, width: 840, height: 130 }, 540, primary);
b.message(S.asyncMessage, checkout, inventory, 'confirmarReserva()', 505, primary);
b.message(S.asyncMessage, checkout, notifier, 'enviarConfirmación()', 565, integration);
b.message(S.replyMessage, checkout, customer, 'pedido confirmado', 610, primary);
b.message(S.replyMessage, payment, checkout, 'rechazado', 665, alternative);
b.message(S.asyncMessage, checkout, inventory, 'liberarReserva()', 715, alternative);
b.message(S.asyncMessage, checkout, notifier, 'informarRechazo()', 765, alternative);
b.message(S.replyMessage, checkout, customer, 'pago rechazado', 815, alternative);

export const resilientPaymentTemplate = b.build({
  id: 'sequence.resilient-payment',
  name: 'Pago con reintento y compensación',
  description: 'Combina reintentos con un banco externo, caminos alternativos, confirmación paralela y liberación asíncrona de la reserva cuando el cobro falla.',
  difficulty: 'avanzado',
  learningGoals: [S.loopFragment, S.altFragment, S.parFragment, S.syncMessage, S.asyncMessage, S.replyMessage],
});
