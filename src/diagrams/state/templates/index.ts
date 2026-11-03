import type { Template } from '@/core/model';
import { StateArtifact as S } from '../artifactTypes';
import { createStateTemplateBuilder } from './templateBuilder';

/** Básico: la vida de un préstamo de la biblioteca, con dos formas de terminar. */
const bookLoan = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -100, y: 46 });
  const requested = b.state('Solicitado', { x: 0, y: 30 });
  const active = b.state('Activo', { x: 360, y: 30 });
  const returned = b.state('Devuelto', { x: 720, y: 30 });
  const overdue = b.state('Vencido', { x: 360, y: 260 });
  const done = b.final({ x: 1000, y: 44 });
  const rejected = b.final({ x: 59, y: 260 });
  b.connect(start, requested);
  b.connect(requested, active, 'aprobar');
  b.connect(requested, rejected, 'rechazar');
  b.connect(active, returned, 'devolver');
  b.connect(active, overdue, 'tras 15 días');
  b.connect(overdue, returned, 'devolver / cobrar multa', [{ x: 795, y: 290 }]);
  b.connect(returned, done);
  return b.build({
    id: 'state.book-loan',
    name: 'Préstamo de un libro',
    description: 'Un préstamo se solicita, se aprueba o se rechaza, y termina devuelto: a tiempo o con multa si venció.',
    difficulty: 'básico',
    learningGoals: [S.initial, S.state, S.transition, S.final],
  });
})();

/** Básico: una puerta, que nunca «termina»: no tiene estado final. */
const door = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -100, y: 16 });
  const open = b.state('Abierta', { x: 0, y: 0 });
  const closed = b.state('Cerrada', { x: 360, y: 0 });
  const locked = b.state('Con llave', { x: 720, y: 0 });
  b.connect(start, open);
  b.connect(open, closed, 'cerrar');
  b.connect(closed, open, 'abrir', [{ x: 435, y: 150 }, { x: 75, y: 150 }]);
  b.connect(closed, locked, 'echar llave');
  b.connect(locked, closed, 'quitar llave', [{ x: 795, y: -100 }, { x: 435, y: -100 }]);
  return b.build({
    id: 'state.door',
    name: 'Puerta',
    description: 'Una puerta pasa de abierta a cerrada y de cerrada a con llave, y vuelve. No tiene estado final: nunca deja de existir.',
    difficulty: 'básico',
    learningGoals: [S.state, S.transition, S.initial],
  });
})();

/** Intermedio: un pedido en línea, con una elección según la respuesta del banco. */
const onlineOrder = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -100, y: 16 });
  const created = b.state('Creado', { x: 0, y: 0 });
  const validating = b.state('Validando pago', { x: 360, y: 0 });
  const decision = b.choice({ x: 720, y: 12 });
  const paid = b.state('Pagado', { x: 940, y: 0 });
  const shipped = b.state('Enviado', { x: 940, y: 240 });
  const delivered = b.state('Entregado', { x: 940, y: 480 });
  const cancelled = b.state('Cancelado', { x: 0, y: 240 });
  const done = b.final({ x: 999, y: 660 });
  const cancelledEnd = b.final({ x: 59, y: 440 });
  b.connect(start, created);
  b.connect(created, validating, 'pagar');
  b.connect(validating, decision, 'respuesta del banco');
  b.connect(decision, paid, '[aprobado]');
  b.connect(decision, created, '[rechazado]', [{ x: 738, y: -110 }, { x: 75, y: -110 }]);
  b.connect(created, cancelled, 'cancelar');
  b.connect(paid, shipped, 'enviar');
  b.connect(paid, cancelled, 'cancelar / reembolsar', [{ x: 1160, y: 30 }, { x: 1160, y: 190 }, { x: 600, y: 190 }, { x: 600, y: 270 }]);
  b.connect(shipped, delivered, 'entregar');
  b.connect(delivered, done);
  b.connect(cancelled, cancelledEnd);
  return b.build({
    id: 'state.online-order',
    name: 'Pedido en línea',
    description: 'Tras pagar, una elección decide según el banco: aprobado sigue a envío y entrega; rechazado vuelve a «Creado». Se puede cancelar antes del envío.',
    difficulty: 'intermedio',
    learningGoals: [S.choice, S.transition, S.final],
  });
})();

