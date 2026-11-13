import type { LearningWorkshop } from '@/core/registry';
import { SequenceArtifact as S } from './artifactTypes';
import { createSequenceTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: un inicio de sesión.
 *   - :ServicioAuth recibe «validar» y nunca responde.
 *   - El fragmento alt no dice qué condición elige cada operando.
 *   - :BaseDatos está dibujada y no participa en ningún mensaje.
 */
const b = createSequenceTemplateBuilder();
const HEIGHT = 420;
const user = b.participant(S.actor, 'Usuario', 0, HEIGHT);
const app = b.participant(S.lifeline, ':Aplicación', 200, HEIGHT);
const auth = b.participant(S.lifeline, ':ServicioAuth', 420, HEIGHT);
b.participant(S.lifeline, ':BaseDatos', 640, HEIGHT);
b.activation(app, 100, 360);
b.activation(auth, 140, 180);
b.message(S.syncMessage, user, app, 'entrar(usuario, clave)', 100);
b.message(S.syncMessage, app, auth, 'validar(credenciales)', 140);
b.fragment(S.altFragment, '', { x: 150, y: 220, width: 360, height: 120 }, 280);
b.message(S.replyMessage, app, user, 'acceso concedido', 250);
b.message(S.replyMessage, app, user, 'acceso denegado', 310);

const brokenLogin = b.build({
  id: 'sequence.challenge.login',
  name: 'Reto: inicio de sesión',
  description: 'Diagrama intencionalmente defectuoso para practicar respuestas, fragmentos y participantes.',
  difficulty: 'intermedio',
  learningGoals: [S.syncMessage, S.replyMessage, S.altFragment],
});

export const sequenceWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Ordena mensajes en el tiempo entre participantes con nombre.' },
    { name: 'intermedio', description: 'Responde a cada llamada síncrona y usa alt u opt con guardas claras.' },
    { name: 'avanzado', description: 'Combina mensajes asíncronos, bucles y creación o destrucción de participantes.' },
  ],
  correctionChallenges: [
    {
      id: 'login-reply',
      title: 'Un login que no sabe si validó',
      context: 'La aplicación decide si concede el acceso, pero no se ve de dónde saca esa decisión.',
      diagram: brokenLogin,
      expectedProblems: 3,
      question: {
        id: 'login-missing',
        prompt: '¿Qué falta para que la decisión del alt tenga sentido?',
        options: [
          { id: 'reply', label: 'La respuesta de :ServicioAuth a «validar» y las guardas del alt', explanation: 'Correcto. Una llamada síncrona espera respuesta, y cada operando del alt dice con qué condición se toma.', correct: true },
          { id: 'async', label: 'Cambiar «validar» a mensaje asíncrono', explanation: 'La aplicación necesita el resultado para decidir: la llamada debe ser síncrona y tener respuesta.', correct: false },
          { id: 'loop', label: 'Envolverlo todo en un loop', explanation: 'Repetiría el intento, pero seguiría sin respuesta ni condiciones.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'checkout-brief',
      title: 'Modela un pago',
      brief: 'El cliente confirma la compra. La tienda pide a la pasarela que cobre y espera su respuesta. Si el cobro se aprueba, la tienda envía al almacén un aviso de preparación sin esperar contestación.',
      questions: [
        {
          id: 'checkout-sync',
          prompt: '¿Cómo es el mensaje de la tienda a la pasarela?',
          options: [
            { id: 'sync', label: 'Síncrono, con su mensaje de respuesta', explanation: 'Correcto: la tienda espera el resultado del cobro para continuar.', correct: true },
            { id: 'async', label: 'Asíncrono', explanation: 'La tienda no podría saber si se aprobó antes de avisar al almacén.', correct: false },
            { id: 'create', label: 'Un mensaje de creación', explanation: 'La pasarela ya existe: no se crea en esta interacción.', correct: false },
          ],
        },
        {
          id: 'checkout-opt',
          prompt: '¿Y el aviso al almacén?',
          options: [
            { id: 'opt-async', label: 'Mensaje asíncrono dentro de un opt [cobro aprobado]', explanation: 'Correcto: solo ocurre si se aprobó, y la tienda no espera contestación.', correct: true },
            { id: 'alt-empty', label: 'Un alt con un operando vacío', explanation: 'Un alt con una sola rama útil es justo lo que expresa opt, más claro.', correct: false },
            { id: 'par', label: 'Un par con el cobro', explanation: 'No es paralelo: el aviso depende del resultado del cobro.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'detail-level',
      title: 'Cuánto detalle',
      context: 'Dos diagramas describen la búsqueda de un libro. ¿Cuál sirve mejor para acordar la interacción entre componentes?',
      options: [
        { id: 'code', label: 'Un mensaje por cada línea de código: abrir conexión, preparar consulta, leer filas…', explanation: 'Mezcla la implementación con la interacción y caduca con cualquier refactor.', correct: false },
        { id: 'contract', label: 'Portal → Catálogo: buscar(título); Catálogo → Portal: resultados', explanation: 'Correcto. Muestra quién pide qué y qué recibe, al nivel que los equipos tienen que acordar.', correct: true },
      ],
    },
  ],
};
