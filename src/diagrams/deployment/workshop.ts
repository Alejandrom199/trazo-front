import type { LearningWorkshop } from '@/core/registry';
import { DeploymentArtifact as D } from './artifactTypes';
import { createDeploymentTemplateBuilder } from './templates/templateBuilder';

/*
 * Reto: el despliegue de una web.
 *   - El camino entre el navegador y el servidor no dice qué protocolo usa.
 *   - informes.jar no está desplegado en ninguna máquina.
 *   - El servidor de copias de seguridad no se comunica con nadie.
 */
const b = createDeploymentTemplateBuilder();
const browser = b.device('Navegador del cliente', { x: 0, y: 80 }, { width: 250, height: 170 });
const web = b.node('Servidor web', { x: 390, y: 0 }, { width: 300, height: 220 });
b.artifact('tienda.war', { x: 55, y: 95 }, web);
const database = b.node('Servidor de base de datos', { x: 840, y: 0 }, { width: 320, height: 220 });
b.artifact('tienda.sql', { x: 70, y: 95 }, database);
b.artifact('informes.jar', { x: 450, y: 320 });
b.node('Copias de seguridad', { x: 840, y: 330 }, { width: 320, height: 180 });
b.connect(browser, web);
b.connect(web, database, 'TCP 5432');

const brokenWeb = b.build({
  id: 'deployment.challenge.web',
  name: 'Reto: despliegue de una web',
  description: 'Diagrama intencionalmente defectuoso para practicar caminos, artefactos y nodos.',
  difficulty: 'intermedio',
  learningGoals: [D.node, D.artifact, D.communicationPath],
});

export const deploymentWorkshop: LearningWorkshop = {
  levels: [
    { name: 'básico', description: 'Distingue nodos (dónde se ejecuta) de artefactos (qué se instala).' },
    { name: 'intermedio', description: 'Despliega cada artefacto en un nodo y etiqueta cada camino con su protocolo.' },
    { name: 'avanzado', description: 'Separa entornos de ejecución, redes privadas y réplicas sin perder la trazabilidad.' },
  ],
  correctionChallenges: [
    {
      id: 'web-deployment',
      title: 'Un informe que no corre en ningún sitio',
      context: 'El cliente usa la tienda desde el navegador; la tienda guarda los datos en su base y genera informes.',
      diagram: brokenWeb,
      expectedProblems: 3,
      question: {
        id: 'web-artifact',
        prompt: '¿Qué significa que informes.jar esté fuera de todo nodo?',
        options: [
          { id: 'undeployed', label: 'Que no está instalado en ninguna máquina: nadie lo ejecuta', explanation: 'Correcto. Un artefacto se despliega en un nodo o entorno; suelto, el diagrama no dice dónde corre.', correct: true },
          { id: 'cloud', label: 'Que corre en la nube', explanation: 'La nube también se modela como nodos; un artefacto suelto no está en ninguna parte.', correct: false },
          { id: 'everywhere', label: 'Que está en todas las máquinas', explanation: 'Para eso se dibuja una copia en cada nodo donde se instala.', correct: false },
        ],
      },
    },
  ],
  briefExercises: [
    {
      id: 'api-brief',
      title: 'Modela una API en contenedores',
      brief: 'Una app móvil llama por HTTPS a una API que corre en un contenedor Docker dentro de un servidor. La API usa una base PostgreSQL en otra máquina, en una red privada.',
      questions: [
        {
          id: 'api-container',
          prompt: '¿Cómo representas el contenedor Docker?',
          options: [
            { id: 'environment', label: 'Un entorno de ejecución dentro del nodo servidor, con el artefacto de la API dentro', explanation: 'Correcto: Docker es el entorno que ejecuta el artefacto, y vive en el servidor.', correct: true },
            { id: 'artifact', label: 'Un artefacto más junto a la API', explanation: 'Docker no se instala como la API: es el entorno donde se ejecuta.', correct: false },
            { id: 'device', label: 'Un dispositivo', explanation: 'Un dispositivo es hardware físico; un contenedor es software de ejecución.', correct: false },
          ],
        },
        {
          id: 'api-paths',
          prompt: '¿Qué caminos dibujas?',
          options: [
            { id: 'two', label: 'Móvil–Servidor (HTTPS) y Servidor–Base de datos (TCP 5432, red privada)', explanation: 'Correcto: cada camino une dos máquinas que se comunican y dice cómo.', correct: true },
            { id: 'direct', label: 'También Móvil–Base de datos', explanation: 'El móvil nunca habla con la base: solo la API accede a ella.', correct: false },
            { id: 'none', label: 'Ninguno: basta con que estén en el mismo diagrama', explanation: 'Sin caminos, el diagrama no dice quién se comunica con quién.', correct: false },
          ],
        },
      ],
    },
  ],
  comparisons: [
    {
      id: 'logical-vs-physical',
      title: 'Nodos o componentes',
      context: 'Dos diagramas de despliegue de la misma tienda:',
      options: [
        { id: 'logical', label: 'Cajas «Pedidos», «Catálogo» y «Pagos» unidas por flechas de uso', explanation: 'Son componentes lógicos: ese es un diagrama de componentes. Falta dónde se ejecuta cada uno.', correct: false },
        { id: 'physical', label: 'Servidor web y servidor de base de datos con sus artefactos y protocolos', explanation: 'Correcto. Un despliegue responde dónde corre cada pieza y cómo se comunican las máquinas.', correct: true },
      ],
    },
  ],
};
