import type { LearningWorkshop } from '@/core/registry';
import { ComponentArtifact as C } from './artifactTypes';
import { createComponentTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: los componentes de una tienda.
 *   - Pedidos necesita IPagos y se ensambla con una interfaz que se llama ICobros.
 *   - IReportes está dibujada, pero ningún componente la ofrece.
 *   - Auditoría no se relaciona con nada.
 */
const b = createComponentTemplateBuilder();
const row = 80;
const web = b.component('Tienda web', { x: 0, y: row });
const webNeeds = b.required('IPedidos', 240, row);
const ordersOffers = b.provided('IPedidos', 340, row);
const orders = b.component('Pedidos', { x: 430, y: row });
const ordersNeeds = b.required('IPagos', 670, row);
const paymentsOffers = b.provided('ICobros', 770, row);
const payments = b.component('Pagos', { x: 860, y: row });
b.provided('IReportes', 340, 300);
b.component('Auditoría', { x: 860, y: 300 });
b.connect(web, webNeeds);
b.connect(webNeeds, ordersOffers);
b.connect(orders, ordersOffers);
b.connect(orders, ordersNeeds);
b.connect(ordersNeeds, paymentsOffers);
b.connect(payments, paymentsOffers);

const brokenShop = b.build({
  id: 'component.challenge.shop',
  name: 'Reto: componentes de una tienda',
  description: 'Diagrama intencionalmente defectuoso para practicar interfaces ofrecidas y requeridas.',
  difficulty: 'intermedio',
  learningGoals: [C.component, C.providedInterface, C.requiredInterface],
});

export const componentWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Reconoce componentes y lo que ofrecen (bola) y necesitan (socket).' },
    { name: 'intermedio', description: 'Ensambla cada interfaz requerida con una ofrecida del mismo contrato.' },
    { name: 'avanzado', description: 'Agrupa en subsistemas y evita dependencias circulares entre componentes.' },
  ],
  correctionChallenges: [
    {
      id: 'shop-contracts',
      title: 'Un contrato que no encaja',
      context: 'La tienda web pide pedidos y Pedidos cobra a través de Pagos. Algo no casa en los contratos.',
      diagram: brokenShop,
      expectedProblems: 3,
      question: {
        id: 'shop-assembly',
        prompt: '¿Qué falla en el ensamblaje de Pedidos con Pagos?',
        options: [
          { id: 'mismatch', label: 'Pedidos requiere IPagos, pero Pagos ofrece ICobros: no es el mismo contrato', explanation: 'Correcto. Un ensamblaje une una interfaz requerida con una ofrecida del mismo contrato.', correct: true },
          { id: 'direction', label: 'La bola debería estar del lado de Pedidos', explanation: 'Pedidos necesita el cobro: lleva el socket. La bola es de quien ofrece el servicio.', correct: false },
          { id: 'subsystem', label: 'Pagos debería estar dentro de un subsistema', explanation: 'Agrupar no cambia que los contratos no coinciden.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'notifications-brief',
      title: 'Modela avisos',
      brief: 'El módulo de préstamos avisa a los usuarios por correo o SMS. Mañana podría añadirse otro canal sin tocar préstamos.',
      questions: [
        {
          id: 'notifications-interface',
          prompt: '¿Cómo depende Préstamos de los avisos?',
          options: [
            { id: 'interface', label: 'Requiere una interfaz INotificar que ofrecen Correo y SMS', explanation: 'Correcto: Préstamos conoce el contrato, no a cada canal; un canal nuevo solo ofrece INotificar.', correct: true },
            { id: 'direct', label: 'Depende directamente de los componentes Correo y SMS', explanation: 'Cada canal nuevo obligaría a cambiar Préstamos.', correct: false },
            { id: 'merge', label: 'Correo y SMS dentro de Préstamos', explanation: 'Mezcla responsabilidades: Préstamos cambiaría cada vez que cambie un canal.', correct: false },
          ],
        },
        {
          id: 'notifications-provided',
          prompt: '¿Quién ofrece (bola) INotificar?',
          options: [
            { id: 'channels', label: 'Correo y SMS', explanation: 'Correcto: son los que implementan el servicio de notificar.', correct: true },
            { id: 'loans', label: 'Préstamos', explanation: 'Préstamos lo usa: lleva el socket, no la bola.', correct: false },
            { id: 'nobody', label: 'Nadie: basta con dibujar el socket', explanation: 'Un socket sin nadie que lo satisfaga es un requisito pendiente.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'component-granularity',
      title: 'Qué es un componente',
      context: 'Dos propuestas para el backend de una biblioteca:',
      options: [
        { id: 'classes', label: 'Un componente por clase: Libro, Socio, Préstamo, Multa…', explanation: 'Es un diagrama de clases con otra forma: los componentes agrupan piezas reemplazables, no clases sueltas.', correct: false },
        { id: 'modules', label: 'Catálogo, Préstamos y Notificaciones, unidos por sus interfaces', explanation: 'Correcto. Cada componente se puede sustituir respetando su contrato.', correct: true },
      ],
    },
  ],
};
