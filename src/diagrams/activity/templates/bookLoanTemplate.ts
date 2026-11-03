import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/** Básico: un proceso lineal con una sola decisión y dos maneras de terminar. */
function buildBookLoanTemplate() {
  const t = createTemplateBuilder();

  const start = t.node(A.initialNode, '', { x: 300, y: 40 });
  const search = t.node(A.action, 'Buscar el libro', { x: 300, y: 130 });
  const available = t.node(A.decision, '¿Hay ejemplares?', { x: 300, y: 230 });
  const register = t.node(A.action, 'Registrar el préstamo', { x: 300, y: 330 });
  const deliver = t.node(A.action, 'Entregar el libro', { x: 300, y: 430 });
  const end = t.node(A.activityFinal, '', { x: 300, y: 520 });
  const reserve = t.node(A.action, 'Reservar el libro', { x: 580, y: 230 });
  const reserved = t.node(A.activityFinal, '', { x: 580, y: 330 });

  t.flow(start, search);
  t.flow(search, available);
  t.flow(available, register, 'hay ejemplares');
  t.flow(available, reserve, 'no hay ejemplares');
  t.flow(register, deliver);
  t.flow(deliver, end);
  t.flow(reserve, reserved);

  return t.build({
    id: 'activity.book-loan',
    name: 'Préstamo de un libro',
    description: 'Se busca el libro; si hay ejemplares se registra el préstamo y se entrega, si no, se reserva. Un proceso corto con una sola decisión.',
    difficulty: 'básico',
    learningGoals: [A.initialNode, A.action, A.decision, A.controlFlow, A.activityFinal],
  });
}

export const bookLoanTemplate = buildBookLoanTemplate();
