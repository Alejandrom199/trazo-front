import { ClassArtifact as C } from '../artifactTypes';
import { createClassTemplateBuilder } from './templateBuilder';

/**
 * Reservas en capas: tres paquetes (dominio, aplicación, infraestructura) y la
 * inversión de dependencias. La aplicación depende de interfaces; la
 * infraestructura las implementa. El dominio no conoce ni la base de datos ni el
 * correo: avisa a un observador.
 */
const b = createClassTemplateBuilder();

// Posiciones de los clasificadores relativas a su paquete.
const domain = b.package('Dominio', { x: 0, y: 0 }, { width: 1030, height: 520 });
const resource = b.classifier(C.abstractClass, 'Recurso\n--\n#codigo: String\n#capacidad: Int\n--\n+disponible(rango): Boolean', { x: 120, y: 40 }, domain);
const booking = b.classifier(C.class, 'Reserva\n--\n-desde: Date\n-hasta: Date\n--\n+confirmar()\n+cancelar()', { x: 470, y: 40 }, domain);
const room = b.classifier(C.class, 'Habitacion\n--\n-camas: Int\n--\n+disponible(rango)', { x: 0, y: 330 }, domain);
const meetingRoom = b.classifier(C.class, 'SalaReuniones\n--\n-proyector: Boolean\n--\n+disponible(rango)', { x: 240, y: 330 }, domain);
const status = b.classifier(C.enumeration, 'EstadoReserva\n--\nSOLICITADA\nCONFIRMADA\nCANCELADA\n--\n', { x: 500, y: 330 }, domain);
const observer = b.classifier(C.interface, 'ObservadorReserva\n--\n\n--\n+alConfirmar(reserva)', { x: 800, y: 330 }, domain);

const application = b.package('Aplicación', { x: 1070, y: 0 }, { width: 520, height: 230 });
const service = b.classifier(C.class, 'ServicioReservas\n--\n\n--\n+reservar(recurso, rango)\n+cancelar(id)', { x: 20, y: 40 }, application);
const repository = b.classifier(C.interface, 'RepositorioReservas\n--\n\n--\n+guardar(reserva)\n+buscar(id): Reserva', { x: 290, y: 40 }, application);

const infrastructure = b.package('Infraestructura', { x: 1070, y: 290 }, { width: 520, height: 230 });
const mailer = b.classifier(C.class, 'NotificadorCorreo\n--\n-smtp: ClienteSmtp\n--\n+alConfirmar(reserva)', { x: 20, y: 40 }, infrastructure);
const sqlRepository = b.classifier(C.class, 'RepositorioReservasSql\n--\n-conexion: Conexion\n--\n+guardar(reserva)\n+buscar(id)', { x: 290, y: 40 }, infrastructure);

const note = b.note('Inversión de dependencias: la aplicación usa la interfaz; la base de datos concreta vive en infraestructura.', { x: 1640, y: 70 });

b.relation(room, resource, C.generalization);
b.relation(meetingRoom, resource, C.generalization);
b.relation(booking, resource, C.aggregation, '0..* reserva 1..*');
b.relation(booking, status, C.association, 'estado');
b.relation(booking, observer, C.dependency, '«notifica»');
b.relation(service, booking, C.dependency, '«crea»');
b.relation(service, repository, C.dependency, '«use»');
b.relation(sqlRepository, repository, C.realization);
b.relation(mailer, observer, C.realization);
b.relation(note, repository);

export const layeredBookingTemplate = b.build({
  id: 'class.layered-booking',
  name: 'Reservas en capas',
  description: 'Paquetes de dominio, aplicación e infraestructura con inversión de dependencias: repositorio y observador como interfaces, implementados fuera del dominio.',
  difficulty: 'avanzado',
  learningGoals: [C.package, C.abstractClass, C.interface, C.generalization, C.realization, C.dependency, C.aggregation, C.enumeration, C.note],
});
