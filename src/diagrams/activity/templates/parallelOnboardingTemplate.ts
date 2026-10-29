import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/**
 * Intermedio: tareas en paralelo. Tres ramas se sincronizan en el join; la cuarta
 * no hace falta esperarla y termina en un final de flujo.
 */
function buildParallelOnboardingTemplate() {
  const t = createTemplateBuilder();
  const branchY = 290;

  const start = t.node(A.initialNode, '', { x: 320, y: 40 });
  const sign = t.node(A.action, 'Firmar contrato', { x: 320, y: 120 });
  const split = t.node(A.fork, '', { x: 320, y: 200 }, { width: 600, height: 8 });
  const email = t.node(A.action, 'Crear cuenta de correo', { x: 80, y: branchY });
  const laptop = t.node(A.action, 'Asignar equipo', { x: 240, y: branchY });
  const training = t.node(A.action, 'Programar inducción', { x: 400, y: branchY });
  const gift = t.node(A.action, 'Enviar regalo de bienvenida', { x: 560, y: branchY });
  const sync = t.node(A.join, '', { x: 240, y: 380 }, { width: 440, height: 8 });
  const giftDone = t.node(A.flowFinal, '', { x: 560, y: 380 });
  const welcome = t.node(A.action, 'Dar la bienvenida', { x: 240, y: 460 });
  const end = t.node(A.activityFinal, '', { x: 240, y: 550 });

  t.flow(start, sign);
  t.flow(sign, split);
  for (const branch of [email, laptop, training, gift]) t.flow(split, branch);
  for (const branch of [email, laptop, training]) t.flow(branch, sync);
  t.flow(gift, giftDone);
  t.flow(sync, welcome);
  t.flow(welcome, end);

  return t.build({
    id: 'activity.parallel-onboarding',
    name: 'Incorporar a un empleado',
    description:
      'Tras firmar el contrato, varias áreas trabajan a la vez. La bienvenida espera a que terminen tres de ellas; el regalo sigue por su cuenta.',
    difficulty: 'intermedio',
    learningGoals: [A.fork, A.join, A.flowFinal, A.action, A.activityFinal],
  });
}

export const parallelOnboardingTemplate = buildParallelOnboardingTemplate();
