import type { LearningWorkshop } from '@/core/registry';
import { ActivityArtifact as A } from './artifactTypes';
import { createTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: una solicitud que se aprueba o se rechaza.
 *   - «Solicitud recibida» no es una acción: no empieza por un verbo.
 *   - La decisión tiene una salida sin guarda.
 *   - Un join espera a las dos ramas de la decisión, pero solo llega una: debía ser un merge.
 *     (El editor lo marca dos veces: «join usado como merge» y «join sin fork».)
 */
const b = createTemplateBuilder();
const start = b.node(A.initialNode, '', { x: 300, y: 40 });
const received = b.node(A.action, 'Solicitud recibida', { x: 300, y: 130 });
const decide = b.node(A.decision, '', { x: 300, y: 230 });
const approve = b.node(A.action, 'Aprobar solicitud', { x: 140, y: 330 });
const reject = b.node(A.action, 'Rechazar solicitud', { x: 460, y: 330 });
const join = b.node(A.join, '', { x: 300, y: 430 });
const notify = b.node(A.action, 'Notificar resultado', { x: 300, y: 520 });
const end = b.node(A.activityFinal, '', { x: 300, y: 610 });
b.flow(start, received);
b.flow(received, decide);
b.flow(decide, approve, 'cumple requisitos');
b.flow(decide, reject);
b.flow(approve, join);
b.flow(reject, join);
b.flow(join, notify);
b.flow(notify, end);

const brokenRequest = b.build({
  id: 'activity.challenge.request',
  name: 'Reto: aprobar una solicitud',
  description: 'Diagrama intencionalmente defectuoso para practicar decisiones, uniones y nombres de acciones.',
  difficulty: 'intermedio',
  learningGoals: [A.action, A.decision, A.merge],
});

export const activityWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Ordena acciones con un inicio y un final, y nómbralas con un verbo.' },
    { name: 'intermedio', description: 'Decide con guardas que cubran todos los casos y distingue merge de join.' },
    { name: 'avanzado', description: 'Modela trabajo en paralelo, carriles de responsabilidad y flujos de objetos sin bloqueos.' },
  ],
  correctionChallenges: [
    {
      id: 'request-decision',
      title: 'Una solicitud que nunca termina',
      context: 'El flujo aprueba o rechaza una solicitud y avisa del resultado. Tal como está, se queda esperando para siempre.',
      diagram: brokenRequest,
      expectedProblems: 4,
      question: {
        id: 'request-deadlock',
        prompt: '¿Por qué el flujo no llega nunca a «Notificar resultado»?',
        options: [
          { id: 'join', label: 'El join espera las dos ramas, pero la decisión solo activa una', explanation: 'Correcto. Un join sincroniza flujos paralelos; tras una decisión hay que reunir los caminos con un merge.', correct: true },
          { id: 'guard', label: 'Porque falta la guarda de «Rechazar solicitud»', explanation: 'Falta, y hay que ponerla, pero no bloquea: el bloqueo lo causa el join.', correct: false },
          { id: 'name', label: 'Porque «Solicitud recibida» no es un verbo', explanation: 'Es un problema de nombre, no de flujo: los tokens pasan igual.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'shipping-brief',
      title: 'Modela un envío',
      brief: 'Al confirmarse un pedido, el almacén prepara el paquete mientras facturación emite la factura. Cuando ambas tareas terminan, se envía el pedido.',
      questions: [
        {
          id: 'shipping-parallel',
          prompt: '¿Cómo modelas preparar y facturar?',
          options: [
            { id: 'fork-join', label: 'Un fork las abre en paralelo y un join espera a ambas', explanation: 'Correcto: las dos tareas ocurren a la vez y el envío necesita las dos terminadas.', correct: true },
            { id: 'decision', label: 'Una decisión elige preparar o facturar', explanation: 'Una decisión toma un solo camino: faltaría siempre una de las dos tareas.', correct: false },
            { id: 'sequence', label: 'Una después de la otra, sin más', explanation: 'Funciona, pero cuenta otra historia: dice que facturar espera a que termine el empaquetado.', correct: false },
          ],
        },
        {
          id: 'shipping-lanes',
          prompt: '¿Qué carriles (particiones) usarías?',
          options: [
            { id: 'roles', label: 'Almacén y Facturación: quién hace cada acción', explanation: 'Correcto: los carriles muestran la responsabilidad de cada acción.', correct: true },
            { id: 'objects', label: 'Pedido, Paquete y Factura', explanation: 'Son objetos que fluyen, no responsables: irían como nodos de objeto.', correct: false },
            { id: 'steps', label: 'Un carril por paso: preparar, facturar, enviar', explanation: 'Un carril agrupa a quien hace el trabajo, no cada paso.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'retry-loop',
      title: 'Reintentar un pago',
      context: 'El pago puede fallar y se reintenta hasta tres veces. Dos equipos lo modelaron así:',
      options: [
        { id: 'copies', label: 'Tres acciones «Cobrar» seguidas, cada una con su decisión', explanation: 'Repite el mismo paso y obliga a cambiar el dibujo si el límite pasa a cinco.', correct: false },
        { id: 'loop', label: 'Un merge antes de «Cobrar» y una decisión que vuelve a él con [falló y intentos < 3]', explanation: 'Correcto. Un único paso y un bucle con su condición: el límite es un dato, no la forma del diagrama.', correct: true },
      ],
    },
  ],
};
