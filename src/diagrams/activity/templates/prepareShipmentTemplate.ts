import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/**
 * Intermedio: el detalle del subproceso «Preparar envío» de «Preparación
 * resiliente de un pedido». Embalar y etiquetar ocurren en paralelo.
 */
function buildPrepareShipmentTemplate() {
  const t = createTemplateBuilder();
  const start = t.node(A.initialNode, '', { x: 300, y: 40 });
  const pick = t.node(A.action, 'Recoger los productos', { x: 300, y: 120 });
  const fork = t.node(A.fork, '', { x: 300, y: 200 });
  const pack = t.node(A.action, 'Embalar el pedido', { x: 160, y: 280 });
  const label = t.node(A.action, 'Imprimir la etiqueta', { x: 440, y: 280 });
  const join = t.node(A.join, '', { x: 300, y: 360 });
  const carrier = t.node(A.action, 'Coordinar con el transportista', { x: 300, y: 440 });
  const end = t.node(A.activityFinal, '', { x: 300, y: 520 });

  t.flow(start, pick);
  t.flow(pick, fork);
  t.flow(fork, pack);
  t.flow(fork, label);
  t.flow(pack, join);
  t.flow(label, join);
  t.flow(join, carrier);
  t.flow(carrier, end);

  return t.build({
    id: 'activity.prepare-shipment',
    name: 'Preparar envío',
    description: 'El detalle del subproceso de la preparación resiliente: se recogen los productos, se embala y etiqueta en paralelo y se coordina el transporte.',
    difficulty: 'intermedio',
    learningGoals: [A.action, A.fork, A.join, A.activityFinal],
  });
}

export const prepareShipmentTemplate = buildPrepareShipmentTemplate();
