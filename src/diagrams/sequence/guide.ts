import type { DiagramGuide } from '@/core/registry';
import { SequenceArtifact as S } from './artifactTypes';
import { sequenceWorkshop } from './workshop';

/** Guía del diagrama de secuencia para la página Aprender. */
export const sequenceGuide: DiagramGuide = {
  summary:
    'Un diagrama de secuencia muestra una conversación: qué participantes intervienen en un escenario y qué mensajes se envían, en el orden en que ocurren.',
  purposes: [
    'Diseñar cómo colaboran objetos, servicios o sistemas para cumplir un caso de uso.',
    'Ver quién llama a quién, quién espera una respuesta y quién sigue sin esperar.',
    'Documentar una integración (una API, una pasarela de pago) paso a paso.',
  ],
  whenToUse: [
    'Para detallar un escenario concreto de un caso de uso: «iniciar sesión», «pagar».',
    'Para explicar el orden de las llamadas entre componentes antes de programarlas.',
    'Para encontrar dónde se espera de más o quién tiene demasiadas responsabilidades.',
  ],
  whenNotToUse: [
    'Para un proceso de negocio con decisiones y carriles: eso es un diagrama de actividades.',
    'Para la estructura (atributos, relaciones) de las clases: eso es un diagrama de clases.',
    'Para mostrar todos los casos posibles a la vez: cada diagrama cuenta un escenario.',
  ],
  keyIdea: {
    title: 'El tiempo corre hacia abajo',
    text: 'Cada participante tiene una línea discontinua que es su tiempo de vida. Un mensaje más arriba ocurre antes que uno más abajo: para leerlo, recorre las flechas de arriba abajo, sin importar de izquierda a derecha. La punta y el trazo dicen si quien envía espera la respuesta (síncrono) o sigue con lo suyo (asíncrono).',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Una colaboración lineal con llamada y respuesta.' },
    { name: 'intermedio', description: 'Creación, bucles, opciones o mensajes asíncronos en un escenario concreto.' },
    { name: 'avanzado', description: 'Reintentos, alternativas, paralelismo, compensación e integraciones externas combinadas.' },
  ],
  howToRead: [
    {
      title: 'Conoce a los participantes',
      text: 'Arriba, en una fila, están quienes conversan: actores (personas) y líneas de vida (objetos o sistemas). Se nombran «objeto : Clase».',
      artifactTypes: [S.actor, S.lifeline],
    },
    {
      title: 'Lee los mensajes de arriba abajo',
      text: 'Cada flecha horizontal es un mensaje con la operación que se pide: validar(usuario). Su altura marca cuándo ocurre.',
      artifactTypes: [S.syncMessage],
    },
    {
      title: 'Fíjate en la punta y el trazo',
      text: 'Punta llena: el emisor espera. Punta abierta: sigue sin esperar. Línea discontinua: es la respuesta que vuelve, o la creación de un participante nuevo.',
      artifactTypes: [S.asyncMessage, S.replyMessage, S.createMessage],
    },
    {
      title: 'Mira quién está ocupado',
      text: 'Las barras sobre la línea de vida muestran cuándo un participante está trabajando. Una X indica que deja de existir.',
      artifactTypes: [S.activation, S.destruction],
    },
    {
      title: 'Entra en los marcos',
      text: 'Un marco cambia cómo se leen los mensajes que encierra: alt elige un camino, opt ocurre solo si se cumple su guarda, loop se repite y par ocurre a la vez.',
      artifactTypes: [S.altFragment, S.optFragment, S.loopFragment, S.parFragment],
    },
  ],
  workshop: sequenceWorkshop,
};
