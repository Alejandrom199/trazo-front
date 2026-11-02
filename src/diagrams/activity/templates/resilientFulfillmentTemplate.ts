import { CANVAS_VIEW_ROLE_KEY, LINKED_TEMPLATE_ID_KEY } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

const primary = { [CANVAS_VIEW_ROLE_KEY]: 'primary' };
const alternative = { [CANVAS_VIEW_ROLE_KEY]: 'alternative' };
const integration = { [CANVAS_VIEW_ROLE_KEY]: 'integration' };

const t = createTemplateBuilder();
const HEIGHT = 1270;
t.lane('Cliente', 0, 220, HEIGHT);
t.lane('Comercio', 220, 390, HEIGHT);
t.lane('Servicios externos', 610, 300, HEIGHT);

const start = t.node(A.initialNode, '', { x: 405, y: 85 }, undefined, primary);
const receive = t.node(A.action, 'Recibir pedido', { x: 405, y: 155 }, undefined, primary);
const order = t.node(A.objectNode, 'Pedido [pendiente]', { x: 405, y: 235 }, { width: 165, height: 50 }, primary);
const fork = t.node(A.fork, '', { x: 405, y: 310 }, { width: 250, height: 12 }, primary);
const reserve = t.node(A.action, 'Reservar inventario', { x: 330, y: 390 }, undefined, primary);
const authorize = t.node(A.action, 'Autorizar pago', { x: 755, y: 390 }, undefined, { ...integration, [LINKED_TEMPLATE_ID_KEY]: 'sequence.resilient-payment' });
const join = t.node(A.join, '', { x: 405, y: 480 }, { width: 250, height: 12 }, primary);
const approved = t.node(A.decision, '¿Pago aprobado?', { x: 405, y: 555 }, undefined, alternative);
const prepare = t.node(A.action, 'Preparar envío', { x: 330, y: 700 }, undefined, primary);
const dispatch = t.node(A.sendSignal, 'Solicitar despacho', { x: 330, y: 820 }, { width: 180, height: 56 }, integration);
const confirmation = t.node(A.acceptEvent, 'Entrega confirmada', { x: 110, y: 950 }, { width: 175, height: 56 }, integration);
const close = t.node(A.action, 'Cerrar pedido', { x: 330, y: 1070 }, undefined, primary);
const end = t.node(A.activityFinal, '', { x: 330, y: 1180 }, undefined, primary);
const release = t.node(A.action, 'Liberar inventario', { x: 520, y: 700 }, undefined, alternative);
const notifyFailure = t.node(A.sendSignal, 'Notificar rechazo', { x: 520, y: 820 }, { width: 175, height: 56 }, alternative);
const failed = t.node(A.flowFinal, '', { x: 520, y: 950 }, undefined, alternative);

t.flow(start, receive, null, primary);
t.flow(receive, order, null, primary);
t.flow(order, fork, null, primary);
t.flow(fork, reserve, null, primary);
t.flow(fork, authorize, null, integration);
t.flow(reserve, join, null, primary);
t.flow(authorize, join, null, integration);
t.flow(join, approved, null, primary);
t.flow(approved, prepare, 'aprobado', primary);
t.flow(approved, release, 'rechazado', alternative);
t.flow(release, notifyFailure, null, alternative);
t.flow(notifyFailure, failed, null, alternative);
t.flow(prepare, dispatch, null, primary);
t.flow(dispatch, confirmation, null, integration);
t.flow(confirmation, close, null, primary);
t.flow(close, end, null, primary);

export const resilientFulfillmentTemplate = t.build({
  id: 'activity.resilient-fulfillment',
  name: 'Preparación resiliente de un pedido',
  description: 'Reserva inventario y autoriza el pago en paralelo; separa el camino aprobado de la compensación y coordina la entrega mediante señales externas.',
  difficulty: 'avanzado',
  learningGoals: [A.fork, A.join, A.decision, A.sendSignal, A.acceptEvent, A.objectNode, A.flowFinal, A.partition],
});
