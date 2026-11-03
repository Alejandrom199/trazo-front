import type { DiagramGuide } from '@/core/registry';
import { DeploymentArtifact as D } from './artifactTypes';

/** Guía del diagrama de despliegue para la página Aprender. */
export const deploymentGuide: DiagramGuide = {
  summary:
    'Un diagrama de despliegue muestra dónde corre el software: en qué máquinas (nodos y dispositivos), sobre qué plataformas (entornos de ejecución), qué archivos se instalan en cada una y cómo se comunican por la red.',
  purposes: [
    'Planear la infraestructura: servidores, contenedores, bases de datos y redes.',
    'Saber qué archivo se instala dónde para desplegar o actualizar el sistema.',
    'Ver los protocolos y caminos de red para decidir puertos, cifrado y firewalls.',
  ],
  whenToUse: [
    'Antes de poner un sistema en producción o al mudarlo a la nube.',
    'Para documentar entornos (desarrollo, pruebas, producción).',
    'Para razonar sobre disponibilidad: réplicas, balanceadores, zonas.',
  ],
  whenNotToUse: [
    'Para la división lógica en piezas y contratos: usa un diagrama de componentes.',
    'Para el detalle de clases o el orden de los mensajes.',
  ],
  keyIdea: {
    title: 'Del archivo a la máquina',
    text: 'Lee el diagrama de dentro hacia fuera: cada artefacto (un archivo concreto) vive en un entorno de ejecución (Docker, la JVM), que corre en una máquina (un nodo o un dispositivo). Las líneas entre máquinas son la red, y su rótulo es el protocolo.',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Pocas máquinas con sus artefactos y un protocolo entre ellas.' },
    { name: 'intermedio', description: 'Entornos de ejecución dentro de las máquinas y dispositivos del usuario.' },
    { name: 'avanzado', description: 'Réplicas, balanceadores, colas y servicios externos con decisiones justificadas.' },
  ],
  howToRead: [
    { title: 'Ubica las máquinas', text: 'Cada cubo es un nodo (un servidor) o un dispositivo (un teléfono, un computador).', artifactTypes: [D.node, D.device] },
    { title: 'Entra en sus plataformas', text: 'Dentro de una máquina puede haber entornos de ejecución: contenedores o máquinas virtuales de un lenguaje.', artifactTypes: [D.executionEnvironment] },
    { title: 'Busca los archivos', text: 'Los artefactos son lo que se instala: api.jar, sitio.zip. Van dentro de donde corren o unidos con «deploy».', artifactTypes: [D.artifact, D.deployment] },
    { title: 'Sigue la red', text: 'Las líneas entre máquinas son caminos de comunicación, rotulados con el protocolo.', artifactTypes: [D.communicationPath] },
  ],
};
