import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';

/**
 * Catálogo del diagrama de actividades (UML 2.5, cláusulas 15 y 16).
 * Es la ÚNICA fuente del conocimiento de cada artefacto: la paleta, el panel de
 * explicación y la validación de conexiones leen de aquí.
 *
 * connectionRules cuenta solo flujos de control y de objeto; los vínculos de
 * anotación (nota ↔ elemento) no son flujos y no cuentan.
 */

const UNLIMITED = null;
const NO_CONNECTIONS: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const initialNode: ArtifactDefinition = {
  type: A.initialNode,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo inicial',
  umlName: 'InitialNode',
  notation: 'Círculo negro relleno.',
  whatIs: 'El punto donde empieza el flujo de control cuando se invoca la actividad.',
  whatFor: 'Marca sin ambigüedad por dónde se empieza a leer y ejecutar el proceso.',
  whyExists:
    'Una actividad es un grafo; sin un punto de partida explícito no se sabe qué acción ocurre primero.',
  whenToUse: ['Al comienzo de toda actividad.', 'Al inicio de cada hilo que arranca a la vez que la actividad.'],
  whenNotToUse: [
    'Para reiniciar el flujo a mitad del proceso: para volver atrás se usa un nodo de fusión.',
    'Para representar un evento externo que dispara algo: eso es una aceptación de evento.',
  ],
  rules: [
    'No puede tener flujos de entrada.',
    'Sus flujos de salida deben ser de control, nunca de objeto.',
    'Una actividad puede tener más de un nodo inicial; cada uno inicia un flujo concurrente.',
  ],
  commonMistakes: [
    'Dibujar flechas que llegan al nodo inicial.',
    'Poner varios nodos iniciales creyendo que son alternativas: en realidad arrancan todos a la vez.',
  ],
  example: 'En "Pagar pedido", el nodo inicial lleva a la acción "Iniciar sesión".',
  relatedArtifacts: [A.activityFinal, A.flowFinal, A.controlFlow],
  connectionRules: { minIn: 0, maxIn: 0, minOut: 1, maxOut: UNLIMITED },
};

const activityFinal: ArtifactDefinition = {
  type: A.activityFinal,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo final de actividad',
  umlName: 'ActivityFinalNode',
  notation: 'Círculo con un anillo exterior (una "diana").',
  whatIs: 'El punto que termina TODA la actividad cuando un token lo alcanza.',
  whatFor: 'Indica que el proceso completo concluyó, deteniendo cualquier otro flujo que siga en curso.',
  whyExists: 'Hace explícito cuándo el proceso ha terminado, incluso si hay ramas paralelas activas.',
  whenToUse: [
    'Al final del camino principal del proceso.',
    'En una salida anticipada que debe cancelar todo (p. ej. "Cancelar pago").',
  ],
  whenNotToUse: [
    'Para terminar solo una rama paralela mientras las demás continúan: usa un final de flujo.',
  ],
  rules: [
    'No tiene flujos de salida.',
    'El primer token que llega termina la actividad y aborta los demás flujos en curso.',
    'Puede haber varios en el mismo diagrama.',
  ],
  commonMistakes: [
    'Usarlo al final de una rama de un fork esperando que las otras ramas sigan: las detiene.',
  ],
  example: 'Tras "Mostrar factura", el flujo llega al final de actividad y el pago concluye.',
  relatedArtifacts: [A.flowFinal, A.initialNode],
  connectionRules: { minIn: 1, maxIn: UNLIMITED, minOut: 0, maxOut: 0 },
};

const flowFinal: ArtifactDefinition = {
  type: A.flowFinal,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo final de flujo',
  umlName: 'FlowFinalNode',
  notation: 'Círculo con una X dentro.',
  whatIs: 'Un punto que destruye el token que le llega, terminando solo ese flujo.',
  whatFor: 'Cerrar una rama sin detener el resto de la actividad.',
  whyExists:
    'En procesos paralelos hace falta terminar un hilo sin abortar los demás; el final de actividad no sirve para eso.',
  whenToUse: ['Al final de una rama paralela que no necesita sincronizarse con las demás.'],
  whenNotToUse: ['Cuando el proceso entero debe terminar: usa el final de actividad.'],
  rules: ['No tiene flujos de salida.', 'Solo consume el token que le llega; los demás flujos siguen.'],
  commonMistakes: ['Confundirlo con el final de actividad por su parecido visual.'],
  example: 'Tras "Enviar correo de confirmación" en paralelo al despacho, la rama termina en un final de flujo.',
  relatedArtifacts: [A.activityFinal, A.fork],
  connectionRules: { minIn: 1, maxIn: UNLIMITED, minOut: 0, maxOut: 0 },
};

