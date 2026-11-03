import type { Template } from '@/core/model';
import { DeploymentArtifact as D } from '../artifactTypes';
import { createDeploymentTemplateBuilder } from './templateBuilder';

/** Básico: un sitio en un servidor, visto desde el equipo del usuario. */
const website = (() => {
  const b = createDeploymentTemplateBuilder();
  const pc = b.device('Computador del usuario', { x: 0, y: 40 }, { width: 240, height: 170 });
  const server = b.node('Servidor web', { x: 400, y: 40 }, { width: 300, height: 200 });
  b.artifact('sitio.zip', { x: 60, y: 90 }, server);
  b.connect(pc, server, 'HTTPS');
  return b.build({
    id: 'deployment.website',
    name: 'Sitio web',
    description: 'El navegador del usuario pide el sitio por HTTPS al servidor web, donde está instalado sitio.zip.',
    difficulty: 'básico',
    learningGoals: [D.device, D.node, D.artifact, D.communicationPath],
  });
})();

/** Básico: una aplicación y su base de datos en máquinas separadas. */
const appWithDatabase = (() => {
  const b = createDeploymentTemplateBuilder();
  const app = b.node('Servidor de aplicaciones', { x: 0, y: 0 }, { width: 300, height: 200 });
  const database = b.node('Servidor de base de datos', { x: 460, y: 0 }, { width: 300, height: 200 });
  b.artifact('api.jar', { x: 60, y: 90 }, app);
  b.artifact('esquema.sql', { x: 60, y: 90 }, database);
  b.connect(app, database, 'JDBC');
  return b.build({
    id: 'deployment.app-database',
    name: 'Aplicación y base de datos',
    description: 'La API corre en un servidor y guarda en otro, por JDBC. Cada archivo está en la máquina donde se instala.',
    difficulty: 'básico',
    learningGoals: [D.node, D.artifact, D.communicationPath],
  });
})();

/** Intermedio: cada aplicación en su contenedor dentro del mismo servidor. */
const containers = (() => {
  const b = createDeploymentTemplateBuilder();
  const server = b.node('Servidor', { x: 0, y: 0 }, { width: 580, height: 270 });
  const web = b.environment('Contenedor web', { x: 20, y: 60 }, { width: 250, height: 180 }, server);
  const api = b.environment('Contenedor API', { x: 300, y: 60 }, { width: 250, height: 180 }, server);
  b.artifact('web.jar', { x: 50, y: 85 }, web);
  b.artifact('api.jar', { x: 50, y: 85 }, api);
  const database = b.node('Base de datos', { x: 720, y: 30 }, { width: 300, height: 230 });
  const postgres = b.environment('PostgreSQL', { x: 20, y: 55 }, { width: 250, height: 150 }, database);
  b.artifact('esquema.sql', { x: 50, y: 65 }, postgres);
  b.connect(server, database, 'JDBC');
  return b.build({
    id: 'deployment.containers',
    name: 'Aplicación en contenedores',
    description: 'Un servidor ejecuta dos contenedores (web y API); la base de datos corre sobre PostgreSQL en otra máquina.',
    difficulty: 'intermedio',
    learningGoals: [D.node, D.executionEnvironment, D.artifact, D.communicationPath],
  });
})();

/** Intermedio: app móvil contra la nube; la configuración se despliega con «deploy». */
const mobileCloud = (() => {
  const b = createDeploymentTemplateBuilder();
  const phone = b.device('Teléfono', { x: 0, y: 40 }, { width: 240, height: 170 });
  b.artifact('app.apk', { x: 45, y: 75 }, phone);
  const cloud = b.node('Nube', { x: 380, y: 0 }, { width: 340, height: 260 });
  const container = b.environment('Contenedor', { x: 20, y: 60 }, { width: 290, height: 170 }, cloud);
  b.artifact('api.jar', { x: 70, y: 75 }, container);
  const config = b.artifact('config.yaml', { x: 475, y: 360 });
  const push = b.node('Servicio de notificaciones', { x: 860, y: 40 }, { width: 280, height: 170 });
  b.connect(phone, cloud, 'HTTPS');
  b.connect(cloud, push, 'HTTPS');
  b.connect(config, container);
  return b.build({
    id: 'deployment.mobile-cloud',
    name: 'App móvil en la nube',
    description: 'El teléfono usa la API, que corre en un contenedor en la nube y envía notificaciones por un servicio externo. La configuración se despliega con «deploy».',
    difficulty: 'intermedio',
    learningGoals: [D.device, D.executionEnvironment, D.artifact, D.deployment, D.communicationPath],
  });
})();

