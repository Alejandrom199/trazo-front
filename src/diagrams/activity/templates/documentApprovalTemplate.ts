import { ActivityArtifact as A } from '../artifactTypes';
import { createTemplateBuilder } from './templateBuilder';

/**
 * Avanzado: comunicación asíncrona con señales y paso de un documento como objeto.
 * Las señales NO se unen con flechas entre carriles: el envío y la aceptación se
 * relacionan por el nombre de la señal, no por un flujo.
 */
function buildDocumentApprovalTemplate() {
  const t = createTemplateBuilder();
  const laneHeight = 950;
  const author = { x: 120 };
  const authorReturn = { x: 320 };
  const approver = { x: 560 };

  t.lane('Autor', 0, 410, laneHeight);
  t.lane('Aprobador', 410, 300, laneHeight);

  // Autor
  const start = t.node(A.initialNode, '', { ...author, y: 90 });
  const revise = t.node(A.merge, '', { ...author, y: 160 });
  const write = t.node(A.action, 'Redactar documento', { ...author, y: 240 });
  const draft = t.node(A.objectNode, 'Documento [borrador]', { ...author, y: 340 }, { width: 160, height: 50 });
  const request = t.node(A.sendSignal, 'Solicitar aprobación', { ...author, y: 440 }, { width: 190, height: 56 });
  const verdictReceived = t.node(A.acceptEvent, 'Dictamen recibido', { ...author, y: 620 }, { width: 180, height: 56 });
  const approved = t.node(A.decision, '', { ...author, y: 710 });
  const fix = t.node(A.action, 'Ajustar documento', { ...authorReturn, y: 710 });
  const publish = t.node(A.action, 'Publicar documento', { ...author, y: 800 });
  const end = t.node(A.activityFinal, '', { ...author, y: 890 });

  // Aprobador: sin flujo de entrada, la aceptación se activa al iniciar la actividad y espera la señal.
  const requestReceived = t.node(A.acceptEvent, 'Solicitud recibida', { ...approver, y: 440 }, { width: 180, height: 56 });
  const review = t.node(A.action, 'Revisar documento', { ...approver, y: 530 });
  const sendVerdict = t.node(A.sendSignal, 'Enviar dictamen', { ...approver, y: 620 }, { width: 180, height: 56 });
  const reviewDone = t.node(A.flowFinal, '', { ...approver, y: 710 });

  t.flow(start, revise);
  t.flow(revise, write);
  t.flow(write, draft);
  t.flow(draft, request);
  t.flow(request, verdictReceived);
  t.flow(verdictReceived, approved);
  t.flow(approved, publish, 'aprobado');
  t.flow(approved, fix, 'requiere cambios');
  t.flow(fix, revise);
  t.flow(publish, end);

  t.flow(requestReceived, review);
  t.flow(review, sendVerdict);
  t.flow(sendVerdict, reviewDone);

  return t.build({
    id: 'activity.document-approval',
    name: 'Aprobación de documento',
    description:
      'El autor envía su borrador a aprobación con una señal y espera el dictamen; el aprobador reacciona a la solicitud y responde con otra señal.',
    difficulty: 'avanzado',
    learningGoals: [A.sendSignal, A.acceptEvent, A.objectNode, A.objectFlow, A.merge, A.flowFinal, A.partition],
  });
}

export const documentApprovalTemplate = buildDocumentApprovalTemplate();
