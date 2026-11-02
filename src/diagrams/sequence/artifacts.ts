import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { SequenceArtifact as S } from './artifactTypes';

/**
 * Catálogo del diagrama de secuencia (UML 2.5, cláusula 17: Interacciones).
 * Es la ÚNICA fuente del conocimiento de cada artefacto: la paleta, el panel de
 * explicación y la página Aprender leen de aquí.
 *
 * connectionRules: los mensajes se cuentan en las reglas de validación (por su
 * orden en el tiempo), no por capacidad; por eso los participantes no tienen límite.
 */

const UNLIMITED = null;
const NO_CONNECTIONS: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };
const FREE_CONNECTIONS: ConnectionRules = { minIn: 0, maxIn: UNLIMITED, minOut: 0, maxOut: UNLIMITED };

const lifeline: ArtifactDefinition = {
  type: S.lifeline,
  diagramType: 'sequence',
  category: 'participante',
  name: 'Línea de vida',
  umlName: 'Lifeline',
  notation: 'Un rectángulo con el nombre del participante («objeto : Clase») y una línea discontinua que baja de él.',
  whatIs: 'Un participante de la interacción (un objeto, un componente, un sistema) y el tiempo durante el que existe.',
  whatFor: 'Muestra quién envía y recibe cada mensaje. Su línea discontinua es el eje del tiempo de ese participante: arriba es antes, abajo es después.',
  whyExists: 'Una secuencia cuenta una conversación; hace falta saber entre quiénes ocurre y en qué orden habla cada uno.',
  whenToUse: [
    'Para cada objeto o componente que envía o recibe mensajes en el escenario.',
    'Para un sistema externo (una pasarela de pago, una API) con el que se conversa.',
  ],
  whenNotToUse: [
    'Para una persona que inicia la interacción: usa un actor.',
    'Para algo que nunca envía ni recibe mensajes: sobra en el diagrama.',
  ],
  rules: [
    'Se nombra «nombre : Clase»; puede omitirse el nombre («:Pedido») o la clase («pedido»).',
    'Todas las cabeceras van en la misma fila, salvo un participante creado durante la interacción.',
    'Los mensajes salen y llegan a su línea discontinua, nunca a la cabecera (salvo el de creación).',
  ],
  commonMistakes: [
    'Poner clases genéricas («Sistema», «Base de datos») que esconden quién hace qué.',
    'Repetir el mismo participante en dos líneas de vida.',
  ],
  example: '«:Carrito» recibe agregar(producto) del cliente y responde con el total.',
  relatedArtifacts: [S.actor, S.activation, S.syncMessage, S.destruction],
  connectionRules: FREE_CONNECTIONS,
};

const actor: ArtifactDefinition = {
  type: S.actor,
  diagramType: 'sequence',
  category: 'participante',
  name: 'Actor',
  umlName: 'Actor (Lifeline)',
  notation: 'Un monigote con su nombre y la misma línea discontinua de una línea de vida.',
  whatIs: 'Un participante externo al sistema, normalmente una persona o un rol, que inicia o recibe parte de la interacción.',
  whatFor: 'Deja claro dónde empieza el escenario y qué ve el usuario de él.',
  whyExists: 'Distingue a quien usa el sistema de las piezas internas que lo construyen.',
  whenToUse: ['Para el usuario o rol que dispara el escenario («Cliente», «Administrador»).'],
  whenNotToUse: ['Para un componente interno del sistema: eso es una línea de vida.'],
  rules: ['Se nombra con un rol, no con el nombre de una persona concreta.', 'Suele ir a la izquierda: es quien empieza la conversación.'],
  commonMistakes: ['Hacer que el actor llame a la base de datos directamente, saltándose al sistema.'],
  example: 'El actor «Cliente» envía iniciarSesión(usuario, clave) a «:Pantalla de acceso».',
  relatedArtifacts: [S.lifeline, S.syncMessage],
  connectionRules: FREE_CONNECTIONS,
};

const activation: ArtifactDefinition = {
  type: S.activation,
  diagramType: 'sequence',
  category: 'ocurrencia',
  name: 'Barra de activación',
  umlName: 'ExecutionSpecification',
  notation: 'Un rectángulo angosto sobre la línea de vida.',
  whatIs: 'El tramo de tiempo en que un participante está ocupado ejecutando algo, o esperando la respuesta de algo que pidió.',
  whatFor: 'Muestra cuándo empieza y termina cada trabajo, y cómo se anidan las llamadas.',
  whyExists: 'Sin ella no se ve si un participante sigue trabajando entre un mensaje y otro.',
  whenToUse: ['Desde que un participante recibe una llamada hasta que responde.', 'Para mostrar llamadas anidadas: una barra encima de otra.'],
  whenNotToUse: ['En diagramas muy simples, donde solo añade ruido: es opcional.'],
  rules: ['Va sobre una línea de vida: arrástrala encima de una y queda centrada en ella.', 'Empieza con un mensaje que llega y suele terminar con la respuesta que sale.'],
  commonMistakes: ['Dejar la barra suelta fuera de una línea de vida.', 'Hacerla terminar antes de la respuesta que envía.'],
  example: '«:ServicioPago» está activo desde cobrar(monto) hasta que responde «aprobado».',
  relatedArtifacts: [S.lifeline, S.syncMessage, S.replyMessage],
  connectionRules: NO_CONNECTIONS,
};

