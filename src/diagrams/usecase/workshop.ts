import type { LearningWorkshop } from '@/core/registry';
import { UseCaseArtifact as U } from './artifactTypes';
import { createUseCaseTemplateBuilder } from './templates/templateBuilder';

const broken = createUseCaseTemplateBuilder();
const namelessBoundary = broken.boundary('', { x: 270, y: 35 }, { width: 580, height: 430 });
const customer = broken.actor('Cliente', { x: 70, y: 90 }, namelessBoundary);
const button = broken.useCase('Pulsar botón pagar', { x: 110, y: 80 }, namelessBoundary);
broken.useCase('Consultar pedido', { x: 900, y: 120 }, null);
broken.actor('Operador', { x: 30, y: 330 });
broken.relation(customer, button);

const brokenCheckout = broken.build({
  id: 'usecase.challenge.checkout',
  name: 'Reto: alcance de compra',
  description: 'Diagrama intencionalmente defectuoso para practicar diagnóstico y corrección.',
  difficulty: 'intermedio',
  learningGoals: [U.actor, U.useCase, U.systemBoundary],
});

export const useCaseWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Reconoce la notación y relaciona un actor con una meta principal.' },
    { name: 'intermedio', description: 'Modela variantes, reutilización y varios roles sin confundir pasos con objetivos.' },
    { name: 'avanzado', description: 'Resuelve excepciones, sistemas externos, herencia de roles y decisiones de alcance discutibles.' },
  ],
  correctionChallenges: [
    {
      id: 'checkout-scope',
      title: 'Una compra que parece correcta',
      context: 'El equipo dibujó una primera versión del alcance de compra. Hay problemas de notación y también de significado.',
      diagram: brokenCheckout,
      expectedProblems: 6,
      question: {
        id: 'checkout-first-fix',
        prompt: '¿Qué corrección ataca el problema conceptual más importante?',
        options: [
          { id: 'rename', label: 'Cambiar «Pulsar botón pagar» por «Pagar pedido»', explanation: 'Correcto. Un caso de uso expresa la meta del actor, no el gesto de interfaz usado para alcanzarla.', correct: true },
          { id: 'color', label: 'Dibujar el botón con otro color', explanation: 'El color no corrige que se haya modelado una acción de interfaz en lugar de una meta.', correct: false },
          { id: 'more', label: 'Agregar cada pantalla de la compra', explanation: 'Aumentaría el problema: las pantallas pertenecen al diseño de interfaz, no al mapa funcional.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'subscription-brief',
      title: 'Modela una suscripción',
      brief: 'Un lector contrata una suscripción. El sistema siempre valida el medio de pago. Si el lector dispone de un cupón, puede aplicarlo. Una pasarela externa autoriza el cobro.',
      questions: [
        {
          id: 'subscription-actors',
          prompt: '¿Cuáles son los actores?',
          options: [
            { id: 'reader-gateway', label: 'Lector y pasarela de pago', explanation: 'Correcto: ambos están fuera del sistema y colaboran con él.', correct: true },
            { id: 'coupon', label: 'Lector y cupón', explanation: 'El cupón es información o una regla, no un rol que interactúa.', correct: false },
            { id: 'database', label: 'Base de datos y pasarela', explanation: 'La base de datos normalmente forma parte de la implementación interna.', correct: false },
          ],
        },
        {
          id: 'subscription-relations',
          prompt: '¿Cómo relacionas las capacidades?',
          options: [
            { id: 'include-extend', label: 'Validar pago: include; Aplicar cupón: extend', explanation: 'Correcto: validar siempre ocurre y el cupón solo aparece bajo una condición.', correct: true },
            { id: 'both-include', label: 'Ambas con include', explanation: 'Obligaría a aplicar un cupón en todas las suscripciones.', correct: false },
            { id: 'both-extend', label: 'Ambas con extend', explanation: 'Convertiría la validación obligatoria del pago en un comportamiento opcional.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'goal-vs-screen',
      title: 'Dos modelos plausibles',
      context: 'Ambos equipos dicen haber modelado el acceso de un cliente. Elige el que sobreviviría a un cambio completo de interfaz.',
      options: [
        { id: 'screens', label: 'Abrir formulario → escribir correo → pulsar Entrar', explanation: 'Describe una interfaz concreta. Si cambia la pantalla, el modelo deja de servir.', correct: false },
        { id: 'goal', label: 'Cliente → Iniciar sesión; incluye Validar identidad', explanation: 'Correcto. Conserva la intención y la regla obligatoria sin imponer una interfaz.', correct: true },
      ],
    },
  ],
};