/** Avanzado: alta disponibilidad con balanceador, dos servidores y base de datos replicada. */
const highAvailability = (() => {
  const b = createDeploymentTemplateBuilder();
  const balancer = b.node('Balanceador', { x: 0, y: 150 }, { width: 240, height: 200 });
  b.artifact('nginx.conf', { x: 45, y: 90 }, balancer);
  const servers = [0, 300].map((y, index) => {
    const server = b.node(`Servidor ${index + 1}`, { x: 400, y }, { width: 320, height: 210 });
    const jvm = b.environment('JVM', { x: 20, y: 55 }, { width: 270, height: 135 }, server);
    b.artifact('api.jar', { x: 60, y: 55 }, jvm);
    return server;
  });
  const primary = b.node('Base de datos principal', { x: 880, y: 150 }, { width: 300, height: 200 });
  const replica = b.node('Réplica', { x: 880, y: 470 }, { width: 300, height: 180 });
  b.artifact('esquema.sql', { x: 60, y: 90 }, primary);
  const note = b.note('En otra zona: si cae la principal, la réplica toma su lugar.', { x: 1240, y: 520 });
  for (const server of servers) {
    b.connect(balancer, server, 'HTTP');
    b.connect(server, primary, 'JDBC');
  }
  b.connect(primary, replica, 'replicación');
  b.connect(note, replica);
  return b.build({
    id: 'deployment.high-availability',
    name: 'Alta disponibilidad',
    description: 'Un balanceador reparte las peticiones entre dos servidores idénticos; la base de datos tiene una réplica en otra zona. Ninguna máquina es un punto único de falla.',
    difficulty: 'avanzado',
    learningGoals: [D.node, D.executionEnvironment, D.artifact, D.communicationPath, D.note],
  });
})();

/** Avanzado: pedidos y facturación desacoplados por una cola de mensajes. */
const messageQueue = (() => {
  const b = createDeploymentTemplateBuilder();
  const orders = b.node('Servidor de pedidos', { x: 0, y: 0 }, { width: 320, height: 230 });
  const ordersDocker = b.environment('Docker', { x: 20, y: 55 }, { width: 270, height: 150 }, orders);
  b.artifact('pedidos.jar', { x: 60, y: 60 }, ordersDocker);
  const broker = b.node('Broker de mensajes', { x: 480, y: 0 }, { width: 300, height: 230 });
  const rabbit = b.environment('RabbitMQ', { x: 20, y: 55 }, { width: 250, height: 150 }, broker);
  b.artifact('colas.json', { x: 50, y: 60 }, rabbit);
  const billing = b.node('Servidor de facturación', { x: 940, y: 0 }, { width: 320, height: 230 });
  const billingDocker = b.environment('Docker', { x: 20, y: 55 }, { width: 270, height: 150 }, billing);
  b.artifact('facturacion.jar', { x: 60, y: 60 }, billingDocker);
  const gateway = b.node('Pasarela de pago', { x: 0, y: 360 }, { width: 320, height: 170 });
  const panel = b.device('Panel de operaciones', { x: 940, y: 360 }, { width: 320, height: 170 });
  b.artifact('panel.html', { x: 85, y: 70 }, panel);
  const note = b.note('Desacopla pedidos y facturación: si facturación cae, los mensajes esperan en la cola.', { x: 545, y: 320 });
  b.connect(orders, broker, 'AMQP');
  b.connect(broker, billing, 'AMQP');
  b.connect(orders, gateway, 'HTTPS');
  b.connect(panel, billing, 'HTTPS');
  b.connect(note, broker);
  return b.build({
    id: 'deployment.message-queue',
    name: 'Pedidos con cola de mensajes',
    description: 'Pedidos y facturación corren en contenedores separados y se hablan solo a través de una cola (AMQP); el pago va a una pasarela externa y operaciones vigila desde un panel.',
    difficulty: 'avanzado',
    learningGoals: [D.node, D.device, D.executionEnvironment, D.artifact, D.communicationPath, D.note],
  });
})();

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const deploymentTemplates: Template[] = [website, appWithDatabase, containers, mobileCloud, highAvailability, messageQueue];
