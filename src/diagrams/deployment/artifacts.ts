import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { DeploymentArtifact as D } from './artifactTypes';

/**
 * Catálogo del diagrama de despliegue (UML 2.5, cláusula 19: Despliegues).
 * Única fuente del conocimiento de cada artefacto: la paleta, las explicaciones y
 * la página Aprender leen de aquí.
 */

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const node: ArtifactDefinition = {
  type: D.node,
  diagramType: 'deployment',
  category: 'infraestructura',
  name: 'Nodo',
  umlName: 'Node',
  notation: 'Un cubo en perspectiva con «node» y su nombre.',
  whatIs: 'Un recurso de cómputo donde se ejecuta software: un servidor, una máquina virtual, un servicio en la nube.',
  whatFor: 'Muestra en qué máquinas corre el sistema y qué se instala en cada una.',
  whyExists: 'El mismo software se comporta distinto según dónde y cómo se despliega: hay que hacerlo visible.',
  whenToUse: ['Para cada servidor o máquina virtual de la solución.', 'Para servicios gestionados (una base de datos en la nube).'],
  whenNotToUse: ['Para un programa: eso es un artefacto que se despliega en un nodo.'],
  rules: ['Se nombra por su papel: «Servidor de aplicaciones», «Base de datos».', 'Contiene entornos de ejecución y artefactos; se une a otros nodos con caminos de comunicación.'],
  commonMistakes: ['Dibujar los programas como nodos.', 'Olvidar cómo se comunican los nodos entre sí.'],
  example: '«Servidor web» ejecuta el sitio y se comunica por HTTPS con «Servidor de aplicaciones».',
  relatedArtifacts: [D.device, D.executionEnvironment, D.artifact, D.communicationPath],
  connectionRules: MANY,
};

const device: ArtifactDefinition = {
  type: D.device,
  diagramType: 'deployment',
  category: 'infraestructura',
  name: 'Dispositivo',
  umlName: 'Device',
  notation: 'Un cubo en perspectiva con «device» y su nombre.',
  whatIs: 'Un recurso físico concreto: un teléfono, un computador, un lector, un sensor.',
  whatFor: 'Distingue el hardware del usuario o del terreno de los servidores.',
  whyExists: 'Lo que corre en un teléfono tiene otras restricciones (conexión, batería) que lo que corre en un servidor.',
  whenToUse: ['Para teléfonos, navegadores en el equipo del usuario, quioscos, sensores.'],
  whenNotToUse: ['Para un servidor genérico: usa un nodo.'],
  rules: ['Puede contener artefactos y entornos de ejecución, igual que un nodo.'],
  commonMistakes: ['Usarlo para máquinas virtuales.'],
  example: '«Teléfono del cliente» ejecuta app.apk.',
  relatedArtifacts: [D.node, D.artifact],
  connectionRules: MANY,
};

const executionEnvironment: ArtifactDefinition = {
  type: D.executionEnvironment,
  diagramType: 'deployment',
  category: 'infraestructura',
  name: 'Entorno de ejecución',
  umlName: 'ExecutionEnvironment',
  notation: 'Un cubo con «executionEnvironment», dentro de un nodo o un dispositivo.',
  whatIs: 'El software que aloja y ejecuta a otros: un contenedor Docker, la máquina virtual de Java, un servidor de aplicaciones, un motor de base de datos.',
  whatFor: 'Muestra qué plataforma necesita cada artefacto para correr.',
  whyExists: 'Entre la máquina y la aplicación suele haber una capa que conviene nombrar (versión de Java, imagen de Docker).',
  whenToUse: ['Para contenedores, máquinas virtuales de lenguaje, servidores web o de aplicaciones.'],
  whenNotToUse: ['Para la máquina misma: eso es el nodo que lo contiene.'],
  rules: ['Va dentro de un nodo o un dispositivo: arrástralo dentro.', 'Dentro van los artefactos que ejecuta.'],
  commonMistakes: ['Dejarlo suelto, fuera de toda máquina.'],
  example: '«Docker» dentro de «Servidor», con api.jar dentro.',
  relatedArtifacts: [D.node, D.artifact],
  connectionRules: NONE,
};

