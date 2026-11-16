import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { ErArtifact as E } from './artifactTypes';

/**
 * Catálogo del diagrama entidad-relación (MER, notación de Chen; no es UML).
 * Única fuente del conocimiento de cada artefacto: la paleta, las explicaciones
 * y la página Aprender leen de aquí.
 */

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const entity: ArtifactDefinition = {
  type: E.entity,
  diagramType: 'er',
  category: 'entidad',
  name: 'Entidad',
  umlName: 'Entity',
  notation: 'Un rectángulo con el nombre en singular.',
  whatIs: 'Algo del mundo real de lo que se guardan datos: una persona, un objeto, un hecho.',
  whatFor: 'Cada entidad será una tabla de la base de datos.',
  whyExists: 'Para diseñar la base de datos primero hay que saber de qué cosas se guarda información.',
  whenToUse: ['Para cada concepto con datos propios y que se identifica por sí mismo: Cliente, Producto, Pedido.'],
  whenNotToUse: ['Para un dato suelto de otra cosa: eso es un atributo.', 'Para una acción entre entidades: eso es una relación.'],
  rules: ['Se nombra con un sustantivo en singular.', 'Necesita un atributo clave que identifique cada ocurrencia.', 'Se dibuja una sola vez en el diagrama.'],
  commonMistakes: ['Nombrarla en plural («Clientes»).', 'Olvidar su clave.', 'Unirla directamente a otra entidad sin rombo.'],
  example: '«Cliente», identificado por «id_cliente».',
  relatedArtifacts: [E.keyAttribute, E.relationship, E.weakEntity],
  connectionRules: MANY,
};

const weakEntity: ArtifactDefinition = {
  type: E.weakEntity,
  diagramType: 'er',
  category: 'entidad',
  name: 'Entidad débil',
  umlName: 'Weak entity',
  notation: 'Un rectángulo doble.',
  whatIs: 'Una entidad que no se identifica por sí sola: necesita la clave de otra (su dueña).',
  whatFor: 'Modelar lo que solo existe dentro de otra cosa: la línea de un pedido, la cuota de un préstamo.',
  whyExists: '«Línea 3» no dice nada sola; «línea 3 del pedido 1024», sí. Su clave combina la de su dueña.',
  whenToUse: ['Cuando algo se numera o identifica dentro de otra entidad y desaparece con ella.'],
  whenNotToUse: ['Si tiene una clave propia única en todo el sistema: es una entidad normal.'],
  rules: ['Participa en una relación identificadora (rombo doble) con su dueña.', 'Su clave parcial se combina con la clave de la dueña.'],
  commonMistakes: ['Dibujarla sin su relación identificadora.', 'Hacer débil algo que tiene identidad propia.'],
  example: '«Línea de pedido», que depende de «Pedido».',
  relatedArtifacts: [E.identifyingRelationship, E.entity],
  connectionRules: MANY,
};

const relationship: ArtifactDefinition = {
  type: E.relationship,
  diagramType: 'er',
  category: 'relación de datos',
  name: 'Relación',
  umlName: 'Relationship',
  notation: 'Un rombo con un verbo, unido con líneas a las entidades que relaciona.',
  whatIs: 'Una asociación entre entidades: qué tiene que ver una con otra.',
  whatFor: 'Según sus cardinalidades se convierte en una clave foránea (1:N) o en una tabla intermedia (N:M).',
  whyExists: 'Los datos sueltos no bastan: hay que saber qué cliente hizo qué pedido.',
  whenToUse: ['Para cada vínculo entre entidades que el sistema debe recordar.'],
  whenNotToUse: ['Para unir un atributo con su entidad: eso es una línea directa.'],
  rules: ['Se nombra con un verbo: «realiza», «contiene», «presta».', 'Une al menos dos papeles (o la misma entidad dos veces, si es recursiva).', 'Cada línea lleva la cardinalidad (mín,máx) de esa entidad.'],
  commonMistakes: ['Dejar líneas sin cardinalidad.', 'Nombrarla con un sustantivo.', 'Usarla para unir dos relaciones.'],
  example: '«Cliente» (0,N) realiza (1,1) «Pedido».',
  relatedArtifacts: [E.participation, E.entity],
  connectionRules: MANY,
};

