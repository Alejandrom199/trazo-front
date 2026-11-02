import type { DiagramGuide } from '@/core/registry';
import { ClassArtifact as C } from './artifactTypes';

export const classGuide: DiagramGuide = {
  summary: 'Un diagrama de clases muestra la estructura estable del sistema: conceptos, datos, operaciones y relaciones.',
  purposes: ['Acordar el vocabulario del dominio.', 'Distribuir responsabilidades antes de programar.', 'Distinguir asociaciones, propiedad, herencia y contratos.'],
  whenToUse: ['Después de descubrir conceptos y responsabilidades.', 'Al diseñar un dominio o una API orientada a objetos.', 'Para explicar una estructura compartida.'],
  whenNotToUse: ['Para narrar pasos: usa actividades.', 'Para ordenar mensajes: usa secuencia.', 'Para copiar cada tabla de la base de datos.'],
  keyIdea: { title: 'Modela responsabilidades, no tablas', text: 'Una clase existe porque conoce algo o hace algo importante. Sus relaciones expresan decisiones del dominio, no solo claves foráneas.' },
  difficultyCriteria: [{ name: 'básico', description: 'Pocos conceptos y asociaciones directas.' }, { name: 'intermedio', description: 'Multiplicidades, composición, enumeraciones y responsabilidades diferenciadas.' }, { name: 'avanzado', description: 'Abstracción, polimorfismo, contratos, adaptadores y propiedad justificada.' }],
  howToRead: [
    { title: 'Lee el nombre de cada concepto', text: 'La parte superior nombra la clase, interfaz o enumeración.', artifactTypes: [C.class, C.interface, C.enumeration] },
    { title: 'Revisa estado y comportamiento', text: 'El segundo compartimento contiene atributos; el tercero, operaciones.', artifactTypes: [C.class, C.abstractClass] },
    { title: 'Sigue las asociaciones', text: 'Nombre y multiplicidades explican cuántas instancias colaboran.', artifactTypes: [C.association] },
    { title: 'Distingue propiedad', text: 'El rombo blanco agrega partes independientes; el negro compone partes dependientes.', artifactTypes: [C.aggregation, C.composition] },
    { title: 'Reconoce contratos y herencia', text: 'El triángulo continuo generaliza; el discontinuo realiza una interfaz.', artifactTypes: [C.generalization, C.realization] },
  ],
};
