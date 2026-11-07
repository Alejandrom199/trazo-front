import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { interactionOverviewSemantics } from '@/diagrams/shared/simpleSemantics';

const I = { frame: 'interactionOverviewFrame', interaction: 'interactionUse', decision: 'interactionDecision', start: 'interactionStart', end: 'interactionEnd', flow: 'interactionFlow' } as const;

const refName: PropertyDefinition = { kind: 'text', key: 'refName', label: 'Interacción referida', placeholder: 'p. ej. Validar disponibilidad', hint: 'Nombre de la secuencia o comunicación reutilizada' };

function loanLike(
  id: string,
  name: string,
  description: string,
  difficulty: SimpleTemplateSpec['difficulty'],
  labels: { i1: string; i3: string; i4: string; i5: string; i6: string; i7: string },
): SimpleTemplateSpec {
  return {
    id, name, description, difficulty, learningGoals: [I.frame, I.interaction, I.decision, I.flow],
    nodes: [
      { id: 'i1', type: I.frame, label: labels.i1, position: { x: 0, y: 0 }, size: { width: 1080, height: 480 } },
      { id: 'i2', type: I.start, label: 'Inicio', position: { x: 40, y: 190 }, parentId: 'i1' },
      { id: 'i3', type: I.interaction, label: labels.i3, position: { x: 170, y: 170 }, parentId: 'i1' },
      { id: 'i4', type: I.interaction, label: labels.i4, position: { x: 430, y: 170 }, parentId: 'i1' },
      { id: 'i5', type: I.decision, label: labels.i5, position: { x: 700, y: 175 }, parentId: 'i1' },
      { id: 'i6', type: I.interaction, label: labels.i6, position: { x: 820, y: 70 }, parentId: 'i1' },
      { id: 'i7', type: I.interaction, label: labels.i7, position: { x: 820, y: 300 }, parentId: 'i1' },
      { id: 'i8', type: I.end, label: 'Fin', position: { x: 980, y: 190 }, parentId: 'i1' },
    ],
    edges: [
      { id: 'e1', type: I.flow, sourceId: 'i2', targetId: 'i3' },
      { id: 'e2', type: I.flow, sourceId: 'i3', targetId: 'i4' },
      { id: 'e3', type: I.flow, sourceId: 'i4', targetId: 'i5' },
      { id: 'e4', type: I.flow, sourceId: 'i5', targetId: 'i6', label: 'sí' },
      { id: 'e5', type: I.flow, sourceId: 'i5', targetId: 'i7', label: 'no' },
      { id: 'e6', type: I.flow, sourceId: 'i6', targetId: 'i8' },
      { id: 'e7', type: I.flow, sourceId: 'i7', targetId: 'i8' },
    ],
  };
}

