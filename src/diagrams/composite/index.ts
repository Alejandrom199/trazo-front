import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { compositeSemantics } from '@/diagrams/shared/simpleSemantics';

const C = { classifier: 'structuredClassifier', part: 'part', port: 'port', connector: 'connector', delegation: 'delegationConnector' } as const;

const partType: PropertyDefinition = { kind: 'text', key: 'partType', label: 'Tipo', placeholder: 'p. ej. PrestamosService', hint: 'Clasificador que tipa esta parte' };
const multiplicity: PropertyDefinition = { kind: 'text', key: 'multiplicity', label: 'Multiplicidad', placeholder: '1', defaultValue: '1', hint: 'Cuántas instancias de la parte existen' };
const portKind: PropertyDefinition = {
  kind: 'select', key: 'portKind', label: 'Clase de puerto', defaultValue: 'provided',
  options: [
    { value: 'provided', label: 'Provisto' },
    { value: 'required', label: 'Requerido' },
    { value: 'behavior', label: 'De comportamiento' },
  ],
};

function interior(id: string, name: string, description: string, difficulty: SimpleTemplateSpec['difficulty'], labels: [string, string, string, string, string]): SimpleTemplateSpec {
  const [classifier, port, partA, partB, partC] = labels;
  return {
    id, name, description, difficulty, learningGoals: [C.classifier, C.part, C.port, C.connector, C.delegation],
    nodes: [
      { id: 'c1', type: C.classifier, label: classifier, position: { x: 0, y: 0 }, size: { width: 760, height: 390 } },
      { id: 'c2', type: C.port, label: port, position: { x: -12, y: 160 }, parentId: 'c1' },
      { id: 'c3', type: C.part, label: partA, position: { x: 80, y: 130 }, parentId: 'c1' },
      { id: 'c4', type: C.part, label: partB, position: { x: 320, y: 130 }, parentId: 'c1' },
      { id: 'c5', type: C.part, label: partC, position: { x: 550, y: 130 }, parentId: 'c1' },
    ],
    edges: [
      { id: 'e1', type: C.delegation, sourceId: 'c2', targetId: 'c3' },
      { id: 'e2', type: C.connector, sourceId: 'c3', targetId: 'c4' },
      { id: 'e3', type: C.connector, sourceId: 'c4', targetId: 'c5' },
    ],
  };
}

const templates: SimpleTemplateSpec[] = [
  interior('composite.library-loans', 'Interior del servicio de préstamos', 'El puerto HTTP delega en un controlador, que usa el servicio y el repositorio.', 'básico', ['Servicio de Préstamos', 'HTTP', 'controlador: PrestamosController', 'servicio: PrestamosService', 'repositorio: IPrestamoRepo']),
  interior('composite.shopping-cart', 'Interior del carrito', 'La API delega en el controlador, el cálculo de totales y los precios.', 'básico', ['Carrito', 'API', 'controlador: CartController', 'calculo: Totales', 'precios: IPrecios']),
  {
    id: 'composite.payment', name: 'Procesador de pagos', description: 'Un puerto de cobro reparte hacia autorización, antifraude y registro en paralelo lógico.', difficulty: 'intermedio', learningGoals: [C.port, C.part, C.delegation],
    nodes: [
      { id: 'p1', type: C.classifier, label: 'Procesador de Pagos', position: { x: 0, y: 0 }, size: { width: 780, height: 400 } },
      { id: 'p2', type: C.port, label: 'Cobros', position: { x: -12, y: 170 }, parentId: 'p1' },
      { id: 'p3', type: C.part, label: 'orquestador: PaymentFacade', position: { x: 80, y: 150 }, parentId: 'p1' },
      { id: 'p4', type: C.part, label: 'autorizador: BancoAdapter', position: { x: 360, y: 60 }, parentId: 'p1' },
      { id: 'p5', type: C.part, label: 'antifraude: MotorRiesgo', position: { x: 360, y: 170 }, parentId: 'p1' },
      { id: 'p6', type: C.part, label: 'registro: Ledger', position: { x: 360, y: 280 }, parentId: 'p1' },
    ],
    edges: [
      { id: 'e1', type: C.delegation, sourceId: 'p2', targetId: 'p3' },
      { id: 'e2', type: C.connector, sourceId: 'p3', targetId: 'p4' },
      { id: 'e3', type: C.connector, sourceId: 'p3', targetId: 'p5' },
      { id: 'e4', type: C.connector, sourceId: 'p3', targetId: 'p6' },
    ],
  },
  interior('composite.notifications', 'Centro de notificaciones', 'Un puerto de mensajes coordina plantillas, cola y proveedor de correo.', 'intermedio', ['Notificaciones', 'Mensajes', 'plantillas: Renderer', 'cola: Broker', 'proveedor: EmailGateway']),
  {
    id: 'composite.robot', name: 'Controlador de robot', description: 'Telemetría entra por un puerto y alimenta sensores, planificador y actuadores.', difficulty: 'avanzado', learningGoals: [C.classifier, C.port, C.part],
    nodes: [
      { id: 'r1', type: C.classifier, label: 'Controlador de Robot', position: { x: 0, y: 0 }, size: { width: 800, height: 420 } },
      { id: 'r2', type: C.port, label: 'Telemetría', position: { x: -12, y: 80 }, parentId: 'r1' },
      { id: 'r3', type: C.port, label: 'Comandos', position: { x: 788, y: 280 }, parentId: 'r1' },
      { id: 'r4', type: C.part, label: 'sensores: SensorHub', position: { x: 80, y: 70 }, parentId: 'r1' },
      { id: 'r5', type: C.part, label: 'plan: MotionPlanner', position: { x: 320, y: 160 }, parentId: 'r1' },
      { id: 'r6', type: C.part, label: 'actuadores: MotorDriver', position: { x: 560, y: 250 }, parentId: 'r1' },
    ],
    edges: [
      { id: 'e1', type: C.delegation, sourceId: 'r2', targetId: 'r4' },
      { id: 'e2', type: C.connector, sourceId: 'r4', targetId: 'r5' },
      { id: 'e3', type: C.connector, sourceId: 'r5', targetId: 'r6' },
      { id: 'e4', type: C.delegation, sourceId: 'r3', targetId: 'r6' },
    ],
  },
  interior('composite.streaming', 'Motor de streaming', 'La entrada delega en búfer, codificador y distribuidor.', 'avanzado', ['Streaming Engine', 'Entrada', 'buffer: FrameBuffer', 'codec: Encoder', 'salida: Distributor']),
];

