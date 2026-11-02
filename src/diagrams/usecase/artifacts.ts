import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { UseCaseArtifact as U } from './artifactTypes';

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const actor: ArtifactDefinition = {
  type: U.actor, diagramType: 'usecase', category: 'participante', name: 'Actor', umlName: 'Actor',
  notation: 'Una figura humana con su rol escrito debajo.',
  whatIs: 'Un rol externo que interactúa con el sistema: una persona, organización u otro sistema.',
  whatFor: 'Aclara quién solicita cada capacidad y quién recibe valor del sistema.',
  whyExists: 'Los requisitos necesitan un punto de vista: el actor indica para quién existe cada caso de uso.',
  whenToUse: ['Para roles que inician o participan en una función.', 'Para sistemas externos que intercambian información.'],
  whenNotToUse: ['Para departamentos internos si no interactúan con el sistema.', 'Para representar usuarios concretos con nombre propio.'],
  rules: ['Se nombra por su rol, no por una persona.', 'Normalmente queda fuera del límite del sistema.'],
  commonMistakes: ['Usar nombres como «Juan».', 'Dibujar componentes internos como actores.'],
  example: 'Cliente, Administrador, Pasarela de pago.', relatedArtifacts: [U.useCase, U.association, U.generalization], connectionRules: MANY,
};

const useCase: ArtifactDefinition = {
  type: U.useCase, diagramType: 'usecase', category: 'caso de uso', name: 'Caso de uso', umlName: 'UseCase',
  notation: 'Una elipse con una capacidad escrita en su interior.',
  whatIs: 'Una meta que un actor consigue usando el sistema.',
  whatFor: 'Describe qué ofrece el sistema sin decidir todavía cómo lo implementará.',
  whyExists: 'Convierte necesidades del negocio en capacidades verificables y comprensibles para usuarios y equipo técnico.',
  whenToUse: ['Para expresar un objetivo observable del actor.', 'Al delimitar el alcance funcional de una versión.'],
  whenNotToUse: ['Para pasos internos o algoritmos.', 'Para pantallas, botones o tablas de base de datos.'],
  rules: ['Se nombra con verbo en infinitivo y un objeto: «Consultar saldo».', 'Va dentro del límite del sistema.'],
  commonMistakes: ['Nombrarlo como sustantivo: «Factura».', 'Convertir cada paso de un proceso en un caso de uso.'],
  example: 'Comprar productos.', relatedArtifacts: [U.actor, U.association, U.include, U.extend, U.systemBoundary], connectionRules: MANY,
};

const systemBoundary: ArtifactDefinition = {
  type: U.systemBoundary, diagramType: 'usecase', category: 'agrupación', name: 'Límite del sistema', umlName: 'Subject',
  notation: 'Un rectángulo grande con el nombre del sistema en la parte superior.',
  whatIs: 'La frontera que separa las capacidades del sistema de sus actores externos.',
  whatFor: 'Hace visible qué pertenece al alcance y qué queda fuera.',
  whyExists: 'Sin una frontera, es fácil confundir responsabilidades del sistema con acciones del entorno.',
  whenToUse: ['En casi todo diagrama de contexto o alcance.', 'Cuando varios sistemas colaboran y hay que distinguirlos.'],
  whenNotToUse: ['Como agrupación decorativa.', 'Para modelar una fase del proceso.'],
  rules: ['Contiene casos de uso.', 'Los actores permanecen fuera.'],
  commonMistakes: ['Meter actores dentro.', 'Usar el nombre de una organización en lugar del sistema estudiado.'],
  example: 'Portal de ventas.', relatedArtifacts: [U.actor, U.useCase], connectionRules: NONE,
};

const association: ArtifactDefinition = {
  type: U.association, diagramType: 'usecase', category: 'conector', name: 'Asociación', umlName: 'Association',
  notation: 'Una línea continua sin flecha entre actor y caso de uso.',
  whatIs: 'Indica que un actor participa en un caso de uso.', whatFor: 'Muestra quién inicia o interviene en cada capacidad.',
  whyExists: 'Permite leer la responsabilidad funcional de cada actor.', whenToUse: ['Entre un actor y un caso de uso en el que participa.'],
  whenNotToUse: ['Entre dos casos de uso.', 'Para indicar orden temporal.'], rules: ['Une actor y caso de uso.', 'No expresa dirección ni secuencia.'],
  commonMistakes: ['Agregar flechas para indicar quién empieza.', 'Usarla entre casos de uso.'], example: 'Cliente — Comprar productos.',
  relatedArtifacts: [U.actor, U.useCase], connectionRules: NONE,
};