const artifact: ArtifactDefinition = {
  type: D.artifact,
  diagramType: 'deployment',
  category: 'artefacto desplegable',
  name: 'Artefacto',
  umlName: 'Artifact',
  notation: 'Un rectángulo con «artifact», su nombre de archivo y el icono de documento.',
  whatIs: 'Un archivo concreto que se instala: un ejecutable, un .jar, un .war, una imagen, un script de base de datos.',
  whatFor: 'Dice exactamente qué se copia en cada máquina.',
  whyExists: 'Para instalar o actualizar el sistema hay que saber qué archivo va dónde.',
  whenToUse: ['Para cada paquete que se instala: api.jar, sitio.zip, esquema.sql.'],
  whenNotToUse: ['Para el código fuente o las clases: el artefacto es lo que se entrega.'],
  rules: ['Se despliega en un nodo, dispositivo o entorno: va dentro de él o se une con «deploy».', 'Se nombra como el archivo: con su extensión.'],
  commonMistakes: ['Dejarlo sin desplegar en ninguna parte.'],
  example: 'api.jar desplegado en «Docker».',
  relatedArtifacts: [D.executionEnvironment, D.node, D.deployment],
  connectionRules: MANY,
};

const note: ArtifactDefinition = {
  type: D.note,
  diagramType: 'deployment',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Un rectángulo con la esquina doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario sobre la infraestructura.',
  whatFor: 'Anotar tamaños, versiones, regiones o decisiones (réplicas, copias de seguridad).',
  whyExists: 'Los detalles de operación rara vez tienen notación propia.',
  whenToUse: ['Para justificar una réplica, un balanceador o una restricción de red.'],
  whenNotToUse: ['Para repetir lo que ya dice el diagrama.'],
  rules: ['Se ancla al elemento que comenta.'],
  commonMistakes: ['Dejarla suelta.'],
  example: 'Nota en «Base de datos»: «réplica en otra zona».',
  relatedArtifacts: [D.annotationLink],
  connectionRules: NONE,
};

const relation = (definition: Omit<ArtifactDefinition, 'diagramType' | 'category' | 'connectionRules'>): ArtifactDefinition => ({
  ...definition,
  diagramType: 'deployment',
  category: 'conector',
  connectionRules: NONE,
});

const communicationPath = relation({
  type: D.communicationPath,
  name: 'Camino de comunicación',
  umlName: 'CommunicationPath',
  notation: 'Línea continua entre dos nodos, rotulada con el protocolo («HTTPS», «JDBC»).',
  whatIs: 'Una vía por la que dos máquinas intercambian información.',
  whatFor: 'Muestra la red: quién habla con quién y con qué protocolo.',
  whyExists: 'Las conexiones de red deciden puertos, firewalls y latencias.',
  whenToUse: ['Entre cada par de nodos o dispositivos que se comunican.'],
  whenNotToUse: ['Para indicar que un archivo se instala en un nodo: usa «deploy».'],
  rules: ['Une dos nodos o dispositivos.', 'Se rotula con el protocolo.'],
  commonMistakes: ['No indicar el protocolo.'],
  example: '«Teléfono» — «API» por HTTPS.',
  relatedArtifacts: [D.node, D.device],
});

const deployment = relation({
  type: D.deployment,
  name: 'Despliegue',
  umlName: 'Deployment «deploy»',
  notation: 'Flecha discontinua con punta abierta, rotulada «deploy», del artefacto al nodo.',
  whatIs: 'Indica que un artefacto se instala en un nodo, dispositivo o entorno.',
  whatFor: 'Alternativa a dibujar el artefacto dentro: útil cuando el nodo tiene poco espacio o el artefacto va a varios.',
  whyExists: 'Deja explícito dónde se instala cada archivo.',
  whenToUse: ['Cuando un mismo artefacto se despliega en varios lugares.'],
  whenNotToUse: ['Si ya está dibujado dentro del nodo: sería redundante.'],
  rules: ['Va del artefacto al nodo, dispositivo o entorno.'],
  commonMistakes: ['Dibujarla al revés.'],
  example: 'esquema.sql «deploy» → «Base de datos».',
  relatedArtifacts: [D.artifact, D.node],
});

const annotationLink = relation({
  type: D.annotationLink,
  name: 'Anclaje de nota',
  umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta entre una nota y lo que comenta.',
  whatIs: 'La unión entre una nota y el elemento al que se refiere.',
  whatFor: 'Deja claro de qué habla cada comentario.',
  whyExists: 'Una nota suelta no se sabe a qué se refiere.',
  whenToUse: ['Siempre que una nota comenta un elemento concreto.'],
  whenNotToUse: ['Para unir nodos: eso es un camino de comunicación.'],
  rules: ['Solo une una nota con otro elemento.'],
  commonMistakes: ['Usarla como camino de comunicación.'],
  example: 'Nota anclada a «Balanceador».',
  relatedArtifacts: [D.note],
});

export const deploymentArtifacts: ArtifactDefinition[] = [node, device, executionEnvironment, artifact, note, communicationPath, deployment, annotationLink];