const templates: SimpleTemplateSpec[] = [
  loanLike('interaction-overview.library-loan', 'Recorrido de un préstamo', 'Encadena búsqueda, validación, registro o reserva como interacciones reutilizables.', 'básico', {
    i1: 'Gestionar préstamo', i3: 'Buscar libro', i4: 'Validar disponibilidad', i5: '¿Disponible?', i6: 'Registrar préstamo', i7: 'Crear reserva',
  }),
  loanLike('interaction-overview.login', 'Acceso con segundo factor', 'Combina credenciales, decisión de riesgo y verificación adicional.', 'básico', {
    i1: 'Autenticar usuario', i3: 'Validar credenciales', i4: 'Evaluar riesgo', i5: '¿Requiere 2FA?', i6: 'Verificar código', i7: 'Crear sesión',
  }),
  {
    id: 'interaction-overview.checkout', name: 'Checkout con inventario', description: 'Un camino lineal con decisión y compensación implícita al agotarse el stock.', difficulty: 'intermedio', learningGoals: [I.interaction, I.decision],
    nodes: [
      { id: 'c1', type: I.frame, label: 'Completar compra', position: { x: 0, y: 0 }, size: { width: 1000, height: 420 } },
      { id: 'c2', type: I.start, label: 'Inicio', position: { x: 30, y: 170 }, parentId: 'c1' },
      { id: 'c3', type: I.interaction, label: 'Calcular total', position: { x: 150, y: 150 }, parentId: 'c1' },
      { id: 'c4', type: I.interaction, label: 'Reservar inventario', position: { x: 400, y: 150 }, parentId: 'c1' },
      { id: 'c5', type: I.decision, label: '¿Hay stock?', position: { x: 660, y: 155 }, parentId: 'c1' },
      { id: 'c6', type: I.interaction, label: 'Procesar pago', position: { x: 780, y: 60 }, parentId: 'c1' },
      { id: 'c7', type: I.interaction, label: 'Informar agotado', position: { x: 780, y: 260 }, parentId: 'c1' },
      { id: 'c8', type: I.end, label: 'Fin', position: { x: 920, y: 170 }, parentId: 'c1' },
    ],
    edges: [
      { id: 'e1', type: I.flow, sourceId: 'c2', targetId: 'c3' },
      { id: 'e2', type: I.flow, sourceId: 'c3', targetId: 'c4' },
      { id: 'e3', type: I.flow, sourceId: 'c4', targetId: 'c5' },
      { id: 'e4', type: I.flow, sourceId: 'c5', targetId: 'c6', label: 'sí' },
      { id: 'e5', type: I.flow, sourceId: 'c5', targetId: 'c7', label: 'no' },
      { id: 'e6', type: I.flow, sourceId: 'c6', targetId: 'c8' },
      { id: 'e7', type: I.flow, sourceId: 'c7', targetId: 'c8' },
    ],
  },
  loanLike('interaction-overview.approval', 'Aprobación documental', 'Separa revisión, publicación y solicitud de cambios.', 'intermedio', {
    i1: 'Aprobar documento', i3: 'Enviar a revisión', i4: 'Revisar contenido', i5: '¿Aprobado?', i6: 'Publicar', i7: 'Solicitar cambios',
  }),
  {
    id: 'interaction-overview.booking', name: 'Reserva de viaje', description: 'Incluye un camino de compensación cuando falla un proveedor.', difficulty: 'avanzado', learningGoals: [I.decision, I.interaction, I.end],
    nodes: [
      { id: 'b1', type: I.frame, label: 'Reservar viaje', position: { x: 0, y: 0 }, size: { width: 1200, height: 500 } },
      { id: 'b2', type: I.start, label: 'Inicio', position: { x: 30, y: 200 }, parentId: 'b1' },
      { id: 'b3', type: I.interaction, label: 'Buscar opciones', position: { x: 150, y: 180 }, parentId: 'b1' },
      { id: 'b4', type: I.interaction, label: 'Bloquear recursos', position: { x: 400, y: 180 }, parentId: 'b1' },
      { id: 'b5', type: I.decision, label: '¿Todo confirmado?', position: { x: 660, y: 185 }, parentId: 'b1' },
      { id: 'b6', type: I.interaction, label: 'Emitir itinerario', position: { x: 800, y: 60 }, parentId: 'b1' },
      { id: 'b7', type: I.interaction, label: 'Compensar reservas', position: { x: 800, y: 300 }, parentId: 'b1' },
      { id: 'b8', type: I.end, label: 'Fin OK', position: { x: 1040, y: 75 }, parentId: 'b1' },
      { id: 'b9', type: I.end, label: 'Fin compensado', position: { x: 1040, y: 315 }, parentId: 'b1' },
    ],
    edges: [
      { id: 'e1', type: I.flow, sourceId: 'b2', targetId: 'b3' },
      { id: 'e2', type: I.flow, sourceId: 'b3', targetId: 'b4' },
      { id: 'e3', type: I.flow, sourceId: 'b4', targetId: 'b5' },
      { id: 'e4', type: I.flow, sourceId: 'b5', targetId: 'b6', label: 'sí' },
      { id: 'e5', type: I.flow, sourceId: 'b5', targetId: 'b7', label: 'no' },
      { id: 'e6', type: I.flow, sourceId: 'b6', targetId: 'b8' },
      { id: 'e7', type: I.flow, sourceId: 'b7', targetId: 'b9' },
    ],
  },
  loanLike('interaction-overview.incident', 'Respuesta a incidentes', 'Clasifica un incidente y dirige contención o resolución habitual.', 'avanzado', {
    i1: 'Gestionar incidente', i3: 'Recibir alerta', i4: 'Diagnosticar', i5: '¿Crítico?', i6: 'Activar emergencia', i7: 'Resolver normalmente',
  }),
];

