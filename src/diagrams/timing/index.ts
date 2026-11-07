import type { PropertyDefinition } from '@/core/registry';
import { createSimpleModule, type SimpleTemplateSpec } from '@/diagrams/shared/simpleModule';
import { timingSemantics } from '@/diagrams/shared/simpleSemantics';

const T = { lifeline: 'timingLifeline', state: 'stateInvariant', event: 'timeEvent', duration: 'durationConstraint' } as const;

const duration: PropertyDefinition = {
  kind: 'number', key: 'duration', label: 'Duración', min: 1, max: 1000, defaultValue: 1, unit: 'u',
};
const timeUnit: PropertyDefinition = {
  kind: 'select', key: 'timeUnit', label: 'Unidad de tiempo', defaultValue: 'day',
  options: [
    { value: 'ms', label: 'Milisegundos' },
    { value: 's', label: 'Segundos' },
    { value: 'min', label: 'Minutos' },
    { value: 'day', label: 'Días' },
  ],
};

function loanLike(
  id: string,
  name: string,
  description: string,
  difficulty: SimpleTemplateSpec['difficulty'],
  labels: { t1: string; t2: string; t3: string; t4: string; t5: string },
  edgeLabels: { e1: string; e2: string; e3: string; e4: string },
): SimpleTemplateSpec {
  return {
    id, name, description, difficulty, learningGoals: [T.lifeline, T.state, T.event, T.duration],
    nodes: [
      { id: 't1', type: T.lifeline, label: labels.t1, position: { x: 0, y: 50 }, size: { width: 900, height: 120 } },
      { id: 't2', type: T.state, label: labels.t2, position: { x: 80, y: 85 } },
      { id: 't3', type: T.state, label: labels.t3, position: { x: 330, y: 85 }, size: { width: 260, height: 46 } },
      { id: 't4', type: T.state, label: labels.t4, position: { x: 660, y: 85 } },
      { id: 't5', type: T.state, label: labels.t5, position: { x: 370, y: 260 } },
    ],
    edges: [
      { id: 'e1', type: T.event, sourceId: 't2', targetId: 't3', label: edgeLabels.e1 },
      { id: 'e2', type: T.event, sourceId: 't3', targetId: 't4', label: edgeLabels.e2 },
      { id: 'e3', type: T.event, sourceId: 't4', targetId: 't5', label: edgeLabels.e3 },
      { id: 'e4', type: T.duration, sourceId: 't3', targetId: 't5', label: edgeLabels.e4 },
    ],
  };
}

const templates: SimpleTemplateSpec[] = [
  loanLike('timing.library-loan', 'Vencimiento de un préstamo', 'El préstamo permanece activo quince días, vence y vuelve a cerrado al devolverse.', 'básico', {
    t1: 'Préstamo', t2: 'Solicitado', t3: 'Activo: días 0–15', t4: 'Vencido', t5: 'Devuelto',
  }, { e1: 'aprobar', e2: 'día 15', e3: 'devolver', e4: '{15 días}' }),
  loanLike('timing.traffic-light', 'Semáforo', 'Verde, amarillo y rojo con duraciones conocidas en un ciclo.', 'básico', {
    t1: 'Semáforo', t2: 'Verde', t3: 'Amarillo: 3 s', t4: 'Rojo', t5: 'Verde',
  }, { e1: 'temporizador', e2: '3 s', e3: '30 s', e4: '{ciclo}' }),
  loanLike('timing.session', 'Sesión de usuario', 'Una sesión pasa de activa a inactiva y expira tras media hora.', 'intermedio', {
    t1: 'Sesión', t2: 'Creada', t3: 'Activa: 0–30 min', t4: 'Inactiva', t5: 'Expirada',
  }, { e1: 'login', e2: 'sin actividad', e3: 'timeout', e4: '{30 min}' }),
  loanLike('timing.cache', 'Entrada de caché', 'La entrada es válida hasta su TTL y luego se refresca.', 'intermedio', {
    t1: 'CacheEntry', t2: 'Nueva', t3: 'Válida: TTL', t4: 'Vencida', t5: 'Refrescada',
  }, { e1: 'guardar', e2: 'TTL', e3: 'recargar', e4: '{≤ 5 min}' }),
  {
    id: 'timing.device', name: 'Dispositivo IoT', description: 'Dos líneas temporales: sensor y radio, con solape de transmisión.', difficulty: 'avanzado', learningGoals: [T.lifeline, T.state, T.event],
    nodes: [
      { id: 'd1', type: T.lifeline, label: 'Sensor', position: { x: 0, y: 20 }, size: { width: 880, height: 110 } },
      { id: 'd2', type: T.state, label: 'Reposo', position: { x: 60, y: 55 } },
      { id: 'd3', type: T.state, label: 'Muestreo: 100 ms', position: { x: 280, y: 55 }, size: { width: 220, height: 46 } },
      { id: 'd4', type: T.state, label: 'Listo', position: { x: 560, y: 55 } },
      { id: 'd5', type: T.lifeline, label: 'Radio', position: { x: 0, y: 200 }, size: { width: 880, height: 110 } },
      { id: 'd6', type: T.state, label: 'Apagada', position: { x: 60, y: 235 } },
      { id: 'd7', type: T.state, label: 'Transmitiendo', position: { x: 400, y: 235 }, size: { width: 220, height: 46 } },
      { id: 'd8', type: T.state, label: 'Apagada', position: { x: 700, y: 235 } },
    ],
    edges: [
      { id: 'e1', type: T.event, sourceId: 'd2', targetId: 'd3', label: 'despertar' },
      { id: 'e2', type: T.event, sourceId: 'd3', targetId: 'd4', label: 'muestra lista' },
      { id: 'e3', type: T.event, sourceId: 'd6', targetId: 'd7', label: 'enviar' },
      { id: 'e4', type: T.event, sourceId: 'd7', targetId: 'd8', label: 'ack' },
      { id: 'e5', type: T.duration, sourceId: 'd3', targetId: 'd7', label: '{100 ms}' },
    ],
  },
  loanLike('timing.protocol', 'Protocolo con reintento', 'Una petición espera ACK y reintenta al vencer el plazo.', 'avanzado', {
    t1: 'Cliente', t2: 'Preparado', t3: 'Esperando ACK', t4: 'Timeout', t5: 'Reintentando',
  }, { e1: 'enviar', e2: 'sin ACK', e3: 'reintentar', e4: '{2 s}' }),
];