const destruction: ArtifactDefinition = {
  type: S.destruction,
  diagramType: 'sequence',
  category: 'ocurrencia',
  name: 'Destrucción',
  umlName: 'DestructionOccurrenceSpecification',
  notation: 'Una X grande al final de la línea de vida.',
  whatIs: 'El momento en que un participante deja de existir.',
  whatFor: 'Indica que, después de ese punto, el participante ya no puede enviar ni recibir mensajes.',
  whyExists: 'Algunos objetos son temporales (una sesión, un cálculo): hay que decir cuándo terminan.',
  whenToUse: ['Cuando un objeto se libera o se elimina durante el escenario (cerrar sesión, cancelar un pedido temporal).'],
  whenNotToUse: ['Para objetos que siguen existiendo después del escenario: su línea simplemente termina abajo.'],
  rules: ['Va sobre una línea de vida.', 'No puede haber mensajes de ni hacia ese participante por debajo de la X.'],
  commonMistakes: ['Enviar un mensaje a un objeto ya destruido.'],
  example: 'Al cerrar sesión, «:Sesión» se destruye.',
  relatedArtifacts: [S.lifeline, S.createMessage],
  connectionRules: NO_CONNECTIONS,
};

const fragmentRules = [
  'Encierra los mensajes a los que afecta y las líneas de vida que participan en ellos.',
  'Los fragmentos pueden anidarse unos dentro de otros.',
];

const altFragment: ArtifactDefinition = {
  type: S.altFragment,
  diagramType: 'sequence',
  category: 'fragmento combinado',
  name: 'Alternativa (alt)',
  umlName: 'CombinedFragment (alt)',
  notation: 'Un marco con «alt» en la esquina, dividido por una línea discontinua; cada parte lleva su guarda.',
  whatIs: 'Un "si… si no": de las regiones del marco, solo ocurre aquella cuya guarda se cumple.',
  whatFor: 'Muestra caminos alternativos de la conversación, como un pago aprobado o rechazado.',
  whyExists: 'Una secuencia es lineal; alt permite contar varias continuaciones posibles en un mismo diagrama.',
  whenToUse: ['Cuando la conversación sigue de dos formas distintas según una condición.'],
  whenNotToUse: ['Si una de las ramas está vacía: usa opt.', 'Para repetir mensajes: usa loop.'],
  rules: [...fragmentRules, 'La guarda va entre corchetes: [stock disponible]; la última región suele ser [else].'],
  commonMistakes: ['Guardas que se solapan (las dos pueden cumplirse a la vez).', 'Olvidar la guarda.'],
  example: 'alt [credenciales válidas] → abrir sesión; [else] → mostrar error.',
  relatedArtifacts: [S.optFragment, S.loopFragment, S.parFragment],
  connectionRules: NO_CONNECTIONS,
};

const optFragment: ArtifactDefinition = {
  type: S.optFragment,
  diagramType: 'sequence',
  category: 'fragmento combinado',
  name: 'Opción (opt)',
  umlName: 'CombinedFragment (opt)',
  notation: 'Un marco con «opt» en la esquina y una guarda.',
  whatIs: 'Un "solo si": los mensajes del marco ocurren únicamente si se cumple la guarda; si no, se saltan.',
  whatFor: 'Muestra pasos opcionales, como aplicar un cupón si el cliente tiene uno.',
  whyExists: 'Es un alt con una sola región: más claro cuando no hay alternativa.',
  whenToUse: ['Para un tramo que puede ocurrir o no, sin camino alternativo.'],
  whenNotToUse: ['Si hay algo distinto que hacer cuando no se cumple: usa alt.'],
  rules: [...fragmentRules, 'Lleva una guarda entre corchetes: [tiene cupón].'],
  commonMistakes: ['Usarlo sin guarda: no se sabe cuándo ocurre.'],
  example: 'opt [el cliente quiere factura] → generarFactura().',
  relatedArtifacts: [S.altFragment, S.loopFragment],
  connectionRules: NO_CONNECTIONS,
};