const include: ArtifactDefinition = {
  type: U.include, diagramType: 'usecase', category: 'conector', name: 'Inclusión', umlName: 'Include',
  notation: 'Dependencia discontinua con «include», dirigida al caso reutilizado.',
  whatIs: 'Un comportamiento obligatorio que el caso base siempre reutiliza.', whatFor: 'Evita repetir un subobjetivo común en varios casos de uso.',
  whyExists: 'Separa una capacidad compartida sin hacerla opcional.', whenToUse: ['Cuando el caso base siempre necesita el comportamiento incluido.'],
  whenNotToUse: ['Si ocurre solo bajo una condición: usa extensión.', 'Solo para descomponer un caso en pasos.'],
  rules: ['La flecha apunta al caso incluido.', 'Debe representar comportamiento obligatorio y reutilizable.'],
  commonMistakes: ['Invertir la flecha.', 'Usarlo para expresar una secuencia.'], example: 'Comprar productos incluye Procesar pago.',
  relatedArtifacts: [U.useCase, U.extend], connectionRules: NONE,
};

const extend: ArtifactDefinition = {
  type: U.extend, diagramType: 'usecase', category: 'conector', name: 'Extensión', umlName: 'Extend',
  notation: 'Dependencia discontinua con «extend», dirigida al caso base.',
  whatIs: 'Comportamiento opcional que se agrega al caso base cuando se cumple una condición.',
  whatFor: 'Modela variantes sin recargar el objetivo principal.', whyExists: 'El caso base debe seguir teniendo sentido aunque la extensión no ocurra.',
  whenToUse: ['Para promociones, excepciones o variantes opcionales.'], whenNotToUse: ['Si siempre ocurre: usa inclusión.'],
  rules: ['La flecha sale de la extensión y apunta al caso base.', 'La condición debe poder explicarse.'],
  commonMistakes: ['Tratar una parte obligatoria como extensión.', 'Invertir la flecha.'], example: 'Aplicar cupón extiende Comprar productos.',
  relatedArtifacts: [U.useCase, U.include], connectionRules: NONE,
};

const generalization: ArtifactDefinition = {
  type: U.generalization, diagramType: 'usecase', category: 'conector', name: 'Generalización de actor', umlName: 'Generalization',
  notation: 'Línea continua con triángulo abierto hacia el actor general.',
  whatIs: 'Indica que un actor especializado hereda las participaciones de otro actor más general.',
  whatFor: 'Evita repetir asociaciones comunes entre roles relacionados.', whyExists: 'Algunos roles comparten capacidades y uno añade otras propias.',
  whenToUse: ['Cuando el actor especializado puede hacer todo lo del actor general.'], whenNotToUse: ['Para organigramas o permisos casualmente parecidos.'],
  rules: ['La flecha apunta al actor general.', 'Solo une actores.'], commonMistakes: ['Invertir especialización y generalización.'],
  example: 'Administrador se especializa de Usuario registrado.', relatedArtifacts: [U.actor], connectionRules: NONE,
};

const note: ArtifactDefinition = {
  type: U.note, diagramType: 'usecase', category: 'anotación', name: 'Nota', umlName: 'Comment',
  notation: 'Rectángulo con una esquina doblada.', whatIs: 'Una aclaración que no cambia la semántica del modelo.',
  whatFor: 'Documenta una condición o decisión de alcance.', whyExists: 'Algunas restricciones necesitan contexto textual.',
  whenToUse: ['Para una aclaración breve que no cabe en la notación.'], whenNotToUse: ['Para sustituir casos de uso o relaciones.'],
  rules: ['Se ancla al elemento comentado.'], commonMistakes: ['Escribir requisitos completos dentro de notas.'],
  example: '«Solo disponible para clientes verificados».', relatedArtifacts: [U.annotationLink], connectionRules: MANY,
};

const annotationLink: ArtifactDefinition = {
  type: U.annotationLink, diagramType: 'usecase', category: 'conector', name: 'Anclaje de nota', umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta.', whatIs: 'Une una nota con el elemento que explica.', whatFor: 'Evita ambigüedad sobre el alcance del comentario.',
  whyExists: 'Una nota suelta puede interpretarse de varias formas.', whenToUse: ['Cuando una nota comenta un elemento concreto.'],
  whenNotToUse: ['Como asociación funcional.'], rules: ['Uno de sus extremos es una nota.'], commonMistakes: ['Usarlo como include.'],
  example: 'Nota anclada a Comprar productos.', relatedArtifacts: [U.note], connectionRules: NONE,
};

export const useCaseArtifacts: ArtifactDefinition[] = [
  actor, useCase, systemBoundary, note, association, include, extend, generalization, annotationLink,
];