export const compositeModule = createSimpleModule({
  diagramType: 'composite', displayName: 'Diagrama de estructura compuesta', defaultEdge: C.connector, semantics: compositeSemantics,
  nodes: [
    { type: C.classifier, name: 'Clasificador estructurado', umlName: 'StructuredClassifier', category: 'clasificador', visual: 'frame', defaultLabel: 'Sistema', size: { width: 620, height: 340 }, notation: 'Marco del clasificador con sus partes dentro.', whatIs: 'Una clase o componente cuyo interior se muestra.', whatFor: 'Explicar la estructura interna de una pieza.', example: 'Servicio de Préstamos', container: true, labelCaption: 'Clasificador' },
    { type: C.part, name: 'Parte', umlName: 'Part', category: 'componente', visual: 'part', defaultLabel: 'parte: Tipo', size: { width: 180, height: 80 }, notation: 'Rectángulo dentro del clasificador, con nombre y tipo.', whatIs: 'Un rol interno que forma parte del clasificador.', whatFor: 'Mostrar quién colabora dentro de la pieza.', example: 'repositorio: RepositorioPrestamos', labelCaption: 'Rol', properties: [partType, multiplicity] },
    { type: C.port, name: 'Puerto', umlName: 'Port', category: 'interfaz', visual: 'port', defaultLabel: 'puerto', size: { width: 24, height: 24 }, notation: 'Cuadrado pequeño sobre el borde.', whatIs: 'Un punto de interacción de la pieza.', whatFor: 'Separar la comunicación externa de la estructura interna.', example: 'apiPrestamos', labelCaption: 'Puerto', properties: [portKind] },
  ],
  edges: [
    { type: C.connector, name: 'Conector', umlName: 'Connector', notation: 'Línea entre partes o puertos.', whatIs: 'Un enlace de comunicación dentro de la estructura.', whatFor: 'Mostrar qué partes colaboran.', example: 'controlador — servicio', arrow: null, textCaption: 'Contrato' },
    { type: C.delegation, name: 'Delegación', umlName: 'DelegationConnector', notation: 'Conector desde un puerto externo a una parte interna.', whatIs: 'Delega una petición recibida hacia una parte.', whatFor: 'Explicar cómo entra una interacción al interior.', example: 'apiPrestamos → controlador', dashed: true, arrow: null },
  ],
  guide: {
    summary: 'Un diagrama de estructura compuesta abre una clase o componente para mostrar sus partes, puertos y conectores internos.',
    purposes: ['Explicar la colaboración interna de una pieza.', 'Mostrar cómo los puertos delegan hacia partes internas.'],
    whenToUse: ['Cuando la caja de un componente oculta decisiones importantes.', 'Para diseñar ensamblajes internos.'],
    whenNotToUse: ['Para el mapa general de componentes.', 'Para mostrar orden temporal.'],
    keyIdea: { title: 'Abrir la caja negra', text: 'El clasificador sigue siendo una sola pieza desde fuera, pero el diagrama revela sus colaboradores internos.' },
    howToRead: [
      { title: 'Delimita la pieza', text: 'El marco define el clasificador que se está abriendo.', artifactTypes: [C.classifier] },
      { title: 'Reconoce las partes', text: 'Cada parte cumple un rol interno.', artifactTypes: [C.part] },
      { title: 'Sigue puertos y conectores', text: 'Los puertos reciben interacciones y los conectores las conducen.', artifactTypes: [C.port, C.connector, C.delegation] },
    ],
  },
  templates,
});