const action: ArtifactDefinition = {
  type: A.action,
  diagramType: 'activity',
  category: 'nodo ejecutable',
  name: 'Acción',
  umlName: 'Action',
  notation: 'Rectángulo con esquinas redondeadas y el nombre dentro.',
  whatIs: 'Un paso individual de trabajo dentro de la actividad.',
  whatFor: 'Describir qué se hace en cada paso del proceso.',
  whyExists: 'Es la unidad básica de comportamiento: todo lo que "ocurre" en la actividad ocurre en acciones.',
  whenToUse: ['Para cada paso que alguien o algo ejecuta: "Validar datos", "Emitir factura".'],
  whenNotToUse: [
    'Para preguntas o condiciones: eso es un nodo de decisión con guardas.',
    'Para representar un dato o documento: eso es un nodo de objeto.',
  ],
  rules: [
    'Se nombra con un verbo en infinitivo seguido de un complemento.',
    'Comienza cuando llegan tokens por TODOS sus flujos de entrada (join implícito).',
    'Al terminar ofrece un token por CADA flujo de salida (fork implícito).',
  ],
  commonMistakes: [
    'Unir varias flechas de entrada esperando un "o": la acción espera a todas. Usa un nodo de fusión.',
    'Nombres vagos como "Proceso" o "Datos".',
    'Sacar varias flechas esperando elegir una: salen todas. Usa un nodo de decisión.',
  ],
  example: '"Ingresar contraseña", "Verificar pedidos sin pagar".',
  relatedArtifacts: [A.controlFlow, A.decision, A.objectNode],
  connectionRules: { minIn: 0, maxIn: UNLIMITED, minOut: 0, maxOut: UNLIMITED },
};

const decision: ArtifactDefinition = {
  type: A.decision,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo de decisión',
  umlName: 'DecisionNode',
  notation:
    'Rombo con una entrada y varias salidas, cada una con una guarda entre corchetes. Junto al rombo se suele escribir la pregunta que decide, p. ej. «¿Hay stock?».',
  whatIs: 'Un punto donde el flujo elige UNA de varias salidas según una condición.',
  whatFor: 'Modelar caminos alternativos: "si es válido… si no…".',
  whyExists: 'Sin él no hay forma de expresar que solo uno de varios caminos se recorre.',
  whenToUse: ['Cuando el siguiente paso depende de una condición.'],
  whenNotToUse: [
    'Para ejecutar caminos en paralelo: usa un fork.',
    'Para volver a unir caminos alternativos: usa un nodo de fusión.',
  ],
  rules: [
    'Tiene un único flujo de entrada (UML 2.5 admite un segundo solo como "decisionInputFlow", que este editor no modela).',
    'Cada salida lleva una guarda; las guardas deben ser mutuamente excluyentes.',
    'Conviene que las guardas cubran todos los casos; [else] cubre el resto.',
    'Solo un token sale, por la primera guarda que se cumpla.',
  ],
  commonMistakes: [
    'Salidas sin guarda.',
    'Guardas que se solapan, como [monto > 100] y [monto > 50].',
    'Usarlo para unir caminos: eso lo hace el nodo de fusión.',
  ],
  example: 'Tras "Verificar contraseña": [correcta] → "Pago exitoso"; [incorrecta] → "Contraseña incorrecta".',
  relatedArtifacts: [A.merge, A.fork, A.controlFlow],
  connectionRules: { minIn: 1, maxIn: 1, minOut: 2, maxOut: UNLIMITED },
};

