import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/** Básico: secuencia, una decisión con guardas y un bucle de reintento con fusión. */
function buildLoginTemplate() {
  const t = createTemplateBuilder();

  const start = t.node(A.initialNode, '', { x: 300, y: 40 });
  const retry = t.node(A.merge, '', { x: 300, y: 110 });
  const enter = t.node(A.action, 'Ingresar usuario y contraseña', { x: 300, y: 200 });
  const validate = t.node(A.action, 'Validar credenciales', { x: 300, y: 300 });
  const valid = t.node(A.decision, '¿Credenciales válidas?', { x: 300, y: 390 });
  const showError = t.node(A.action, 'Mostrar mensaje de error', { x: 560, y: 390 });
  const openSession = t.node(A.action, 'Abrir la sesión', { x: 300, y: 490 });
  const end = t.node(A.activityFinal, '', { x: 300, y: 580 });

  t.flow(start, retry);
  t.flow(retry, enter);
  t.flow(enter, validate);
  t.flow(validate, valid);
  t.flow(valid, openSession, 'credenciales válidas');
  t.flow(valid, showError, 'credenciales inválidas');
  t.flow(showError, retry);
  t.flow(openSession, end);

  return t.build({
    id: 'activity.login',
    name: 'Login de usuario',
    description:
      'El usuario ingresa sus credenciales; si son inválidas ve un error y vuelve a intentarlo, si son válidas entra al sistema.',
    difficulty: 'básico',
    learningGoals: [A.initialNode, A.action, A.decision, A.merge, A.controlFlow, A.activityFinal],
  });
}

export const loginTemplate = buildLoginTemplate();
