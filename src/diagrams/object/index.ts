import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { objectSemantics } from '@/diagrams/shared/simpleSemantics';

const O = { object: 'objectInstance', value: 'valueSpecification', link: 'objectLink' } as const;

const classifierProp: PropertyDefinition = {
  kind: 'text',
  key: 'classifier',
  label: 'Clasificador',
  placeholder: 'p. ej. Préstamo',
  hint: 'La clase de la que esta instancia es un ejemplo',
};
const slotName: PropertyDefinition = {
  kind: 'text',
  key: 'slotName',
  label: 'Nombre del slot',
  placeholder: 'p. ej. estado',
};
const slotValue: PropertyDefinition = {
  kind: 'text',
  key: 'slotValue',
  label: 'Valor',
  placeholder: 'p. ej. Activo',
};

const templates: SimpleTemplateSpec[] = [
  {
    id: 'object.library-loan',
    name: 'Instancias de un préstamo',
    description: 'Una estudiante, un ejemplar y un préstamo activo vistos como objetos concretos.',
    difficulty: 'básico',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 'o1', type: O.object, label: 'ana: Estudiante', position: { x: 0, y: 40 } },
      { id: 'o2', type: O.object, label: 'prestamo42: Préstamo', position: { x: 330, y: 40 } },
      { id: 'o3', type: O.object, label: 'ejemplar8: Ejemplar', position: { x: 660, y: 40 } },
      { id: 'o4', type: O.value, label: 'estado = Activo', position: { x: 335, y: 180 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 'o1', targetId: 'o2', label: 'solicita' },
      { id: 'e2', type: O.link, sourceId: 'o2', targetId: 'o3', label: 'incluye' },
      { id: 'e3', type: O.link, sourceId: 'o2', targetId: 'o4', label: 'tiene' },
    ],
  },
  {
    id: 'object.shopping-cart',
    name: 'Carrito de compra',
    description: 'Un cliente posee un carrito con dos líneas de producto y una cantidad.',
    difficulty: 'básico',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 'c1', type: O.object, label: 'lucia: Cliente', position: { x: 40, y: 30 } },
      { id: 'c2', type: O.object, label: 'carrito9: Carrito', position: { x: 320, y: 30 } },
      { id: 'c3', type: O.object, label: 'teclado: Producto', position: { x: 600, y: 0 } },
      { id: 'c4', type: O.object, label: 'mouse: Producto', position: { x: 600, y: 140 } },
      { id: 'c5', type: O.value, label: 'cantidad = 2', position: { x: 320, y: 200 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 'c1', targetId: 'c2', label: 'posee' },
      { id: 'e2', type: O.link, sourceId: 'c2', targetId: 'c3', label: 'contiene' },
      { id: 'e3', type: O.link, sourceId: 'c2', targetId: 'c4', label: 'contiene' },
      { id: 'e4', type: O.link, sourceId: 'c2', targetId: 'c5', label: 'registra' },
    ],
  },
  {
    id: 'object.hotel-room',
    name: 'Reserva de hotel',
    description: 'Una reserva enlaza huésped y habitación, con estado y noches.',
    difficulty: 'intermedio',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 'h1', type: O.object, label: 'carlos: Huésped', position: { x: 0, y: 80 } },
      { id: 'h2', type: O.object, label: 'reserva18: Reserva', position: { x: 300, y: 80 } },
      { id: 'h3', type: O.object, label: 'hab204: Habitación', position: { x: 620, y: 80 } },
      { id: 'h4', type: O.value, label: 'estado = Confirmada', position: { x: 160, y: 230 } },
      { id: 'h5', type: O.value, label: 'noches = 3', position: { x: 420, y: 230 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 'h1', targetId: 'h2', label: 'realiza' },
      { id: 'e2', type: O.link, sourceId: 'h2', targetId: 'h3', label: 'asigna' },
      { id: 'e3', type: O.link, sourceId: 'h2', targetId: 'h4' },
      { id: 'e4', type: O.link, sourceId: 'h2', targetId: 'h5' },
    ],
  },
  {
    id: 'object.school-enrollment',
    name: 'Matrícula universitaria',
    description: 'Una estudiante obtiene una matrícula que califica una asignatura.',
    difficulty: 'intermedio',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 's1', type: O.object, label: 'maria: Estudiante', position: { x: 40, y: 40 } },
      { id: 's2', type: O.object, label: 'matricula31: Matrícula', position: { x: 360, y: 40 } },
      { id: 's3', type: O.object, label: 'cs101: Asignatura', position: { x: 360, y: 220 } },
      { id: 's4', type: O.value, label: 'nota = 9.2', position: { x: 620, y: 40 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 's1', targetId: 's2', label: 'obtiene' },
      { id: 'e2', type: O.link, sourceId: 's2', targetId: 's3', label: 'incluye' },
      { id: 'e3', type: O.link, sourceId: 's2', targetId: 's4', label: 'califica' },
    ],
  },
  {
    id: 'object.iot-reading',
    name: 'Lectura de sensores',
    description: 'Una medición concreta une dispositivo, ubicación y temperatura observada.',
    difficulty: 'avanzado',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 'i1', type: O.object, label: 'sensor7: Dispositivo', position: { x: 0, y: 0 } },
      { id: 'i2', type: O.object, label: 'lectura88: Medición', position: { x: 280, y: 120 } },
      { id: 'i3', type: O.object, label: 'bodegaA: Ubicación', position: { x: 0, y: 240 } },
      { id: 'i4', type: O.value, label: 'temperatura = 28°C', position: { x: 560, y: 120 } },
      { id: 'i5', type: O.value, label: 'humedad = 61%', position: { x: 560, y: 220 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 'i1', targetId: 'i2', label: 'produce' },
      { id: 'e2', type: O.link, sourceId: 'i2', targetId: 'i3', label: 'ocurre en' },
      { id: 'e3', type: O.link, sourceId: 'i2', targetId: 'i4' },
      { id: 'e4', type: O.link, sourceId: 'i2', targetId: 'i5' },
    ],
  },
  {
    id: 'object.distributed-cache',
    name: 'Caché distribuida',
    description: 'Una entrada se replica entre dos nodos con una versión observable.',
    difficulty: 'avanzado',
    learningGoals: [O.object, O.value, O.link],
    nodes: [
      { id: 'd1', type: O.object, label: 'nodoA: Servidor', position: { x: 0, y: 40 } },
      { id: 'd2', type: O.object, label: 'clave42: EntradaCache', position: { x: 300, y: 40 } },
      { id: 'd3', type: O.object, label: 'nodoB: Servidor', position: { x: 600, y: 40 } },
      { id: 'd4', type: O.value, label: 'versión = 17', position: { x: 300, y: 220 } },
      { id: 'd5', type: O.value, label: 'ttl = 60s', position: { x: 0, y: 220 } },
    ],
    edges: [
      { id: 'e1', type: O.link, sourceId: 'd1', targetId: 'd2', label: 'almacena' },
      { id: 'e2', type: O.link, sourceId: 'd2', targetId: 'd3', label: 'replica en' },
      { id: 'e3', type: O.link, sourceId: 'd2', targetId: 'd4', label: 'versiona' },
      { id: 'e4', type: O.link, sourceId: 'd1', targetId: 'd5', label: 'controla' },
    ],
  },
];