const loopFragment: ArtifactDefinition = {
  type: S.loopFragment,
  diagramType: 'sequence',
  category: 'fragmento combinado',
  name: 'Bucle (loop)',
  umlName: 'CombinedFragment (loop)',
  notation: 'Un marco con «loop» en la esquina y la condición de repetición.',
  whatIs: 'Un tramo que se repite mientras se cumpla su guarda, o el número de veces indicado.',
  whatFor: 'Muestra reintentos o recorridos sobre una colección sin dibujar cada vuelta.',
  whyExists: 'Dibujar cada repetición alargaría el diagrama sin decir nada nuevo.',
  whenToUse: ['Para recorrer los productos de un carrito.', 'Para reintentar una operación hasta 3 veces.'],
  whenNotToUse: ['Para un paso que ocurre una sola vez de forma opcional: usa opt.'],
  rules: [...fragmentRules, 'La guarda dice cuándo repetir: [para cada producto], [intentos < 3].'],
  commonMistakes: ['No indicar cuándo termina el bucle.'],
  example: 'loop [para cada producto] → reservar(producto).',
  relatedArtifacts: [S.optFragment, S.altFragment],
  connectionRules: NO_CONNECTIONS,
};

const parFragment: ArtifactDefinition = {
  type: S.parFragment,
  diagramType: 'sequence',
  category: 'fragmento combinado',
  name: 'Paralelo (par)',
  umlName: 'CombinedFragment (par)',
  notation: 'Un marco con «par» en la esquina, dividido por una línea discontinua en regiones.',
  whatIs: 'Regiones que ocurren a la vez: el orden entre los mensajes de una región y otra no importa.',
  whatFor: 'Muestra tareas simultáneas, como enviar un correo mientras se actualiza el inventario.',
  whyExists: 'Sin él, el orden vertical haría creer que una tarea espera a la otra.',
  whenToUse: ['Cuando dos o más conversaciones independientes pueden avanzar al mismo tiempo.'],
  whenNotToUse: ['Si una región necesita el resultado de la otra: entonces no son paralelas.'],
  rules: [...fragmentRules, 'Cada región es independiente; dentro de una región el orden sí cuenta.'],
  commonMistakes: ['Poner en paralelo pasos que dependen uno del otro.'],
  example: 'par → notificarCliente() | actualizarInventario().',
  relatedArtifacts: [S.altFragment, S.asyncMessage],
  connectionRules: NO_CONNECTIONS,
};

const note: ArtifactDefinition = {
  type: S.note,
  diagramType: 'sequence',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Un rectángulo con la esquina superior derecha doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario libre: no forma parte de la interacción.',
  whatFor: 'Aclarar una decisión, una restricción o un detalle que el diagrama no expresa.',
  whyExists: 'Algunos detalles (un tiempo de espera, una regla de negocio) no tienen notación propia.',
  whenToUse: ['Para explicar por qué ocurre un mensaje o una restricción («máximo 3 intentos»).'],
  whenNotToUse: ['Para describir mensajes que deberían dibujarse.'],
  rules: ['Se ancla con una línea discontinua; no se conecta con mensajes.'],
  commonMistakes: ['Escribir en notas el escenario entero en vez de dibujarlo.'],
  example: 'Nota junto a «:ServicioPago»: «tiempo máximo de respuesta: 5 s».',
  relatedArtifacts: [S.annotationLink],
  connectionRules: { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 },
};

const messageRules = ['Va de la línea de vida del emisor a la del receptor; su altura marca cuándo ocurre.', 'Se nombra con la operación y sus argumentos: validar(usuario).'];

const syncMessage: ArtifactDefinition = {
  type: S.syncMessage,
  diagramType: 'sequence',
  category: 'mensaje',
  name: 'Mensaje síncrono',
  umlName: 'Message (synchCall)',
  notation: 'Línea continua con punta de flecha rellena.',
  whatIs: 'Una llamada en la que el emisor se queda esperando hasta recibir la respuesta.',
  whatFor: 'Representa la mayoría de las llamadas entre objetos: invocar un método, consultar un servicio.',
  whyExists: 'Hay que distinguir cuándo el emisor se detiene a esperar y cuándo sigue con lo suyo.',
  whenToUse: ['Para una llamada a un método o a una API que devuelve un resultado.'],
  whenNotToUse: ['Si el emisor no espera (una notificación, un evento): usa un mensaje asíncrono.'],
  rules: [...messageRules, 'Normalmente tiene un mensaje de respuesta más abajo, en sentido contrario.', 'Puede ir del participante a sí mismo (una llamada interna).'],
  commonMistakes: ['Usar punta abierta: eso significa asíncrono.', 'Olvidar la respuesta cuando el resultado importa.'],
  example: '«:Pantalla» → «:ServicioAuth»: validar(usuario, clave).',
  relatedArtifacts: [S.replyMessage, S.asyncMessage, S.activation],
  connectionRules: NO_CONNECTIONS,
};

