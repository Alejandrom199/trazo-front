import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { ComponentArtifact as C } from './artifactTypes';

/**
 * Catálogo del diagrama de componentes (UML 2.5, cláusula 11: Estructura).
 * Única fuente del conocimiento de cada artefacto: la paleta, las explicaciones y
 * la página Aprender leen de aquí.
 */

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const component: ArtifactDefinition = {
  type: C.component,
  diagramType: 'component',
  category: 'componente',
  name: 'Componente',
  umlName: 'Component',
  notation: 'Un rectángulo con su nombre y, en la esquina, el icono de componente (una caja con dos pestañas).',
  whatIs: 'Una pieza reemplazable del sistema que encapsula su implementación y se comunica solo a través de interfaces.',
  whatFor: 'Muestra en qué piezas se divide el sistema y cómo se conectan, sin entrar en sus clases internas.',
  whyExists: 'Para cambiar o reemplazar una pieza sin romper las demás, hay que saber qué ofrece y qué necesita cada una.',
  whenToUse: ['Para un servicio, un módulo o una biblioteca con responsabilidad propia.', 'Para un sistema externo con el que el tuyo se integra.'],
  whenNotToUse: ['Para una clase suelta: eso es un diagrama de clases.', 'Para el servidor físico donde corre: eso es un diagrama de despliegue.'],
  rules: ['Se nombra con un sustantivo: «Pedidos», «Pasarela de pago».', 'Se comunica con los demás mediante interfaces o dependencias, no por sus detalles internos.'],
  commonMistakes: ['Dibujar cada clase como un componente.', 'Unir componentes directamente sin decir qué contrato usan.'],
  example: '«Pedidos» ofrece IPedidos y necesita IPagos.',
  relatedArtifacts: [C.providedInterface, C.requiredInterface, C.dependency, C.subsystem],
  connectionRules: MANY,
};

const providedInterface: ArtifactDefinition = {
  type: C.providedInterface,
  diagramType: 'component',
  category: 'interfaz',
  name: 'Interfaz provista',
  umlName: 'Interface (provided)',
  notation: 'Un círculo (la «piruleta») unido al componente que la ofrece, con su nombre al lado.',
  whatIs: 'Un contrato que un componente ofrece a los demás: las operaciones que se le pueden pedir.',
  whatFor: 'Deja claro qué servicios expone una pieza, sin mostrar cómo los implementa.',
  whyExists: 'Si los demás dependen del contrato y no de la implementación, la pieza se puede cambiar sin romperlos.',
  whenToUse: ['Para cada API o conjunto de operaciones que una pieza pone a disposición.'],
  whenNotToUse: ['Para una operación interna que nadie más usa.'],
  rules: ['La ofrece un componente (línea continua hasta él).', 'Se nombra como un contrato: «IPedidos», «API de pagos».'],
  commonMistakes: ['Dejarla suelta, sin el componente que la provee.'],
  example: '«Pagos» ofrece IPagos.',
  relatedArtifacts: [C.requiredInterface, C.provision, C.assembly],
  connectionRules: MANY,
};

const requiredInterface: ArtifactDefinition = {
  type: C.requiredInterface,
  diagramType: 'component',
  category: 'interfaz',
  name: 'Interfaz requerida',
  umlName: 'Interface (required)',
  notation: 'Un semicírculo (el «enchufe») unido al componente que la necesita.',
  whatIs: 'Un contrato que un componente necesita que otro le cumpla para poder funcionar.',
  whatFor: 'Muestra de qué depende cada pieza, en términos de contrato y no de una pieza concreta.',
  whyExists: 'Hace visibles las dependencias: si nadie ofrece lo que una pieza necesita, el sistema está incompleto.',
  whenToUse: ['Para cada servicio externo a la pieza que esta usa: pagos, correo, almacenamiento.'],
  whenNotToUse: ['Para algo que la propia pieza resuelve por dentro.'],
  rules: ['La necesita un componente (línea continua hasta él).', 'Se conecta con un ensamble a la interfaz provista que la cumple.'],
  commonMistakes: ['Dejarla sin ensamblar: nadie cumple lo que la pieza necesita.'],
  example: '«Pedidos» necesita IPagos.',
  relatedArtifacts: [C.providedInterface, C.requirement, C.assembly],
  connectionRules: MANY,
};

const subsystem: ArtifactDefinition = {
  type: C.subsystem,
  diagramType: 'component',
  category: 'agrupación',
  name: 'Subsistema',
  umlName: 'Component «subsystem»',
  notation: 'Un rectángulo grande con «subsystem» y su nombre, que encierra componentes.',
  whatIs: 'Un componente mayor que agrupa a otros que se diseñan, despliegan o entregan juntos.',
  whatFor: 'Organiza sistemas grandes en bloques comprensibles.',
  whyExists: 'Con muchas piezas, agruparlas por área (ventas, pagos…) hace legible el conjunto.',
  whenToUse: ['Para agrupar los componentes de un área de negocio o de un equipo.'],
  whenNotToUse: ['Para agrupar sin un criterio claro: solo añade ruido.'],
  rules: ['Los componentes se colocan dentro arrastrándolos.', 'No se conecta: se conectan sus componentes.'],
  commonMistakes: ['Usarlo como un componente más con interfaces propias.'],
  example: '«Ventas» agrupa Carrito y Pedidos.',
  relatedArtifacts: [C.component],
  connectionRules: NONE,
};