const merge: ArtifactDefinition = {
  type: A.merge,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo de fusión',
  umlName: 'MergeNode',
  notation: 'Rombo con varias entradas y una sola salida.',
  whatIs: 'Un punto donde caminos ALTERNATIVOS vuelven a juntarse en uno.',
  whatFor: 'Reunir las ramas de una decisión, o formar bucles, sin esperar a nadie.',
  whyExists:
    'Si varias flechas llegan directamente a una acción, la acción espera a todas; la fusión deja pasar cada token apenas llega.',
  whenToUse: ['Después de una decisión, para continuar por un camino común.', 'Para cerrar un bucle de reintento.'],
  whenNotToUse: ['Para esperar a que terminen ramas paralelas: eso lo hace un join.'],
  rules: [
    'Tiene exactamente un flujo de salida.',
    'No sincroniza: cada token que llega sale de inmediato.',
  ],
  commonMistakes: [
    'Usarlo tras un fork: las ramas paralelas pasan una a una y lo que sigue se ejecuta varias veces.',
  ],
  example: 'Tras "Contraseña incorrecta" el flujo vuelve a una fusión antes de "Ingresar contraseña".',
  relatedArtifacts: [A.decision, A.join],
  connectionRules: { minIn: 2, maxIn: UNLIMITED, minOut: 1, maxOut: 1 },
};

const fork: ArtifactDefinition = {
  type: A.fork,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo de bifurcación (fork)',
  umlName: 'ForkNode',
  notation: 'Barra gruesa con una entrada y varias salidas.',
  whatIs: 'Un punto que divide un flujo en varios flujos que avanzan EN PARALELO.',
  whatFor: 'Expresar que varias tareas ocurren a la vez o en cualquier orden.',
  whyExists: 'Los procesos reales hacen cosas simultáneas; el fork lo dice explícitamente.',
  whenToUse: ['Cuando varias tareas pueden avanzar independientes, p. ej. "Preparar envío" y "Emitir factura".'],
  whenNotToUse: ['Cuando solo uno de los caminos debe ocurrir: usa una decisión.'],
  rules: [
    'Tiene exactamente un flujo de entrada.',
    'Copia el token a TODAS sus salidas.',
    'Sus salidas no llevan guardas de elección.',
  ],
  commonMistakes: ['Poner guardas en sus salidas como si fuera una decisión.', 'No sincronizar luego las ramas con un join.'],
  example: 'Tras "Confirmar pedido": en paralelo "Cobrar" y "Reservar stock".',
  relatedArtifacts: [A.join, A.decision],
  connectionRules: { minIn: 1, maxIn: 1, minOut: 2, maxOut: UNLIMITED },
};

const join: ArtifactDefinition = {
  type: A.join,
  diagramType: 'activity',
  category: 'nodo de control',
  name: 'Nodo de unión (join)',
  umlName: 'JoinNode',
  notation: 'Barra gruesa con varias entradas y una salida.',
  whatIs: 'Un punto que ESPERA a que lleguen todos los flujos paralelos antes de continuar.',
  whatFor: 'Sincronizar ramas paralelas.',
  whyExists: 'Algunas tareas solo pueden empezar cuando todas las paralelas previas terminaron.',
  whenToUse: ['Después de un fork, cuando lo siguiente necesita que todas las ramas hayan terminado.'],
  whenNotToUse: ['Para reunir caminos alternativos de una decisión: nunca llegarían todos y el flujo se bloquea.'],
  rules: ['Tiene exactamente un flujo de salida.', 'Continúa solo cuando hay tokens en TODAS sus entradas.'],
  commonMistakes: ['Usarlo tras una decisión: el proceso se queda esperando para siempre.'],
  example: '"Cobrar" y "Reservar stock" llegan a un join; después, "Despachar pedido".',
  relatedArtifacts: [A.fork, A.merge],
  connectionRules: { minIn: 2, maxIn: UNLIMITED, minOut: 1, maxOut: 1 },
};

const objectNode: ArtifactDefinition = {
  type: A.objectNode,
  diagramType: 'activity',
  category: 'nodo de objeto',
  name: 'Nodo de objeto',
  umlName: 'ObjectNode',
  notation: 'Rectángulo (esquinas rectas) con el nombre del objeto, opcionalmente con su estado entre corchetes.',
  whatIs: 'Un dato, documento o cosa que fluye entre acciones.',
  whatFor: 'Mostrar QUÉ se produce o consume, no solo el orden de los pasos.',
  whyExists: 'El flujo de control dice cuándo; el de objetos dice con qué. Ambos son necesarios para entender un proceso.',
  whenToUse: ['Cuando un paso genera algo que otro paso utiliza: una factura, un pedido, un archivo.'],
  whenNotToUse: ['Para pasos de trabajo: eso son acciones.'],
  rules: [
    'Se conecta mediante flujos de objeto, no de control.',
    'Su nombre es un sustantivo: "Factura", "Pedido [aprobado]".',
  ],
  commonMistakes: ['Nombrarlo con un verbo, como si fuera una acción.', 'Dibujarlo con esquinas redondeadas como una acción.'],
  example: '"Emitir factura" → [Factura] → "Enviar factura al cliente".',
  relatedArtifacts: [A.objectFlow, A.action],
  connectionRules: { minIn: 0, maxIn: UNLIMITED, minOut: 0, maxOut: UNLIMITED },
};

