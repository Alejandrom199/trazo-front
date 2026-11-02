import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/**
 * Compra en línea: un bucle sobre los productos, la creación del pedido, un paso
 * opcional (factura) y una notificación asíncrona.
 */
const b = createSequenceTemplateBuilder();
const HEIGHT = 520;

const customer = b.participant(S.actor, 'Cliente', 0, HEIGHT);
const cart = b.participant(S.lifeline, ':Carrito', 200, HEIGHT);
const order = b.participant(S.lifeline, ':Pedido', 400, HEIGHT);
const payment = b.participant(S.lifeline, ':ServicioPago', 600, HEIGHT);
const notifier = b.participant(S.lifeline, ':Notificador', 800, HEIGHT);

b.activation(cart, 100, 470);
b.activation(payment, 260, 300);
b.activation(order, 350, 380);

b.message(S.syncMessage, customer, cart, 'confirmarCompra()', 100);
b.fragment(S.loopFragment, 'para cada producto', { x: 150, y: 120, width: 200, height: 75 });
b.message(S.syncMessage, cart, cart, 'sumarSubtotal(producto)', 150);
b.message(S.createMessage, cart, order, 'create(productos)', 220);
b.message(S.syncMessage, cart, payment, 'cobrar(total)', 260);
b.message(S.replyMessage, payment, cart, 'aprobado', 300);
b.fragment(S.optFragment, 'el cliente pidió factura', { x: 150, y: 320, width: 390, height: 80 });
b.message(S.syncMessage, cart, order, 'generarFactura()', 350);
b.message(S.replyMessage, order, cart, 'factura', 380);
b.message(S.asyncMessage, order, notifier, 'enviarConfirmación(correo)', 420);
b.message(S.replyMessage, cart, customer, 'pedido confirmado', 460);

export const checkoutSequenceTemplate = b.build({
  id: 'sequence.checkout',
  name: 'Compra en línea',
  description: 'El carrito suma cada producto, crea el pedido, cobra y, si se pidió, genera la factura. La confirmación se envía sin esperar.',
  difficulty: 'intermedio',
  learningGoals: [S.createMessage, S.asyncMessage, S.loopFragment, S.optFragment, S.syncMessage],
});
