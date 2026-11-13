import type { DiagramGuide } from '@/core/registry';
import { PackageArtifact as P } from './artifactTypes';
import { packageWorkshop } from './workshop';

/** Guía del diagrama de paquetes para la página Aprender. */
export const packageGuide: DiagramGuide = {
  summary:
    'Un diagrama de paquetes muestra cómo se organiza un sistema en grupos (paquetes) y hacia dónde apuntan las dependencias entre ellos. Es el mapa de la arquitectura a gran escala.',
  purposes: [
    'Dividir un sistema grande en partes con responsabilidades claras.',
    'Controlar el sentido de las dependencias: qué capa puede usar a cuál.',
    'Detectar ciclos y acoplamientos que dificultan cambiar el sistema.',
  ],
  whenToUse: [
    'Al definir las capas o módulos de un sistema.',
    'Para explicar la arquitectura a alguien nuevo en el proyecto.',
    'Antes de dividir un monolito en servicios.',
  ],
  whenNotToUse: [
    'Para el detalle de cada clase: usa un diagrama de clases.',
    'Para las piezas desplegables y sus interfaces: usa un diagrama de componentes.',
  ],
  keyIdea: {
    title: 'Las flechas apuntan hacia lo estable',
    text: 'Cada flecha dice «este depende de aquel». En una buena arquitectura las dependencias van de lo que cambia mucho (la interfaz, la infraestructura) hacia lo que cambia poco (el dominio), y nunca forman un círculo.',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Pocos paquetes en capas, con dependencias en un solo sentido.' },
    { name: 'intermedio', description: 'Paquetes anidados e importaciones «import» y «access».' },
    { name: 'avanzado', description: 'Dependencias invertidas con interfaces y ciclos resueltos.' },
  ],
  howToRead: [
    { title: 'Ubica los paquetes', text: 'Cada carpeta es un paquete; su nombre va en la pestaña.', artifactTypes: [P.package] },
    { title: 'Mira qué contienen', text: 'Dentro van sus clases, interfaces o subpaquetes.', artifactTypes: [P.element] },
    { title: 'Sigue las flechas', text: 'Una flecha discontinua va del que usa al usado. «import» y «access» son importaciones de nombres: pública y privada.', artifactTypes: [P.dependency, P.packageImport, P.packageAccess] },
    { title: 'Busca círculos', text: 'Si siguiendo flechas vuelves al punto de partida, hay un ciclo: esos paquetes no se pueden separar.', artifactTypes: [P.dependency] },
  ],
  workshop: packageWorkshop,
};