const sendSignal: ArtifactDefinition = {
  type: A.sendSignal,
  diagramType: 'activity',
  category: 'nodo ejecutable',
  name: 'Envío de señal',
  umlName: 'SendSignalAction',
  notation: 'Pentágono convexo, con forma de flecha que apunta hacia afuera.',
  whatIs: 'Una acción que envía un mensaje asíncrono a otro participante.',
  whatFor: 'Mostrar comunicación con el exterior sin esperar respuesta.',
  whyExists: 'Distingue "aviso y sigo" de una acción común que hace el trabajo ella misma.',
  whenToUse: ['Notificar, avisar o publicar un evento: "Notificar al cliente".'],
  whenNotToUse: ['Cuando el proceso debe quedarse esperando la respuesta: combina con una aceptación de evento.'],
  rules: ['Termina en cuanto la señal se envía; no espera respuesta.', 'Se nombra por la señal que envía.'],
  commonMistakes: ['Usarlo para trabajo interno que no comunica nada a nadie.'],
  example: '"Enviar solicitud de aprobación" al gerente.',
  relatedArtifacts: [A.acceptEvent, A.action],
  connectionRules: { minIn: 0, maxIn: UNLIMITED, minOut: 0, maxOut: UNLIMITED },
};

const acceptEvent: ArtifactDefinition = {
  type: A.acceptEvent,
  diagramType: 'activity',
  category: 'nodo ejecutable',
  name: 'Aceptación de evento',
  umlName: 'AcceptEventAction',
  notation: 'Pentágono cóncavo, con una muesca en forma de flecha que entra por la izquierda.',
  whatIs: 'Una acción que espera hasta que ocurre un evento o llega una señal.',
  whatFor: 'Modelar esperas: una respuesta, un pago confirmado, un plazo cumplido.',
  whyExists: 'Los procesos se detienen a esperar cosas externas; esto lo hace visible.',
  whenToUse: ['Para esperar una señal enviada por otro participante.', 'Para reaccionar a un evento externo.'],
  whenNotToUse: ['Para un paso que el propio proceso ejecuta: es una acción común.'],
  rules: [
    'Puede no tener flujos de entrada: entonces se activa al iniciar la actividad y reacciona cada vez que ocurre el evento.',
    'Se nombra por el evento que espera.',
  ],
  commonMistakes: ['Confundirlo con el envío de señal: la flecha del envío sale; la de la aceptación entra.'],
  example: '"Aprobación recibida" detiene el flujo hasta que el gerente responde.',
  relatedArtifacts: [A.sendSignal, A.action],
  connectionRules: { minIn: 0, maxIn: UNLIMITED, minOut: 0, maxOut: UNLIMITED },
};

const partition: ArtifactDefinition = {
  type: A.partition,
  diagramType: 'activity',
  category: 'agrupación',
  name: 'Partición (carril)',
  umlName: 'ActivityPartition',
  notation: 'Franja con un encabezado que nombra al responsable; las acciones se dibujan dentro.',
  whatIs: 'Una agrupación de nodos según quién los realiza.',
  whatFor: 'Mostrar responsabilidades: quién hace qué.',
  whyExists: 'En procesos con varios actores, saber quién ejecuta cada paso es tan importante como el orden.',
  whenToUse: ['Cuando intervienen varios roles, áreas o sistemas.'],
  whenNotToUse: ['En procesos de un solo actor: añade ruido sin información.'],
  rules: [
    'No es un nodo: los flujos no conectan con el carril, sino con los nodos que contiene.',
    'Cada nodo pertenece como mucho a un carril del mismo nivel.',
  ],
  commonMistakes: ['Conectar flechas al carril.', 'Nombrarlo con una tarea en vez de un actor.'],
  example: 'Carriles "Usuario", "Sistema" y "Pago de terceros".',
  relatedArtifacts: [A.action],
  connectionRules: NO_CONNECTIONS,
};

