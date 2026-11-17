import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/**
 * Intermedio: el detalle del subproceso «Procesar pago» de «Pedido en línea».
 * El sistema pide la autorización y la pasarela decide; si rechaza, se informa.
 * Sus dos finales tienen nombre: son el resultado que recibe el proceso mayor.
 */
function buildProcessPaymentTemplate() {
  const t = createTemplateBuilder();
  const system = { x: 150 };
  const gateway = { x: 450 };
  t.frame('Procesar pago');
  t.lane('Sistema', 0, 300, 660);
  t.lane('Pasarela de pago', 300, 300, 660);

  const start = t.node(A.initialNode, '', { ...system, y: 60 });
  const total = t.node(A.action, 'Calcular el total', { ...system, y: 140 });
  const request = t.node(A.action, 'Solicitar la autorización', { ...system, y: 240 });
  const check = t.node(A.action, 'Validar la tarjeta', { ...gateway, y: 240 });
  const approved = t.node(A.decision, '¿Aprobado?', { ...gateway, y: 340 });
  const charge = t.node(A.action, 'Confirmar el cobro', { ...gateway, y: 520 });
  const record = t.node(A.action, 'Registrar el pago', { ...system, y: 520 });
  const done = t.node(A.activityFinal, 'pago aprobado', { ...system, y: 610 });
  const reject = t.node(A.action, 'Informar el rechazo', { ...system, y: 340 });
  const rejected = t.node(A.activityFinal, 'pago rechazado', { ...system, y: 420 });

  t.flow(start, total);
  t.flow(total, request);
  t.flow(request, check);
  t.flow(check, approved);
  t.flow(approved, charge, 'aprobado');
  t.flow(approved, reject, 'rechazado');
  t.flow(charge, record);
  t.flow(record, done);
  t.flow(reject, rejected);

  return t.build({
    id: 'activity.process-payment',
    name: 'Procesar pago',
    description: 'El detalle del subproceso de «Pedido en línea»: el sistema pide la autorización, la pasarela valida y cobra, o se informa el rechazo.',
    difficulty: 'intermedio',
    learningGoals: [A.activityFrame, A.partition, A.action, A.decision, A.activityFinal],
  });
}

export const processPaymentTemplate = buildProcessPaymentTemplate();