const asyncMessage: ArtifactDefinition = {
  type: S.asyncMessage,
  diagramType: 'sequence',
  category: 'mensaje',
  name: 'Mensaje asíncrono',
  umlName: 'Message (asynchCall / asynchSignal)',
  notation: 'Línea continua con punta de flecha abierta.',
  whatIs: 'Un envío en el que el emisor no espera: sigue trabajando mientras el receptor lo procesa.',
  whatFor: 'Representa eventos, notificaciones y colas de mensajes.',
  whyExists: 'El comportamiento cambia mucho si el emisor espera o no; la punta lo deja claro.',
  whenToUse: ['Para enviar un correo, publicar un evento o encolar un trabajo.'],
  whenNotToUse: ['Si el emisor necesita el resultado para seguir: usa un mensaje síncrono.'],
  rules: [...messageRules, 'No lleva respuesta directa.'],
  commonMistakes: ['Dibujar una respuesta a un mensaje asíncrono como si el emisor esperara.'],
  example: '«:Pedido» → «:Notificador»: enviarConfirmación(correo).',
  relatedArtifacts: [S.syncMessage, S.parFragment],
  connectionRules: NO_CONNECTIONS,
};

const replyMessage: ArtifactDefinition = {
  type: S.replyMessage,
  diagramType: 'sequence',
  category: 'mensaje',
  name: 'Mensaje de respuesta',
  umlName: 'Message (reply)',
  notation: 'Línea discontinua con punta de flecha abierta.',
  whatIs: 'La respuesta a una llamada síncrona: devuelve el control (y quizá un valor) a quien llamó.',
  whatFor: 'Muestra qué resultado vuelve y en qué momento termina la llamada.',
  whyExists: 'Cierra la llamada: a partir de ahí, el emisor original puede continuar.',
  whenToUse: ['Después de una llamada síncrona cuyo resultado importa (un total, un «aprobado»).'],
  whenNotToUse: ['Para un mensaje asíncrono: no hay nadie esperando.'],
  rules: ['Va en sentido contrario a la llamada que responde, más abajo que ella.', 'Su texto es el valor devuelto: «total», «aprobado».'],
  commonMistakes: ['Responder a alguien que nunca llamó.', 'Dibujarla continua: se confunde con una llamada.'],
  example: '«:ServicioAuth» ⇢ «:Pantalla»: usuario válido.',
  relatedArtifacts: [S.syncMessage, S.activation],
  connectionRules: NO_CONNECTIONS,
};

const createMessage: ArtifactDefinition = {
  type: S.createMessage,
  diagramType: 'sequence',
  category: 'mensaje',
  name: 'Mensaje de creación',
  umlName: 'Message (createMessage)',
  notation: 'Línea discontinua con punta abierta, con el texto «create» o el nombre del constructor.',
  whatIs: 'El mensaje que crea a un participante nuevo durante la interacción.',
  whatFor: 'Muestra en qué momento nace un objeto y quién lo crea.',
  whyExists: 'No todos los participantes existen desde el principio; este mensaje marca su nacimiento.',
  whenToUse: ['Cuando un objeto se crea en medio del escenario (un pedido nuevo, una sesión).'],
  whenNotToUse: ['Para un objeto que ya existía: usa un mensaje síncrono.'],
  rules: ['Debe ser el primer mensaje que recibe el participante creado.', 'Por convención se rotula «create» o con el constructor: new Pedido().'],
  commonMistakes: ['Enviar mensajes al objeto antes de crearlo.'],
  example: '«:Carrito» crea «:Pedido» con create(productos).',
  relatedArtifacts: [S.lifeline, S.destruction, S.syncMessage],
  connectionRules: NO_CONNECTIONS,
};

const annotationLink: ArtifactDefinition = {
  type: S.annotationLink,
  diagramType: 'sequence',
  category: 'conector',
  name: 'Anclaje de nota',
  umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta entre una nota y el elemento que comenta.',
  whatIs: 'La unión entre una nota y aquello a lo que se refiere.',
  whatFor: 'Deja claro de qué habla cada comentario.',
  whyExists: 'Una nota suelta en un diagrama grande no se sabe a qué se refiere.',
  whenToUse: ['Siempre que una nota comenta un participante concreto.'],
  whenNotToUse: ['Para unir participantes: eso es un mensaje.'],
  rules: ['Solo une una nota con otro elemento.'],
  commonMistakes: ['Usarlo como si fuera un mensaje.'],
  example: 'La nota «máximo 3 intentos» se ancla a «:ServicioAuth».',
  relatedArtifacts: [S.note],
  connectionRules: NO_CONNECTIONS,
};

export const sequenceArtifacts: ArtifactDefinition[] = [
  actor,
  lifeline,
  activation,
  destruction,
  altFragment,
  optFragment,
  loopFragment,
  parFragment,
  note,
  syncMessage,
  asyncMessage,
  replyMessage,
  createMessage,
  annotationLink,
];
