import { LINKED_TEMPLATE_ID_KEY } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';


const t = createTemplateBuilder();
const HEIGHT = 1270;
t.lane('Cliente', 0, 220, HEIGHT);
t.lane('Comercio', 220, 520, HEIGHT);
t.lane('Servicios externos', 740, 300, HEIGHT);

const start = t.node(A.initialNode, '', { x: 405, y: 75 });
const receive = t.node(A.action, 'Recibir pedido', { x: 405, y: 155 });
const order = t.node(A.objectNode, 'Pedido [pendiente]', { x: 405, y: 245 }, { width: 165, height: 50 });
const fork = t.node(A.fork, '', { x: 405, y: 310 }, { width: 250, height: 12 });
const reserve = t.node(A.action, 'Reservar inventario', { x: 330, y: 390 });
const authorize = t.node(A.action, 'Autorizar pago', { x: 890, y: 390 }, undefined, { [LINKED_TEMPLATE_ID_KEY]: 'sequence.resilient-payment' });
const join = t.node(A.join, '', { x: 405, y: 480 }, { width: 250, height: 12 });
const approved = t.node(A.decision, '¿Pago aprobado?', { x: 405, y: 555 });
// Cada rama sale por un lado distinto del rombo: [aprobado] hacia abajo, [rechazado] a la derecha.
const prepare = t.node(A.action, 'Preparar envío', { x: 405, y: 690 });
const dispatch = t.node(A.sendSignal, 'Solicitar despacho', { x: 405, y: 810 }, { width: 180, height: 56 });
const confirmation = t.node(A.acceptEvent, 'Entrega confirmada', { x: 110, y: 950 }, { width: 175, height: 56 });
const close = t.node(A.action, 'Cerrar pedido', { x: 405, y: 1070 });
const end = t.node(A.activityFinal, '', { x: 405, y: 1180 });
const release = t.node(A.action, 'Liberar inventario', { x: 640, y: 555 });
const notifyFailure = t.node(A.sendSignal, 'Notificar rechazo', { x: 640, y: 690 }, { width: 175, height: 56 });
const failed = t.node(A.flowFinal, '', { x: 640, y: 810 });

t.flow(start, receive, null);
t.flow(receive, order, null);
t.flow(order, fork, null);
t.flow(fork, reserve, null);
t.flow(fork, authorize, null);
t.flow(reserve, join, null);
t.flow(authorize, join, null);
t.flow(join, approved, null);
t.flow(approved, prepare, 'aprobado');
t.flow(approved, release, 'rechazado');
t.flow(release, notifyFailure, null);
t.flow(notifyFailure, failed, null);
t.flow(prepare, dispatch, null);
t.flow(dispatch, confirmation, null);
t.flow(confirmation, close, null);
t.flow(close, end, null);

export const resilientFulfillmentTemplate = t.build({
  id: 'activity.resilient-fulfillment',
  name: 'Preparación resiliente de un pedido',
  description: 'Reserva inventario y autoriza el pago en paralelo; separa el camino aprobado de la compensación y coordina la entrega mediante señales externas.',
  difficulty: 'avanzado',
  learningGoals: [A.fork, A.join, A.decision, A.sendSignal, A.acceptEvent, A.objectNode, A.flowFinal, A.partition],
});
