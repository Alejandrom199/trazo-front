import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { communicationSemantics } from '@/diagrams/shared/simpleSemantics';

const C = { participant: 'communicationParticipant', actor: 'communicationActor', link: 'communicationLink', message: 'numberedMessage' } as const;

const role: PropertyDefinition = { kind: 'text', key: 'role', label: 'Rol', placeholder: 'p. ej. :Portal', hint: 'Nombre de rol o clasificador del participante' };
const actorKind: PropertyDefinition = {
  kind: 'select', key: 'actorKind', label: 'Tipo de actor', defaultValue: 'human',
  options: [
    { value: 'human', label: 'Persona' },
    { value: 'system', label: 'Sistema externo' },
    { value: 'timer', label: 'Temporizador' },
  ],
};

const star: SimpleTemplateSpec = {
  id: 'communication.library-loan', name: 'Colaboración para prestar un libro', description: 'La red del préstamo muestra quién habla con quién y numera cada petición.', difficulty: 'básico', learningGoals: [C.actor, C.participant, C.message],
  nodes: [
    { id: 'n1', type: C.actor, label: 'Estudiante', position: { x: 0, y: 220 } },
    { id: 'n2', type: C.participant, label: 'portal: Portal', position: { x: 300, y: 40 } },
    { id: 'n3', type: C.participant, label: 'catalogo: Catálogo', position: { x: 720, y: 40 } },
    { id: 'n4', type: C.participant, label: 'prestamos: Servicio', position: { x: 300, y: 360 } },
  ],
  edges: [
    { id: 'e1', type: C.message, sourceId: 'n1', targetId: 'n2', label: '1: solicitarPréstamo()' },
    { id: 'e2', type: C.message, sourceId: 'n2', targetId: 'n3', label: '2: consultarDisponibilidad()' },
    { id: 'e3', type: C.message, sourceId: 'n2', targetId: 'n4', label: '3: crearPréstamo()' },
    { id: 'e4', type: C.message, sourceId: 'n4', targetId: 'n1', label: '4: confirmar()' },
  ],
};

const templates: SimpleTemplateSpec[] = [
  star,
  {
    id: 'communication.login', name: 'Inicio de sesión', description: 'Usuario, pantalla, autenticación y base de datos con numeración anidada.', difficulty: 'básico', learningGoals: [C.actor, C.message],
    nodes: [
      { id: 'a1', type: C.actor, label: 'Usuario', position: { x: 0, y: 180 } },
      { id: 'a2', type: C.participant, label: 'pantalla: Login', position: { x: 260, y: 40 } },
      { id: 'a3', type: C.participant, label: 'auth: ServicioAuth', position: { x: 560, y: 40 } },
      { id: 'a4', type: C.participant, label: 'db: Usuarios', position: { x: 560, y: 300 } },
    ],
    edges: [
      { id: 'e1', type: C.message, sourceId: 'a1', targetId: 'a2', label: '1: iniciarSesión()' },
      { id: 'e2', type: C.message, sourceId: 'a2', targetId: 'a3', label: '1.1: validar()' },
      { id: 'e3', type: C.message, sourceId: 'a3', targetId: 'a4', label: '1.2: buscarUsuario()' },
      { id: 'e4', type: C.message, sourceId: 'a3', targetId: 'a1', label: '2: mostrarInicio()' },
    ],
  },
  {
    id: 'communication.checkout', name: 'Confirmar una compra', description: 'Checkout coordina inventario y pagos desde una sola fachada.', difficulty: 'intermedio', learningGoals: [C.participant, C.message],
    nodes: [
      { id: 'b1', type: C.actor, label: 'Cliente', position: { x: 0, y: 220 } },
      { id: 'b2', type: C.participant, label: 'checkout: Pantalla', position: { x: 300, y: 40 } },
      { id: 'b3', type: C.participant, label: 'stock: Inventario', position: { x: 720, y: 40 } },
      { id: 'b4', type: C.participant, label: 'pagos: Pasarela', position: { x: 300, y: 360 } },
    ],
    edges: [
      { id: 'e1', type: C.message, sourceId: 'b1', targetId: 'b2', label: '1: confirmar()' },
      { id: 'e2', type: C.message, sourceId: 'b2', targetId: 'b3', label: '2: reservarStock()' },
      { id: 'e3', type: C.message, sourceId: 'b2', targetId: 'b4', label: '3: autorizarPago()' },
      { id: 'e4', type: C.message, sourceId: 'b4', targetId: 'b1', label: '4: mostrarResultado()' },
    ],
  },
  {
    id: 'communication.trip', name: 'Reservar un viaje', description: 'Una agencia coordina dos proveedores distintos.', difficulty: 'intermedio', learningGoals: [C.actor, C.participant],
    nodes: [
      { id: 't1', type: C.actor, label: 'Viajero', position: { x: 0, y: 200 } },
      { id: 't2', type: C.participant, label: 'agencia: Portal', position: { x: 280, y: 200 } },
      { id: 't3', type: C.participant, label: 'vuelos: Proveedor', position: { x: 580, y: 40 } },
      { id: 't4', type: C.participant, label: 'hotel: Proveedor', position: { x: 580, y: 340 } },
    ],
    edges: [
      { id: 'e1', type: C.message, sourceId: 't1', targetId: 't2', label: '1: reservar()' },
      { id: 'e2', type: C.message, sourceId: 't2', targetId: 't3', label: '2: bloquearVuelo()' },
      { id: 'e3', type: C.message, sourceId: 't2', targetId: 't4', label: '3: bloquearHabitación()' },
      { id: 'e4', type: C.message, sourceId: 't3', targetId: 't1', label: '4: confirmar()' },
    ],
  },
  {
    id: 'communication.fraud', name: 'Evaluación antifraude', description: 'Pago, señales y reglas colaboran antes de autorizar.', difficulty: 'avanzado', learningGoals: [C.message],
    nodes: [
      { id: 'f1', type: C.actor, label: 'Comercio', position: { x: 0, y: 160 } },
      { id: 'f2', type: C.participant, label: 'pago: Orquestador', position: { x: 280, y: 160 } },
      { id: 'f3', type: C.participant, label: 'señales: RiskData', position: { x: 560, y: 40 } },
      { id: 'f4', type: C.participant, label: 'reglas: FraudEngine', position: { x: 560, y: 280 } },
    ],
    edges: [
      { id: 'e1', type: C.message, sourceId: 'f1', targetId: 'f2', label: '1: autorizar()' },
      { id: 'e2', type: C.message, sourceId: 'f2', targetId: 'f3', label: '1.1: obtenerSeñales()' },
      { id: 'e3', type: C.message, sourceId: 'f2', targetId: 'f4', label: '1.2: evaluarRiesgo()' },
      { id: 'e4', type: C.message, sourceId: 'f4', targetId: 'f1', label: '2: decisión()' },
    ],
  },
  {
    id: 'communication.saga', name: 'Saga de pedido', description: 'Un orquestador coordina inventario y cobro, y puede compensar.', difficulty: 'avanzado', learningGoals: [C.participant, C.message],
    nodes: [
      { id: 's1', type: C.actor, label: 'Cliente', position: { x: 0, y: 220 } },
      { id: 's2', type: C.participant, label: 'saga: Orquestador', position: { x: 300, y: 40 } },
      { id: 's3', type: C.participant, label: 'stock: Inventario', position: { x: 720, y: 40 } },
      { id: 's4', type: C.participant, label: 'cobro: Pagos', position: { x: 300, y: 360 } },
    ],
    edges: [
      { id: 'e1', type: C.message, sourceId: 's1', targetId: 's2', label: '1: crearPedido()' },
      { id: 'e2', type: C.message, sourceId: 's2', targetId: 's3', label: '2: reservar()' },
      { id: 'e3', type: C.message, sourceId: 's2', targetId: 's4', label: '3: cobrar()' },
      { id: 'e4', type: C.message, sourceId: 's4', targetId: 's1', label: '4: resultado()' },
    ],
  },
];

