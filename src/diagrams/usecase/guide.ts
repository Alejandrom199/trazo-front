import type { DiagramGuide } from '@/core/registry';
import { UseCaseArtifact as U } from './artifactTypes';
import { useCaseWorkshop } from './workshop';

export const useCaseGuide: DiagramGuide = {
  summary: 'Un diagrama de casos de uso muestra qué objetivos ofrece un sistema y qué actores externos participan, sin decidir todavía cómo se implementan.',
  purposes: ['Acordar el alcance funcional con personas técnicas y de negocio.', 'Relacionar cada capacidad con quien la necesita.', 'Detectar funciones obligatorias, opcionales y reutilizadas.'],
  whenToUse: ['Al descubrir requisitos y delimitar una versión.', 'Antes de detallar flujos con actividades o secuencias.', 'Para comunicar el contexto funcional del sistema.'],
  whenNotToUse: ['Para explicar pasos internos de un proceso: usa actividades.', 'Para mensajes entre objetos: usa secuencia.', 'Para modelar clases o base de datos.'],
  keyIdea: { title: 'Modela metas, no pantallas', text: 'Un caso de uso expresa un resultado valioso para un actor. «Comprar productos» es una meta; «pulsar el botón Comprar» es un detalle de interfaz que todavía no pertenece aquí.' },
  difficultyCriteria: useCaseWorkshop.levels,
  howToRead: [
    { title: 'Ubica la frontera', text: 'El rectángulo nombra el sistema estudiado. Todo caso de uso dentro pertenece a su alcance.', artifactTypes: [U.systemBoundary] },
    { title: 'Identifica los actores', text: 'Los actores quedan fuera y representan roles o sistemas externos, no personas concretas.', artifactTypes: [U.actor] },
    { title: 'Lee las metas', text: 'Cada elipse es un objetivo observable, nombrado con verbo: «Consultar saldo».', artifactTypes: [U.useCase] },
    { title: 'Sigue las asociaciones', text: 'La línea continua muestra en qué capacidades participa cada actor.', artifactTypes: [U.association] },
    { title: 'Distingue lo obligatorio de lo opcional', text: 'include reutiliza algo que siempre ocurre; extend agrega una variante condicionada.', artifactTypes: [U.include, U.extend] },
    { title: 'Reconoce roles especializados', text: 'La generalización permite que un actor especializado herede las participaciones del actor general.', artifactTypes: [U.generalization] },
  ],
  workshop: useCaseWorkshop,
};
