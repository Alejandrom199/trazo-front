import { DeploymentArtifact as D } from '../artifactTypes';
import { createDeploymentTemplateBuilder } from './templateBuilder';

/** Proyecto Biblioteca Digital: despliegue sencillo y seguro del portal, API y datos. */
const b = createDeploymentTemplateBuilder();

const student = b.device('Equipo del estudiante', { x: 0, y: 80 }, { width: 250, height: 180 });
const web = b.node('CDN / servidor web', { x: 390, y: 0 }, { width: 300, height: 220 });
b.artifact('portal-web.zip', { x: 55, y: 95 }, web);
const app = b.node('Servidor de aplicaciones', { x: 390, y: 320 }, { width: 330, height: 260 });
const container = b.environment('Contenedor Docker', { x: 25, y: 65 }, { width: 280, height: 165 }, app);
b.artifact('biblioteca-api.jar', { x: 55, y: 70 }, container);
const database = b.node('PostgreSQL gestionado', { x: 880, y: 320 }, { width: 320, height: 230 });
b.artifact('biblioteca.sql', { x: 70, y: 105 }, database);

b.connect(student, web, 'HTTPS');
b.connect(web, app, 'HTTPS / API REST');
b.connect(app, database, 'TCP 5432 (red privada)');

export const libraryDeploymentTemplate = b.build({
  id: 'deployment.library',
  name: 'Despliegue de Biblioteca Digital',
  description: 'El estudiante abre el portal por HTTPS; el portal llama a la API en un contenedor y solo la API accede a PostgreSQL por una red privada.',
  difficulty: 'intermedio',
  learningGoals: [D.device, D.node, D.executionEnvironment, D.artifact, D.communicationPath],
});