export const interactionOverviewModule = createSimpleModule({
  diagramType: 'interactionOverview', displayName: 'Diagrama de descripción general de la interacción', defaultEdge: I.flow, semantics: interactionOverviewSemantics,
  nodes: [
    { type: I.frame, name: 'Marco de interacción', umlName: 'Interaction', category: 'agrupación', visual: 'frame', defaultLabel: 'Interacción', size: { width: 760, height: 440 }, notation: 'Marco que contiene el flujo de interacciones.', whatIs: 'El límite de una interacción compuesta.', whatFor: 'Reunir varios escenarios en un recorrido de alto nivel.', example: 'Gestionar préstamo', container: true, labelCaption: 'Nombre de la interacción' },
    { type: I.interaction, name: 'Uso de interacción', umlName: 'InteractionUse', category: 'fragmento combinado', visual: 'interaction', defaultLabel: 'Interacción', size: { width: 210, height: 80 }, notation: 'Rectángulo redondeado rotulado ref.', whatIs: 'Una referencia a otra interacción detallada.', whatFor: 'Reutilizar una secuencia sin copiar todos sus mensajes.', example: 'ref Validar disponibilidad', labelCaption: 'Referencia', properties: [refName] },
    { type: I.decision, name: 'Decisión', umlName: 'DecisionNode', category: 'nodo de control', visual: 'diamond', defaultLabel: '¿condición?', size: { width: 70, height: 70 }, notation: 'Rombo que divide el flujo.', whatIs: 'Una elección entre caminos alternativos.', whatFor: 'Mostrar qué interacción ocurre según una condición.', example: '¿Disponible?', labelCaption: 'Pregunta' },
    { type: I.start, name: 'Inicio', umlName: 'InitialNode', category: 'nodo de control', visual: 'stateBar', defaultLabel: 'Inicio', size: { width: 90, height: 42 }, notation: 'Punto de entrada del recorrido.', whatIs: 'El comienzo del flujo de interacciones.', whatFor: 'Indicar dónde empieza la lectura.', example: 'Inicio', hasLabel: false },
    { type: I.end, name: 'Fin', umlName: 'ActivityFinalNode', category: 'nodo de control', visual: 'stateBar', defaultLabel: 'Fin', size: { width: 90, height: 42 }, notation: 'Punto de salida del recorrido.', whatIs: 'El final del flujo.', whatFor: 'Indicar cuándo termina el escenario.', example: 'Fin', hasLabel: false },
  ],
  edges: [{ type: I.flow, name: 'Flujo de interacción', umlName: 'ActivityEdge', notation: 'Flecha continua entre pasos.', whatIs: 'Indica el orden entre interacciones y decisiones.', whatFor: 'Construir el recorrido de alto nivel.', example: 'Validar → Registrar', textCaption: 'Guarda o etiqueta' }],
  guide: {
    summary: 'Este diagrama combina la lógica de actividades con referencias a interacciones completas.',
    purposes: ['Dar una vista panorámica de escenarios complejos.', 'Conectar varias secuencias sin repetir sus mensajes.'],
    whenToUse: ['Cuando un proceso contiene varias interacciones reutilizables.', 'Para explicar rutas alternativas entre escenarios.'],
    whenNotToUse: ['Para detallar mensajes individuales.', 'Para procesos simples que caben en una secuencia.'],
    keyIdea: { title: 'Un mapa de interacciones', text: 'Cada bloque ref apunta a una interacción detallada; las flechas cuentan cómo se encadenan.' },
    howToRead: [
      { title: 'Empieza por el marco', text: 'El marco nombra la interacción completa.', artifactTypes: [I.frame] },
      { title: 'Sigue los usos', text: 'Cada ref resume una interacción que puede abrirse aparte.', artifactTypes: [I.interaction] },
      { title: 'Resuelve decisiones', text: 'Los rombos separan rutas antes de llegar al final.', artifactTypes: [I.decision, I.flow, I.start, I.end] },
    ],
  },
  templates,
});
