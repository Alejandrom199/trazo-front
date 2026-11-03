import { SequenceArtifact as S } from '../artifactTypes';
import { createSequenceTemplateBuilder } from './templateBuilder';

/**
 * Avanzado: reserva de un viaje. Vuelos y hoteles se buscan a la vez (par), el
 * cobro se reintenta (loop) y el resultado decide entre confirmar o liberar el
 * asiento (alt); la confirmación por correo no se espera (asíncrona).
 */
const b = createSequenceTemplateBuilder();
const HEIGHT = 650;

const traveler = b.participant(S.actor, 'Viajero', 0, HEIGHT);
const agency = b.participant(S.lifeline, ':Agencia', 200, HEIGHT);
const flights = b.participant(S.lifeline, ':Vuelos', 400, HEIGHT);
const hotels = b.participant(S.lifeline, ':Hoteles', 600, HEIGHT);
const payments = b.participant(S.lifeline, ':Pagos', 800, HEIGHT);
const mail = b.participant(S.lifeline, ':Correo', 1000, HEIGHT);

b.activation(agency, 100, 590);
b.activation(flights, 140, 170);
b.activation(hotels, 210, 240);
b.activation(payments, 350, 390);

b.message(S.syncMessage, traveler, agency, 'buscarViaje(destino, fechas)', 100);

b.fragment(S.parFragment, '', { x: 150, y: 120, width: 610, height: 140 }, 190);
b.message(S.syncMessage, agency, flights, 'buscarVuelos()', 140);
b.message(S.replyMessage, flights, agency, 'vuelos', 170);
b.message(S.syncMessage, agency, hotels, 'buscarHoteles()', 210);
b.message(S.replyMessage, hotels, agency, 'hoteles', 240);

b.message(S.replyMessage, agency, traveler, 'opciones', 280);
b.message(S.syncMessage, traveler, agency, 'reservar(opción)', 310);

b.fragment(S.loopFragment, 'hasta 2 reintentos', { x: 150, y: 325, width: 810, height: 85 });
b.message(S.syncMessage, agency, payments, 'cobrar(total)', 350);
b.message(S.replyMessage, payments, agency, 'resultado', 390);

b.fragment(S.altFragment, 'pago aprobado', { x: -10, y: 425, width: 1130, height: 180 }, 515);
b.message(S.asyncMessage, agency, mail, 'enviarConfirmación()', 460);
b.message(S.replyMessage, agency, traveler, 'reserva confirmada', 490);
b.message(S.asyncMessage, agency, flights, 'liberarAsiento()', 550);
b.message(S.replyMessage, agency, traveler, 'pago rechazado', 580);

export const tripBookingTemplate = b.build({
  id: 'sequence.trip-booking',
  name: 'Reserva de un viaje',
  description: 'Vuelos y hoteles se buscan en paralelo, el cobro se reintenta y el resultado confirma la reserva o libera el asiento. Combina par, loop y alt.',
  difficulty: 'avanzado',
  learningGoals: [S.parFragment, S.loopFragment, S.altFragment, S.asyncMessage, S.activation],
});
