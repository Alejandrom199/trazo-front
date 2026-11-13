import type { DiagramGuide } from '@/core/registry';
import { ComponentArtifact as C } from './artifactTypes';
import { componentWorkshop } from './workshop';

/** Guía del diagrama de componentes para la página Aprender. */
export const componentGuide: DiagramGuide = {
  summary:
    'Un diagrama de componentes muestra en qué piezas reemplazables se divide un sistema y cómo se conectan mediante contratos (interfaces): qué ofrece cada pieza y qué necesita de las demás.',
  purposes: [
    'Acordar la arquitectura: qué piezas hay y qué responsabilidad tiene cada una.',
    'Ver qué contratos unen a las piezas, para poder cambiar una sin romper las otras.',
    'Detectar dependencias peligrosas, como ciclos o piezas de las que depende todo.',
  ],
  whenToUse: [
    'Al diseñar o documentar la arquitectura de un sistema (módulos, servicios, bibliotecas).',
    'Antes de repartir el trabajo entre equipos: cada uno con sus piezas y contratos.',
    'Para planear la integración con sistemas externos.',
  ],
  whenNotToUse: [
    'Para el detalle de clases de una pieza: usa un diagrama de clases.',
    'Para el orden de los mensajes en un escenario: usa un diagrama de secuencia.',
    'Para los servidores físicos donde corre cada pieza: eso es un diagrama de despliegue.',
  ],
  keyIdea: {
    title: 'Piezas con enchufes',
    text: 'Cada componente es una caja cerrada con dos tipos de conectores: piruletas (lo que ofrece) y enchufes (lo que necesita). El sistema funciona cuando cada enchufe encaja en una piruleta del mismo contrato. Mientras el contrato no cambie, cualquier pieza se puede reemplazar por otra.',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Pocas piezas en cadena, cada necesidad cubierta por un ensamble.' },
    { name: 'intermedio', description: 'Subsistemas, dependencias directas y sistemas externos.' },
    { name: 'avanzado', description: 'Una pasarela con varios servicios, cadenas de contratos y decisiones de arquitectura justificadas.' },
  ],
  howToRead: [
    { title: 'Identifica las piezas', text: 'Cada caja con el icono de componente es una pieza reemplazable: un servicio, un módulo, una biblioteca.', artifactTypes: [C.component] },
    { title: 'Mira qué ofrece cada una', text: 'La piruleta (círculo) es un contrato que la pieza ofrece a las demás.', artifactTypes: [C.providedInterface, C.provision] },
    { title: 'Mira qué necesita', text: 'El enchufe (semicírculo) es un contrato que la pieza necesita que otra le cumpla.', artifactTypes: [C.requiredInterface, C.requirement] },
    { title: 'Sigue los ensambles', text: 'Donde un enchufe se une a una piruleta, una pieza le da a otra lo que necesita.', artifactTypes: [C.assembly] },
    { title: 'Revisa las dependencias y los grupos', text: 'La flecha discontinua «use» es una dependencia directa; el subsistema agrupa piezas de un mismo área.', artifactTypes: [C.dependency, C.subsystem] },
  ],
  workshop: componentWorkshop,
};