export const communicationModule = createSimpleModule({
  diagramType: 'communication', displayName: 'Diagrama de comunicación', defaultEdge: C.message, semantics: communicationSemantics,
  nodes: [
    { type: C.participant, name: 'Participante', umlName: 'Lifeline', category: 'participante', visual: 'object', defaultLabel: 'objeto: Tipo', size: { width: 180, height: 70 }, notation: 'Rectángulo de objeto subrayado.', whatIs: 'Un participante que intercambia mensajes.', whatFor: 'Mostrar la red de colaboración alrededor de un escenario.', example: 'portal: PortalBiblioteca', labelCaption: 'Participante', properties: [role] },
    { type: C.actor, name: 'Actor', umlName: 'Actor', category: 'participante', visual: 'box', defaultLabel: 'Actor', size: { width: 130, height: 70 }, notation: 'Participante externo identificado por su rol.', whatIs: 'Una persona o sistema externo que inicia la comunicación.', whatFor: 'Dar contexto al escenario.', example: 'Estudiante', labelCaption: 'Actor', properties: [actorKind] },
  ],
  edges: [
    { type: C.link, name: 'Enlace', umlName: 'Connector', notation: 'Línea entre participantes.', whatIs: 'El canal estructural por el que pueden viajar mensajes.', whatFor: 'Mostrar quién puede comunicarse directamente.', example: 'Portal — Catálogo', arrow: null },
    { type: C.message, name: 'Mensaje numerado', umlName: 'Message', category: 'mensaje', notation: 'Flecha rotulada con un número de orden.', whatIs: 'Una petición o respuesta dentro de la colaboración.', whatFor: 'Conservar el orden sin usar un eje vertical de tiempo.', example: '2: consultarDisponibilidad()', defaultLabel: '1: mensaje()', textCaption: 'Número y mensaje' },
  ],
  guide: {
    summary: 'Un diagrama de comunicación muestra participantes como una red y numera los mensajes para conservar su orden.',
    purposes: ['Destacar la estructura de colaboración.', 'Ver qué participantes están más acoplados.'],
    whenToUse: ['Cuando importa más la red que la línea temporal.', 'Como vista complementaria de una secuencia.'],
    whenNotToUse: ['Cuando el orden temporal complejo es la información principal.', 'Para mostrar infraestructura física.'],
    keyIdea: { title: 'El número reemplaza al eje del tiempo', text: 'La posición no indica el orden: lo hacen 1, 1.1, 2 y los demás números de los mensajes.' },
    howToRead: [
      { title: 'Ubica participantes', text: 'Cada objeto o actor es un nodo de la colaboración.', artifactTypes: [C.participant, C.actor] },
      { title: 'Observa enlaces', text: 'Un enlace indica que dos participantes pueden comunicarse.', artifactTypes: [C.link] },
      { title: 'Ordena mensajes', text: 'Lee los números antes del texto del mensaje.', artifactTypes: [C.message] },
    ],
  },
  templates,
});