export const timingModule = createSimpleModule({
  diagramType: 'timing', displayName: 'Diagrama de tiempos', defaultEdge: T.event, semantics: timingSemantics,
  nodes: [
    { type: T.lifeline, name: 'Línea de tiempo', umlName: 'Lifeline', category: 'participante', visual: 'timeLane', defaultLabel: 'Participante', size: { width: 680, height: 110 }, notation: 'Carril horizontal con el tiempo de izquierda a derecha.', whatIs: 'La evolución temporal de un participante.', whatFor: 'Ubicar cambios de estado sobre un eje temporal.', example: 'Préstamo', container: true, labelCaption: 'Participante', properties: [timeUnit] },
    { type: T.state, name: 'Invariante de estado', umlName: 'StateInvariant', category: 'estado', visual: 'stateBar', defaultLabel: 'Estado', size: { width: 180, height: 46 }, notation: 'Tramo horizontal rotulado con el estado.', whatIs: 'Un estado que se mantiene durante un intervalo.', whatFor: 'Mostrar cuánto dura cada condición.', example: 'Activo [día 0–15]', labelCaption: 'Estado', properties: [duration] },
  ],
  edges: [
    { type: T.event, name: 'Evento temporal', umlName: 'Message', category: 'mensaje', notation: 'Flecha que provoca un cambio en un instante.', whatIs: 'Un evento o mensaje que cambia el estado.', whatFor: 'Relacionar la causa con el momento del cambio.', example: 'día 15: vencer()', textCaption: 'Evento' },
    { type: T.duration, name: 'Restricción de duración', umlName: 'DurationConstraint', notation: 'Relación rotulada con una duración.', whatIs: 'Una condición sobre el tiempo transcurrido.', whatFor: 'Expresar límites temporales verificables.', example: '{duración ≤ 15 días}', dashed: true, arrow: null, textCaption: 'Restricción' },
  ],
  guide: {
    summary: 'Un diagrama de tiempos muestra estados y eventos sobre un eje temporal preciso.',
    purposes: ['Explicar cuándo cambia un estado.', 'Validar plazos, retardos y duraciones.'],
    whenToUse: ['En sistemas con restricciones de tiempo.', 'Para protocolos, dispositivos y vencimientos.'],
    whenNotToUse: ['Cuando solo importa el orden y no la duración.', 'Para describir estructura estática.'],
    keyIdea: { title: 'La distancia horizontal tiene significado', text: 'A diferencia de una secuencia, aquí importa cuánto tiempo se mantiene cada estado.' },
    howToRead: [
      { title: 'Identifica el carril', text: 'Cada línea representa un participante observado.', artifactTypes: [T.lifeline] },
      { title: 'Lee estados de izquierda a derecha', text: 'Cada barra mantiene un estado durante un intervalo.', artifactTypes: [T.state] },
      { title: 'Ubica eventos y límites', text: 'Los eventos cambian el estado y las restricciones fijan duraciones.', artifactTypes: [T.event, T.duration] },
    ],
  },
  templates,
});