export const objectModule = createSimpleModule({
  diagramType: 'object',
  displayName: 'Diagrama de objetos',
  defaultEdge: O.link,
  semantics: objectSemantics,
  nodes: [
    {
      type: O.object,
      name: 'Objeto',
      umlName: 'InstanceSpecification',
      category: 'clasificador',
      visual: 'object',
      defaultLabel: 'objeto: Clase',
      size: { width: 180, height: 70 },
      notation: 'Rectángulo con el nombre de la instancia y su clase subrayados.',
      whatIs: 'Una instancia concreta de una clase en un momento determinado.',
      whatFor: 'Mostrar datos reales que ejemplifican el modelo de clases.',
      example: 'prestamo42: Préstamo',
      labelCaption: 'Instancia',
      properties: [classifierProp],
    },
    {
      type: O.value,
      name: 'Valor',
      umlName: 'Slot',
      category: 'nodo de objeto',
      visual: 'box',
      defaultLabel: 'atributo = valor',
      size: { width: 170, height: 52 },
      notation: 'Compartimento o caja con atributo y valor.',
      whatIs: 'El valor concreto de una propiedad del objeto.',
      whatFor: 'Explicar el estado de una instancia con datos.',
      example: 'estado = Activo',
      labelCaption: 'Asignación',
      properties: [slotName, slotValue],
    },
  ],
  edges: [{
    type: O.link,
    name: 'Enlace',
    umlName: 'Link',
    notation: 'Línea continua entre objetos.',
    whatIs: 'Una instancia concreta de una asociación.',
    whatFor: 'Mostrar qué objetos están relacionados en la fotografía.',
    example: 'estudiante7 — prestamo42',
    arrow: null,
    textCaption: 'Rol del enlace',
  }],
  guide: {
    summary: 'Un diagrama de objetos es una fotografía de instancias concretas y sus enlaces en un instante.',
    purposes: ['Validar un modelo de clases con datos reales.', 'Explicar ejemplos y escenarios concretos.'],
    whenToUse: ['Cuando una abstracción de clases resulta difícil de entender.', 'Para comprobar multiplicidades con instancias.'],
    whenNotToUse: ['Para modelar todos los datos de producción.', 'Para mostrar comportamiento a lo largo del tiempo.'],
    keyIdea: { title: 'Es una fotografía, no el molde', text: 'La clase define el tipo; el objeto muestra un caso concreto con identidad y valores.' },
    howToRead: [
      { title: 'Identifica las instancias', text: 'El nombre subrayado sigue la forma instancia: Clase.', artifactTypes: [O.object] },
      { title: 'Revisa los valores', text: 'Los valores describen el estado concreto de cada instancia.', artifactTypes: [O.value] },
      { title: 'Sigue los enlaces', text: 'Cada línea materializa una asociación del modelo de clases.', artifactTypes: [O.link] },
    ],
  },
  templates,
});