const note: ArtifactDefinition = {
  type: C.note,
  diagramType: 'component',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Un rectángulo con la esquina doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario libre sobre el diseño.',
  whatFor: 'Explicar una decisión: por qué una pieza es independiente, qué tecnología usa, qué restricción tiene.',
  whyExists: 'Las decisiones de arquitectura necesitan su justificación cerca del dibujo.',
  whenToUse: ['Para justificar una separación o una dependencia.'],
  whenNotToUse: ['Para describir lo que el diagrama ya muestra.'],
  rules: ['Se ancla al elemento que comenta.'],
  commonMistakes: ['Dejarla suelta.'],
  example: 'Nota en «Pasarela»: «único punto de entrada; autentica y enruta».',
  relatedArtifacts: [C.annotationLink],
  connectionRules: NONE,
};

const relation = (definition: Omit<ArtifactDefinition, 'diagramType' | 'category' | 'connectionRules'>): ArtifactDefinition => ({
  ...definition,
  diagramType: 'component',
  category: 'conector',
  connectionRules: NONE,
});

const provision = relation({
  type: C.provision,
  name: 'Provisión',
  umlName: 'InterfaceRealization (provided)',
  notation: 'Línea continua entre el componente y la piruleta de la interfaz que ofrece.',
  whatIs: 'Indica que el componente ofrece (implementa) esa interfaz.',
  whatFor: 'Une cada contrato con la pieza que lo cumple.',
  whyExists: 'Sin ella no se sabe quién responde a la interfaz.',
  whenToUse: ['Entre un componente y cada interfaz que ofrece.'],
  whenNotToUse: ['Entre dos componentes: usa una dependencia o un ensamble.'],
  rules: ['Une un componente con una interfaz provista.'],
  commonMistakes: ['Unir la piruleta a un componente que en realidad la consume.'],
  example: '«Pagos» — IPagos.',
  relatedArtifacts: [C.providedInterface, C.component],
});

const requirement = relation({
  type: C.requirement,
  name: 'Requerimiento',
  umlName: 'Usage (required)',
  notation: 'Línea continua entre el componente y el enchufe de la interfaz que necesita.',
  whatIs: 'Indica que el componente necesita esa interfaz.',
  whatFor: 'Hace visible cada dependencia de la pieza en forma de contrato.',
  whyExists: 'Permite cambiar quién cumple el contrato sin tocar a quien lo necesita.',
  whenToUse: ['Entre un componente y cada interfaz que usa.'],
  whenNotToUse: ['Para lo que la pieza resuelve por sí misma.'],
  rules: ['Une un componente con una interfaz requerida.'],
  commonMistakes: ['Confundirla con la provisión.'],
  example: '«Pedidos» — IPagos (enchufe).',
  relatedArtifacts: [C.requiredInterface, C.component],
});

const assembly = relation({
  type: C.assembly,
  name: 'Ensamble',
  umlName: 'Connector (assembly)',
  notation: 'Línea que une un enchufe (interfaz requerida) con una piruleta (interfaz provista).',
  whatIs: 'El acoplamiento entre lo que una pieza necesita y lo que otra ofrece.',
  whatFor: 'Muestra quién cumple cada necesidad del sistema.',
  whyExists: 'Es el punto donde dos piezas independientes se conectan a través de un contrato.',
  whenToUse: ['Entre una interfaz requerida y la provista que la cumple.'],
  whenNotToUse: ['Entre dos componentes directamente.'],
  rules: ['Une una interfaz requerida con una provista.', 'Ambas interfaces deberían ser el mismo contrato (mismo nombre).'],
  commonMistakes: ['Ensamblar contratos distintos.'],
  example: 'IPagos (de Pedidos) — IPagos (de Pagos).',
  relatedArtifacts: [C.requiredInterface, C.providedInterface],
});

const dependency = relation({
  type: C.dependency,
  name: 'Dependencia',
  umlName: 'Dependency «use»',
  notation: 'Flecha discontinua con punta abierta, normalmente rotulada «use».',
  whatIs: 'Indica que un componente usa a otro directamente, sin una interfaz explícita de por medio.',
  whatFor: 'Mostrar dependencias simples cuando dibujar el contrato no aporta.',
  whyExists: 'Las dependencias deciden el orden de construcción y el impacto de cada cambio.',
  whenToUse: ['Cuando una pieza usa a otra y el contrato no es importante en el diagrama.'],
  whenNotToUse: ['Si quieres poder reemplazar la pieza usada: modela su interfaz.'],
  rules: ['Va del componente que usa al usado.', 'Evita los ciclos: hacen imposible separar las piezas.'],
  commonMistakes: ['Crear ciclos A → B → A.'],
  example: '«Pagos» «use» «Banco externo».',
  relatedArtifacts: [C.component],
});

const annotationLink = relation({
  type: C.annotationLink,
  name: 'Anclaje de nota',
  umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta entre una nota y lo que comenta.',
  whatIs: 'La unión entre una nota y el elemento al que se refiere.',
  whatFor: 'Deja claro de qué habla cada comentario.',
  whyExists: 'Una nota suelta no se sabe a qué se refiere.',
  whenToUse: ['Siempre que una nota comenta un elemento concreto.'],
  whenNotToUse: ['Para unir componentes.'],
  rules: ['Solo une una nota con otro elemento.'],
  commonMistakes: ['Usarla como dependencia.'],
  example: 'Nota anclada a «Pasarela».',
  relatedArtifacts: [C.note],
});

export const componentArtifacts: ArtifactDefinition[] = [
  component,
  providedInterface,
  requiredInterface,
  subsystem,
  note,
  provision,
  requirement,
  assembly,
  dependency,
  annotationLink,
];