const identifyingRelationship: ArtifactDefinition = {
  type: E.identifyingRelationship,
  diagramType: 'er',
  category: 'relación de datos',
  name: 'Relación identificadora',
  umlName: 'Identifying relationship',
  notation: 'Un rombo doble entre una entidad débil y su dueña.',
  whatIs: 'La relación de la que una entidad débil toma su identidad.',
  whatFor: 'Dice de qué entidad depende la débil y cuya clave hereda.',
  whyExists: 'Sin ella, la entidad débil no tendría cómo identificarse.',
  whenToUse: ['Siempre que dibujes una entidad débil: la une con su dueña.'],
  whenNotToUse: ['Entre dos entidades fuertes: usa una relación normal.'],
  rules: ['Une una entidad débil con la entidad fuerte de la que depende.', 'Del lado de la débil, la participación es total: (1,1).'],
  commonMistakes: ['Usarla entre entidades fuertes.', 'Olvidar la cardinalidad de cada lado.'],
  example: '«Pedido» (1,N) contiene (1,1) «Línea de pedido».',
  relatedArtifacts: [E.weakEntity, E.relationship],
  connectionRules: MANY,
};

const attribute: ArtifactDefinition = {
  type: E.attribute,
  diagramType: 'er',
  category: 'atributo',
  name: 'Atributo',
  umlName: 'Attribute',
  notation: 'Un óvalo con el nombre, unido con una línea a su entidad o relación.',
  whatIs: 'Un dato que se guarda de una entidad o de una relación.',
  whatFor: 'Cada atributo será una columna de la tabla.',
  whyExists: 'Las entidades se describen por sus datos: nombre, precio, fecha.',
  whenToUse: ['Para cada dato simple que se guarda: nombre, correo, precio.', 'Unido a otro atributo, forma uno compuesto (dirección → calle, ciudad).'],
  whenNotToUse: ['Si el dato tiene datos propios y se relaciona con otras cosas: probablemente es una entidad.'],
  rules: ['Pertenece a una sola entidad o relación.', 'Se nombra con un sustantivo: «nombre», «fecha_alta».'],
  commonMistakes: ['Dejarlo suelto.', 'Repetir el mismo dato en dos entidades.'],
  example: '«nombre» y «correo» de «Cliente».',
  relatedArtifacts: [E.keyAttribute, E.multivaluedAttribute, E.derivedAttribute],
  connectionRules: MANY,
};

const keyAttribute: ArtifactDefinition = {
  ...attribute,
  type: E.keyAttribute,
  name: 'Atributo clave',
  umlName: 'Key attribute',
  notation: 'Un óvalo con el nombre subrayado.',
  whatIs: 'El dato que identifica cada ocurrencia de una entidad: no se repite.',
  whatFor: 'Será la clave primaria de la tabla.',
  whyExists: 'Sin un identificador, dos clientes con el mismo nombre serían indistinguibles.',
  whenToUse: ['Uno por entidad fuerte: un código, un número de documento, un id.'],
  whenNotToUse: ['Para datos que pueden repetirse o cambiar, como el nombre.'],
  rules: ['Toda entidad fuerte tiene uno.', 'Su valor es único y no cambia.'],
  commonMistakes: ['Usar el nombre como clave.', 'Olvidarlo.'],
  example: '«isbn» de «Libro».',
  relatedArtifacts: [E.entity, E.attribute],
};

const multivaluedAttribute: ArtifactDefinition = {
  ...attribute,
  type: E.multivaluedAttribute,
  name: 'Atributo multivaluado',
  umlName: 'Multivalued attribute',
  notation: 'Un óvalo doble.',
  whatIs: 'Un dato que puede tener varios valores para la misma ocurrencia.',
  whatFor: 'Avisa que, en tablas, irá en una tabla aparte (una fila por valor).',
  whyExists: 'Una persona puede tener varios teléfonos: no caben en una sola columna.',
  whenToUse: ['Para listas de valores simples: teléfonos, correos, etiquetas.'],
  whenNotToUse: ['Si cada valor tiene datos propios: conviene una entidad.'],
  rules: ['Pertenece a una sola entidad o relación.'],
  commonMistakes: ['Usar un atributo simple para guardar varios valores separados por comas.'],
  example: '«teléfonos» de «Cliente».',
  relatedArtifacts: [E.attribute],
};

const derivedAttribute: ArtifactDefinition = {
  ...attribute,
  type: E.derivedAttribute,
  name: 'Atributo derivado',
  umlName: 'Derived attribute',
  notation: 'Un óvalo con borde discontinuo.',
  whatIs: 'Un dato que se calcula a partir de otros y no hace falta guardar.',
  whatFor: 'Deja claro qué datos se calculan, para no guardarlos dos veces.',
  whyExists: 'La edad cambia sola cada año; guardarla la deja vieja. Se calcula de la fecha de nacimiento.',
  whenToUse: ['Para totales, edades, antigüedades: lo que sale de otros datos.'],
  whenNotToUse: ['Para datos que se ingresan: son atributos normales.'],
  rules: ['Debe poder calcularse con los otros atributos del modelo.'],
  commonMistakes: ['Guardarlo como columna y dejar que se desactualice.'],
  example: '«edad», calculada desde «fecha_nacimiento».',
  relatedArtifacts: [E.attribute],
};