const note: ArtifactDefinition = {
  type: A.note,
  diagramType: 'activity',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Rectángulo con la esquina superior derecha doblada; se une al elemento con una línea discontinua.',
  whatIs: 'Un comentario libre que no forma parte de la semántica del modelo.',
  whatFor: 'Aclarar supuestos, reglas o dudas sobre un elemento.',
  whyExists: 'Los diagramas no lo expresan todo; la nota guarda ese contexto junto al dibujo.',
  whenToUse: ['Para explicar una regla, una suposición o una pregunta pendiente.'],
  whenNotToUse: ['Para expresar pasos o condiciones: esos deben ser acciones o guardas.'],
  rules: ['No participa del flujo: su línea de anclaje no es un flujo de control.'],
  commonMistakes: ['Unirla con una flecha de flujo, como si fuera un paso más.'],
  example: '"El pago expira a los 15 minutos" anclado a "Ingresar contraseña".',
  relatedArtifacts: [A.annotationLink],
  connectionRules: NO_CONNECTIONS,
};

const controlFlow: ArtifactDefinition = {
  type: A.controlFlow,
  diagramType: 'activity',
  category: 'conector',
  name: 'Flujo de control',
  umlName: 'ControlFlow',
  notation: 'Flecha continua; puede llevar una guarda entre corchetes.',
  whatIs: 'Una conexión que pasa el turno de un nodo al siguiente.',
  whatFor: 'Indicar el orden en que ocurren las cosas.',
  whyExists: 'Es lo que convierte nodos sueltos en un proceso con secuencia.',
  whenToUse: ['Entre acciones y nodos de control, para indicar "después de esto, aquello".'],
  whenNotToUse: ['Para pasar datos a o desde un nodo de objeto: usa un flujo de objeto.'],
  rules: [
    'No puede conectar nodos de objeto.',
    'La guarda, si existe, debe cumplirse para que el token pase.',
  ],
  commonMistakes: ['Poner guardas en flujos que no salen de una decisión sin necesidad.'],
  example: '"Iniciar sesión" → "Ver pedidos sin pagar".',
  relatedArtifacts: [A.objectFlow, A.decision],
  connectionRules: NO_CONNECTIONS,
};

const objectFlow: ArtifactDefinition = {
  type: A.objectFlow,
  diagramType: 'activity',
  category: 'conector',
  name: 'Flujo de objeto',
  umlName: 'ObjectFlow',
  notation: 'Flecha continua que entra o sale de un nodo de objeto.',
  whatIs: 'Una conexión por la que viajan datos u objetos.',
  whatFor: 'Mostrar qué produce y qué consume cada acción.',
  whyExists: 'Separa el "orden" (control) de la "información" (objetos).',
  whenToUse: ['Siempre que un extremo sea un nodo de objeto.'],
  whenNotToUse: ['Entre dos acciones sin objeto intermedio: usa un flujo de control.'],
  rules: ['Al menos uno de sus extremos maneja objetos.', 'No puede salir de un nodo inicial.'],
  commonMistakes: ['Usar flujos de control para mover datos.'],
  example: '"Emitir factura" → [Factura].',
  relatedArtifacts: [A.objectNode, A.controlFlow],
  connectionRules: NO_CONNECTIONS,
};

const annotationLink: ArtifactDefinition = {
  type: A.annotationLink,
  diagramType: 'activity',
  category: 'conector',
  name: 'Anclaje de nota',
  umlName: 'Comment.annotatedElement',
  notation: 'Línea discontinua sin flecha entre la nota y el elemento.',
  whatIs: 'La unión que indica a qué elemento se refiere una nota.',
  whatFor: 'Dejar claro qué explica cada nota.',
  whyExists: 'Una nota suelta es ambigua; el anclaje dice a qué se refiere.',
  whenToUse: ['Siempre que una nota hable de un elemento concreto.'],
  whenNotToUse: ['Para indicar orden o paso de datos: no es un flujo.'],
  rules: ['Une una nota con un nodo; no transporta tokens.'],
  commonMistakes: ['Dibujarla con punta de flecha, como si fuera un flujo.'],
  example: 'La nota "Máximo 3 intentos" anclada a "Ingresar contraseña".',
  relatedArtifacts: [A.note],
  connectionRules: NO_CONNECTIONS,
};

export const activityArtifacts: ArtifactDefinition[] = [
  initialNode,
  activityFinal,
  flowFinal,
  action,
  decision,
  merge,
  fork,
  join,
  objectNode,
  sendSignal,
  acceptEvent,
  partition,
  note,
  controlFlow,
  objectFlow,
  annotationLink,
];
