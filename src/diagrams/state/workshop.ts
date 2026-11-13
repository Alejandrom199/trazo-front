import type { LearningWorkshop } from '@/core/registry';
import { StateArtifact as S } from './artifactTypes';
import { createStateTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: el ciclo de vida de un pedido.
 *   - De Pendiente a Pagado no se dice qué evento provoca el cambio.
 *   - Enviado no tiene salida: el pedido queda atrapado ahí.
 *   - Cancelado no se alcanza desde ningún estado (y tampoco tiene salida).
 */
const b = createStateTemplateBuilder();
const start = b.initial({ x: -100, y: 16 });
const pending = b.state('Pendiente', { x: 0, y: 0 });
const paid = b.state('Pagado', { x: 330, y: 0 });
const shipped = b.state('Enviado', { x: 660, y: 0 });
b.state('Cancelado', { x: 330, y: 220 });
b.connect(start, pending);
b.connect(pending, paid);
b.connect(paid, shipped, 'despachar');

const brokenOrder = b.build({
  id: 'state.challenge.order',
  name: 'Reto: ciclo de vida de un pedido',
  description: 'Diagrama intencionalmente defectuoso para practicar eventos, salidas y alcanzabilidad.',
  difficulty: 'intermedio',
  learningGoals: [S.state, S.transition, S.final],
});

export const stateWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Distingue estados (situaciones que duran) de eventos (lo que provoca el cambio).' },
    { name: 'intermedio', description: 'Asegura que todo estado se alcanza y tiene salida, y usa guardas en las elecciones.' },
    { name: 'avanzado', description: 'Agrupa con estados compuestos e historial sin perder qué evento dispara cada transición.' },
  ],
  correctionChallenges: [
    {
      id: 'order-lifecycle',
      title: 'Un pedido atrapado',
      context: 'El ciclo de vida de un pedido en una tienda. Algunos pedidos nunca terminan y uno de los estados no se usa.',
      diagram: brokenOrder,
      expectedProblems: 4,
      question: {
        id: 'order-event',
        prompt: '¿Qué le falta a la transición de Pendiente a Pagado?',
        options: [
          { id: 'event', label: 'El evento que la dispara, p. ej. «pago confirmado»', explanation: 'Correcto. Una transición entre estados ocurre por un evento; sin él, no se sabe cuándo cambia.', correct: true },
          { id: 'state', label: 'Un estado intermedio «Pagando»', explanation: 'Puede existir, pero no resuelve que la transición no diga qué la provoca.', correct: false },
          { id: 'action', label: 'Renombrar Pagado como «Pagar»', explanation: 'Al revés: «Pagar» es una acción; un estado describe una situación, como «Pagado».', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'ticket-brief',
      title: 'Modela una incidencia',
      brief: 'Una incidencia se abre, alguien la toma y queda en curso. Si el cliente responde, vuelve a estar en curso; si nadie responde en 7 días, se cierra. Una incidencia cerrada puede reabrirse.',
      questions: [
        {
          id: 'ticket-states',
          prompt: '¿Cuáles son estados?',
          options: [
            { id: 'states', label: 'Abierta, En curso, Esperando al cliente y Cerrada', explanation: 'Correcto: son situaciones en las que la incidencia permanece un tiempo.', correct: true },
            { id: 'events', label: 'Tomar, Responder y Reabrir', explanation: 'Son eventos o acciones: provocan cambios entre estados.', correct: false },
            { id: 'people', label: 'Cliente y Técnico', explanation: 'Son participantes, no situaciones de la incidencia.', correct: false },
          ],
        },
        {
          id: 'ticket-timeout',
          prompt: '¿Cómo modelas el cierre a los 7 días?',
          options: [
            { id: 'after', label: 'Transición de Esperando al cliente a Cerrada con el evento «after(7 días)»', explanation: 'Correcto: el paso del tiempo es un evento que dispara la transición.', correct: true },
            { id: 'state', label: 'Un estado «7 días»', explanation: 'El tiempo no es una situación de la incidencia: es lo que provoca el cambio.', correct: false },
            { id: 'final', label: 'Ir directamente al estado final', explanation: 'Una incidencia cerrada puede reabrirse: no ha terminado su vida.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'state-or-action',
      title: 'Estados o pasos',
      context: 'Dos modelos del semáforo de un cruce:',
      options: [
        { id: 'steps', label: 'Encender verde → Esperar → Encender ámbar → Esperar → Encender rojo', explanation: 'Describe pasos de un proceso: es un diagrama de actividades disfrazado.', correct: false },
        { id: 'states', label: 'Verde, Ámbar y Rojo, con transiciones por «tiempo cumplido»', explanation: 'Correcto. El semáforo permanece en cada color hasta que un evento lo cambia: eso es una máquina de estados.', correct: true },
      ],
    },
  ],
};