/** Intermedio: un reproductor de música, con ida y vuelta entre sus estados. */
const musicPlayer = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -100, y: 16 });
  const stopped = b.state('Detenido', { x: 0, y: 0 });
  const playing = b.state('Reproduciendo', { x: 420, y: 0 });
  const paused = b.state('En pausa', { x: 420, y: 280 });
  b.connect(start, stopped);
  b.connect(stopped, playing, 'play');
  b.connect(playing, stopped, 'stop / fin de la lista', [{ x: 495, y: -110 }, { x: 75, y: -110 }]);
  b.connect(playing, paused, 'pausa');
  b.connect(paused, playing, 'play', [{ x: 700, y: 310 }, { x: 700, y: 30 }]);
  b.connect(paused, stopped, 'stop', [{ x: 75, y: 310 }]);
  return b.build({
    id: 'state.music-player',
    name: 'Reproductor de música',
    description: 'El mismo evento hace cosas distintas según el estado: «play» arranca desde detenido o reanuda desde la pausa.',
    difficulty: 'intermedio',
    learningGoals: [S.state, S.transition],
  });
})();

/** Avanzado: un cajero automático; «cancelar» sale del estado compuesto y vale para todos sus subestados. */
const atm = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -140, y: 166 });
  const idle = b.state('En espera', { x: 0, y: 150 });
  const serving = b.composite('Atendiendo', { x: 300, y: 60 }, { width: 840, height: 300 });
  const inner = b.initial({ x: 30, y: 136 }, serving);
  const reading = b.state('Leyendo tarjeta', { x: 110, y: 120 }, serving);
  const pin = b.state('Pidiendo PIN', { x: 370, y: 120 }, serving);
  const choosing = b.state('Eligiendo operación', { x: 630, y: 120 }, serving);
  const retained = b.state('Tarjeta retenida', { x: 670, y: 500 });
  const end = b.final({ x: 729, y: 640 });
  b.connect(start, idle);
  b.connect(idle, serving, 'insertar tarjeta');
  b.connect(inner, reading);
  b.connect(reading, pin, 'tarjeta válida');
  b.connect(pin, choosing, 'PIN correcto');
  b.connect(choosing, idle, 'terminar / devolver tarjeta', [{ x: 1005, y: 0 }, { x: 75, y: 0 }]);
  b.connect(serving, idle, 'cancelar / devolver tarjeta', [{ x: 720, y: 440 }, { x: 75, y: 440 }]);
  b.connect(pin, retained, '3 PIN erróneos / retener', [{ x: 745, y: 470 }]);
  b.connect(retained, end);
  return b.build({
    id: 'state.atm',
    name: 'Cajero automático',
    description: '«Atendiendo» agrupa la lectura de la tarjeta, el PIN y la operación: «cancelar» sale de su borde y vale desde cualquiera de ellos.',
    difficulty: 'avanzado',
    learningGoals: [S.compositeState, S.initial, S.transition],
  });
})();

/** Avanzado: una cuenta de usuario que, al reactivarse, vuelve donde estaba gracias a la historia. */
const userAccount = (() => {
  const b = createStateTemplateBuilder();
  const start = b.initial({ x: -120, y: 46 });
  const pending = b.state('Pendiente de verificación', { x: 0, y: 30 }, null, { width: 170, height: 60 });
  const expired = b.final({ x: 69, y: 260 });
  const active = b.composite('Activa', { x: 320, y: 0 }, { width: 660, height: 270 });
  const inner = b.initial({ x: 30, y: 116 }, active);
  const normal = b.state('Normal', { x: 100, y: 100 }, active);
  const blocked = b.state('Bloqueada temporalmente', { x: 440, y: 100 }, active, { width: 180, height: 60 });
  const history = b.history({ x: 160, y: 210 }, active);
  const suspended = b.state('Suspendida', { x: 575, y: 420 });
  const closed = b.state('Cerrada', { x: 940, y: 420 });
  const end = b.final({ x: 999, y: 580 });
  b.connect(start, pending);
  b.connect(pending, active, 'verificar correo');
  b.connect(pending, expired, 'tras 7 días');
  b.connect(inner, normal);
  b.connect(normal, blocked, '3 intentos fallidos');
  b.connect(blocked, normal, 'tras 30 min', [{ x: 850, y: 70 }, { x: 495, y: 70 }]);
  b.connect(active, suspended, 'suspender');
  b.connect(suspended, history, 'reactivar', [{ x: 495, y: 450 }]);
  b.connect(suspended, closed, 'cerrar cuenta');
  b.connect(closed, end);
  return b.build({
    id: 'state.user-account',
    name: 'Cuenta de usuario',
    description: 'Al suspender una cuenta «Activa» y reactivarla, la historia (H) la devuelve al subestado donde estaba: normal o bloqueada.',
    difficulty: 'avanzado',
    learningGoals: [S.compositeState, S.history, S.final],
  });
})();

export const stateTemplates: Template[] = [bookLoan, door, onlineOrder, musicPlayer, atm, userAccount];
