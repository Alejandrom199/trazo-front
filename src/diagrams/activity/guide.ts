import type { DiagramGuide } from '@/core/registry';
import { ActivityArtifact as A } from './artifactTypes';

/** Guía del diagrama de actividades para la página Aprender. */
export const activityGuide: DiagramGuide = {
  summary:
    'Un diagrama de actividades muestra cómo fluye un proceso: qué pasos se hacen, en qué orden, qué decisiones se toman, qué ocurre en paralelo y quién se encarga de cada cosa.',
  purposes: [
    'Entender y acordar cómo funciona un proceso antes de construirlo o cambiarlo.',
    'Ver de un vistazo los caminos alternativos, los bucles y las tareas en paralelo.',
    'Repartir responsabilidades entre personas, áreas o sistemas con carriles.',
  ],
  whenToUse: [
    'Para describir un caso de uso o un flujo de trabajo paso a paso.',
    'Para explicar un algoritmo o una regla de negocio con decisiones.',
    'Cuando varios actores colaboran y hay que dejar claro quién hace qué.',
  ],
  whenNotToUse: [
    'Para mostrar la estructura de las clases de un sistema: eso es un diagrama de clases.',
    'Para detallar los mensajes entre objetos en el tiempo: eso es un diagrama de secuencia.',
  ],
  keyIdea: {
    title: 'Piensa en una ficha que avanza',
    text: 'UML define el comportamiento con "tokens": imagina una ficha que nace en el nodo inicial y recorre las flechas. Una acción se ejecuta cuando la ficha llega; una decisión deja pasar la ficha por un solo camino; un fork la copia en varias que avanzan a la vez, y un join espera a que lleguen todas antes de continuar.',
  },
  howToRead: [
    {
      title: 'Empieza en el nodo inicial',
      text: 'El círculo negro marca dónde arranca el proceso. Desde ahí, sigue las flechas.',
      artifactTypes: [A.initialNode, A.controlFlow],
    },
    {
      title: 'Lee cada acción como un paso',
      text: 'Los rectángulos redondeados son pasos que alguien o algo ejecuta. Se nombran con un verbo: «Validar datos».',
      artifactTypes: [A.action],
    },
    {
      title: 'En un rombo, elige un camino',
      text: 'La decisión envía el flujo por la salida cuya guarda se cumple, como [pago aprobado]. Más adelante, una fusión vuelve a unir esos caminos.',
      artifactTypes: [A.decision, A.merge],
    },
    {
      title: 'En una barra, avanza en paralelo',
      text: 'El fork divide el flujo en tareas simultáneas; el join espera a que todas terminen.',
      artifactTypes: [A.fork, A.join],
    },
    {
      title: 'Mira en qué carril está cada paso',
      text: 'Los carriles dicen quién se encarga de cada acción: un cliente, un sistema, un área.',
      artifactTypes: [A.partition],
    },
    {
      title: 'Termina en un nodo final',
      text: 'La diana termina todo el proceso; el círculo con una X termina solo esa rama.',
      artifactTypes: [A.activityFinal, A.flowFinal],
    },
  ],
};
