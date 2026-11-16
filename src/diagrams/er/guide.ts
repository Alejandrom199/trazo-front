import type { DiagramGuide } from '@/core/registry';
import { ErArtifact as E } from './artifactTypes';

/** Guía del diagrama entidad-relación para la página Aprender. */
export const erGuide: DiagramGuide = {
  summary:
    'El modelo entidad-relación (MER) describe qué datos guarda un sistema: las entidades, sus atributos y cómo se relacionan. Es el plano de la base de datos antes de escribir una sola tabla. No es parte de UML: Trazo usa la notación de Chen.',
  purposes: [
    'Acordar con el negocio qué información se guarda y cómo se relaciona.',
    'Decidir las tablas, sus claves primarias y sus claves foráneas.',
    'Detectar a tiempo datos repetidos o sin dueño.',
  ],
  whenToUse: [
    'Antes de crear la base de datos de un sistema nuevo.',
    'Para explicar una base de datos existente a alguien nuevo.',
    'Al agregar un módulo que guarda datos nuevos.',
  ],
  whenNotToUse: [
    'Para el comportamiento del sistema: usa actividades o secuencia.',
    'Para las clases del código con sus operaciones: usa un diagrama de clases.',
  ],
  keyIdea: {
    title: 'La cardinalidad decide las tablas',
    text: 'Cada entidad es una tabla y su clave, la clave primaria. Cada relación 1:N se vuelve una clave foránea del lado N; cada N:M, una tabla intermedia con las dos claves. Por eso cada línea entre entidad y rombo lleva su (mín,máx).',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Dos o tres entidades con sus claves y relaciones 1:N o N:M.' },
    { name: 'intermedio', description: 'Atributos en las relaciones, multivaluados y derivados.' },
    { name: 'avanzado', description: 'Entidades débiles, relaciones identificadoras, recursivas y atributos compuestos.' },
  ],
  howToRead: [
    { title: 'Ubica las entidades', text: 'Cada rectángulo es una cosa de la que se guardan datos; el rectángulo doble depende de otra.', artifactTypes: [E.entity, E.weakEntity] },
    { title: 'Lee sus atributos', text: 'Los óvalos son sus datos; el subrayado es la clave, el doble tiene varios valores y el discontinuo se calcula.', artifactTypes: [E.keyAttribute, E.attribute, E.multivaluedAttribute, E.derivedAttribute] },
    { title: 'Sigue las relaciones', text: 'Cada rombo une entidades con un verbo: «Cliente realiza Pedido».', artifactTypes: [E.relationship, E.identifyingRelationship] },
    { title: 'Lee las cardinalidades', text: '(mín,máx) junto a cada entidad: cuántas veces participa. (0,N) es «ninguna o muchas»; (1,1), «exactamente una».', artifactTypes: [E.participation] },
  ],
};