const note: ArtifactDefinition = {
  type: E.note,
  diagramType: 'er',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Note',
  notation: 'Un rectángulo con la esquina doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario sobre una entidad, relación o atributo.',
  whatFor: 'Explicar una regla de negocio o una decisión del modelo.',
  whyExists: 'No todo cabe en la notación: «un pedido sin pagar se anula a las 24 h».',
  whenToUse: ['Para reglas que el diagrama no puede expresar.'],
  whenNotToUse: ['Para repetir lo que el dibujo ya dice.'],
  rules: ['Se ancla a lo que comenta con una línea discontinua.'],
  commonMistakes: ['Dejarla suelta.'],
  example: '«El correo es único por cliente».',
  relatedArtifacts: [],
  connectionRules: MANY,
};

const attributeLink: ArtifactDefinition = {
  type: E.attributeLink,
  diagramType: 'er',
  category: 'conector',
  name: 'Línea de atributo',
  umlName: 'Attribute link',
  notation: 'Una línea simple, sin flecha, entre el atributo y su dueño.',
  whatIs: 'Indica a qué entidad o relación pertenece un atributo.',
  whatFor: 'Dice en qué tabla irá cada columna.',
  whyExists: 'Un óvalo suelto no dice de quién es el dato.',
  whenToUse: ['Entre cada atributo y su entidad o relación.', 'Entre un atributo compuesto y sus partes.'],
  whenNotToUse: ['Entre entidades: usa un rombo de relación.'],
  rules: ['Une un atributo con una sola entidad o relación.'],
  commonMistakes: ['Unir el mismo atributo a dos entidades.'],
  example: '«correo» — «Cliente».',
  relatedArtifacts: [E.attribute],
  connectionRules: NONE,
};

const participation: ArtifactDefinition = {
  type: E.participation,
  diagramType: 'er',
  category: 'conector',
  name: 'Participación',
  umlName: 'Participation',
  notation: 'Una línea entre la entidad y el rombo, con la cardinalidad (mín,máx) junto a la entidad.',
  whatIs: 'El papel que juega una entidad en una relación, y cuántas veces participa.',
  whatFor: 'La cardinalidad decide la tabla: 1:N es una clave foránea; N:M, una tabla intermedia.',
  whyExists: '«Un cliente hace muchos pedidos, un pedido es de un solo cliente» es una regla del negocio que la base de datos debe respetar.',
  whenToUse: ['Entre cada entidad y cada relación en la que participa.'],
  whenNotToUse: ['Entre un atributo y su dueño: eso es una línea de atributo.'],
  rules: ['Lleva la cardinalidad: (0,1), (1,1), (0,N) o (1,N).', 'El mínimo 1 indica participación obligatoria.'],
  commonMistakes: ['Dejarla sin cardinalidad.', 'Invertir los lados: la cardinalidad va junto a la entidad que describe.'],
  example: '«Cliente» (0,N) — realiza.',
  relatedArtifacts: [E.relationship, E.entity],
  connectionRules: NONE,
};

const annotationLink: ArtifactDefinition = {
  ...attributeLink,
  type: E.annotationLink,
  category: 'anotación',
  name: 'Anclaje de nota',
  umlName: 'Annotation link',
  notation: 'Una línea discontinua entre la nota y lo que comenta.',
  whatIs: 'Une una nota con el elemento que explica.',
  whatFor: 'Deja claro a qué se refiere el comentario.',
  whyExists: 'Una nota suelta no dice de qué habla.',
  whenToUse: ['Entre cada nota y lo que comenta.'],
  whenNotToUse: ['Entre elementos del modelo.'],
  rules: ['Uno de sus extremos es una nota.'],
  commonMistakes: ['Anclar una nota a otra nota.'],
  example: 'Nota — «Pedido».',
  relatedArtifacts: [E.note],
};

export const erArtifacts: ArtifactDefinition[] = [
  entity,
  weakEntity,
  relationship,
  identifyingRelationship,
  attribute,
  keyAttribute,
  multivaluedAttribute,
  derivedAttribute,
  note,
  attributeLink,
  participation,
  annotationLink,
];
