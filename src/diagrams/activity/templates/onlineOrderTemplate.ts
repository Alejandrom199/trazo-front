import { LINKED_TEMPLATE_ID_KEY } from '@/core/model';
import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/**
 * Intermedio: un marco de actividad con tres carriles que muestran quién hace
 * cada paso de un pedido online. El cobro es un subproceso (⋔): su detalle va en
 * otro diagrama; en el proyecto de ejemplo se enlaza con «Procesar pago».
 */
function buildOnlineOrderTemplate() {
  const t = createTemplateBuilder();
  const laneWidth = 260;
  const laneHeight = 710;
  const customer = { x: 130 };
  const system = { x: 390 };
  const warehouse = { x: 650 };

  t.frame('Pedido en línea');
  t.lane('Cliente', 0, laneWidth, laneHeight);
  t.lane('Sistema', laneWidth, laneWidth, laneHeight);
  t.lane('Bodega', laneWidth * 2, laneWidth, laneHeight);

  const start = t.node(A.initialNode, '', { ...customer, y: 90 });
  const choose = t.node(A.action, 'Seleccionar productos', { ...customer, y: 170 });
  const confirm = t.node(A.action, 'Confirmar pedido', { ...customer, y: 260 });
  const checkStock = t.node(A.action, 'Verificar stock', { ...system, y: 260 });
  const inStock = t.node(A.decision, '¿Hay stock?', { ...system, y: 350 });
  const noStockNotice = t.node(A.action, 'Ver aviso de falta de stock', { ...customer, y: 350 });
  const cancelled = t.node(A.activityFinal, '', { ...customer, y: 440 });
  // Su detalle es el ejemplo «Procesar pago»: se crea al pedirlo (Propiedades o recorrido).
  const charge = t.node(A.callBehavior, 'Procesar pago', { ...system, y: 450 }, undefined, { [LINKED_TEMPLATE_ID_KEY]: 'activity.process-payment' });
  const pack = t.node(A.action, 'Preparar paquete', { ...warehouse, y: 450 });
  const ship = t.node(A.action, 'Despachar pedido', { ...warehouse, y: 550 });
  const receive = t.node(A.action, 'Recibir pedido', { ...customer, y: 550 });
  const end = t.node(A.activityFinal, '', { ...customer, y: 650 });

  t.flow(start, choose);
  t.flow(choose, confirm);
  t.flow(confirm, checkStock);
  t.flow(checkStock, inStock);
  t.flow(inStock, charge, 'hay stock');
  t.flow(inStock, noStockNotice, 'sin stock');
  t.flow(noStockNotice, cancelled);
  t.flow(charge, pack);
  t.flow(pack, ship);
  t.flow(ship, receive);
  t.flow(receive, end);

  return t.build({
    id: 'activity.online-order',
    name: 'Pedido en línea',
    description:
      'Un pedido recorre tres responsables dentro del marco de la actividad: el cliente compra, el sistema verifica y cobra (un subproceso) y la bodega prepara y despacha.',
    difficulty: 'intermedio',
    learningGoals: [A.activityFrame, A.partition, A.action, A.callBehavior, A.decision, A.controlFlow, A.activityFinal],
  });
}

export const onlineOrderTemplate = buildOnlineOrderTemplate();
