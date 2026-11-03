import type { ArtifactDefinition, ConnectionRules } from '@/core/model';
import { StateArtifact as S } from './artifactTypes';

/**
 * Catálogo del diagrama de máquina de estados (UML 2.5, cláusula 14: Máquinas de
 * estados de comportamiento). Única fuente del conocimiento de cada artefacto: la
 * paleta, las explicaciones y la página Aprender leen de aquí.
 */

const MANY: ConnectionRules = { minIn: 0, maxIn: null, minOut: 0, maxOut: null };
const NONE: ConnectionRules = { minIn: 0, maxIn: 0, minOut: 0, maxOut: 0 };

const state: ArtifactDefinition = {
  type: S.state,
  diagramType: 'state',
  category: 'estado',
  name: 'Estado',
  umlName: 'State',
  notation: 'Un rectángulo de esquinas redondeadas con el nombre del estado.',
  whatIs: 'Una situación estable en la vida de algo, en la que espera a que ocurra un evento: «Pendiente», «Activo», «Vencido».',
  whatFor: 'Nombra cada situación posible para dejar claro qué se puede hacer en ella y qué la hace cambiar.',
  whyExists: 'Muchas reglas dependen del momento: un pedido se puede cancelar mientras está «Creado», pero no si ya está «Enviado».',
  whenToUse: ['Para cada situación en la que el objeto espera y responde distinto a los eventos.'],
  whenNotToUse: ['Para un paso de un proceso («Calcular total»): eso es una acción de un diagrama de actividades.'],
  rules: ['Se nombra con un adjetivo o participio: «Pagado», «En revisión», «Bloqueado».', 'Toda situación distinta es un estado distinto; si responde igual a todo, es el mismo estado.'],
  commonMistakes: ['Nombrar estados con verbos («Pagar»): eso es un evento o una acción.', 'Dejar estados a los que no se puede llegar.'],
  example: 'Un préstamo pasa por «Solicitado», «Activo» y «Devuelto».',
  relatedArtifacts: [S.transition, S.compositeState, S.initial],
  connectionRules: MANY,
};

const compositeState: ArtifactDefinition = {
  type: S.compositeState,
  diagramType: 'state',
  category: 'estado',
  name: 'Estado compuesto',
  umlName: 'State (composite)',
  notation: 'Un estado grande con su nombre arriba, separado por una línea, y dentro sus subestados.',
  whatIs: 'Un estado que contiene a otros: mientras está en él, la máquina está además en uno de sus subestados.',
  whatFor: 'Agrupa estados que comparten salidas: una transición que sale del compuesto vale para todos los de dentro.',
  whyExists: 'Sin él habría que repetir la misma flecha («cancelar») desde cada subestado.',
  whenToUse: ['Cuando varios estados responden igual a un mismo evento.', 'Para detallar por partes un estado complejo.'],
  whenNotToUse: ['Para agrupar estados solo por estética: si no comparten nada, no hace falta.'],
  rules: ['Dentro lleva su propio estado inicial: a dónde entra la máquina al llegar.', 'Una transición que sale de su borde abandona cualquier subestado en el que esté.'],
  commonMistakes: ['Olvidar el estado inicial interno.', 'Repetir la misma transición desde cada subestado en vez de sacarla del compuesto.'],
  example: '«Atendiendo» agrupa «Leyendo tarjeta», «Pidiendo PIN» y «Eligiendo operación»; «cancelar» sale del compuesto.',
  relatedArtifacts: [S.state, S.initial, S.history],
  connectionRules: MANY,
};

const initial: ArtifactDefinition = {
  type: S.initial,
  diagramType: 'state',
  category: 'pseudoestado',
  name: 'Estado inicial',
  umlName: 'Initial pseudostate',
  notation: 'Un círculo negro relleno con una sola flecha hacia el primer estado.',
  whatIs: 'El punto de partida: indica en qué estado empieza la máquina (o el estado compuesto).',
  whatFor: 'Deja claro dónde arranca la vida del objeto.',
  whyExists: 'Sin él no se sabe cuál de los estados es el primero.',
  whenToUse: ['Uno por máquina y uno dentro de cada estado compuesto.'],
  whenNotToUse: ['Para marcar el fin: eso es el estado final.'],
  rules: ['Tiene exactamente una transición de salida y ninguna de entrada.', 'Esa transición no lleva evento: ocurre al crearse el objeto.'],
  commonMistakes: ['Poner dos en el mismo nivel.', 'Rotular la transición inicial con un evento.'],
  example: '● → «Solicitado».',
  relatedArtifacts: [S.final, S.state],
  connectionRules: { minIn: 0, maxIn: 0, minOut: 1, maxOut: 1 },
};

const final: ArtifactDefinition = {
  type: S.final,
  diagramType: 'state',
  category: 'pseudoestado',
  name: 'Estado final',
  umlName: 'FinalState',
  notation: 'Un círculo relleno dentro de un anillo (una diana).',
  whatIs: 'El fin de la máquina: el objeto ya no cambia más (o el estado compuesto terminó).',
  whatFor: 'Muestra cuándo termina la vida del objeto.',
  whyExists: 'Distingue «se quedó esperando» de «terminó».',
  whenToUse: ['Cuando el objeto deja de existir o ya no responde a eventos: archivado, eliminado, cerrado.'],
  whenNotToUse: ['En objetos que viven indefinidamente, como un semáforo: su máquina no termina.'],
  rules: ['Solo tiene transiciones de entrada.', 'Puede haber varios, uno por cada forma de terminar.'],
  commonMistakes: ['Sacarle transiciones de salida.'],
  example: '«Devuelto» → ◉.',
  relatedArtifacts: [S.initial, S.state],
  connectionRules: { minIn: 1, maxIn: null, minOut: 0, maxOut: 0 },
};

const choice: ArtifactDefinition = {
  type: S.choice,
  diagramType: 'state',
  category: 'pseudoestado',
  name: 'Elección',
  umlName: 'Choice pseudostate',
  notation: 'Un rombo pequeño; cada salida lleva una guarda entre corchetes.',
  whatIs: 'Un punto donde la transición se bifurca según una condición evaluada en ese momento.',
  whatFor: 'Evita dibujar varias transiciones con el mismo evento y guardas distintas desde un estado.',
  whyExists: 'Un mismo evento («pago recibido») puede llevar a estados distintos según el resultado.',
  whenToUse: ['Cuando, tras un evento, el estado siguiente depende de una condición.'],
  whenNotToUse: ['Si solo hay un camino posible: la transición va directa.'],
  rules: ['Tiene al menos dos salidas, cada una con su guarda: «[aprobado]», «[rechazado]».', 'Las guardas no se superponen y cubren todos los casos (usa «[else]»).'],
  commonMistakes: ['Dejar salidas sin guarda.', 'Guardas que no cubren todos los casos.'],
  example: '«Validando» —pago recibido→ ◇ → [aprobado] «Pagado» / [rechazado] «Rechazado».',
  relatedArtifacts: [S.transition],
  connectionRules: { minIn: 1, maxIn: null, minOut: 2, maxOut: null },
};

const history: ArtifactDefinition = {
  type: S.history,
  diagramType: 'state',
  category: 'pseudoestado',
  name: 'Historia',
  umlName: 'Shallow history pseudostate',
  notation: 'Un círculo con una H, dentro de un estado compuesto.',
  whatIs: 'Recuerda en qué subestado estaba el compuesto la última vez que salió de él.',
  whatFor: 'Al volver, la máquina retoma donde se quedó en lugar de empezar de nuevo.',
  whyExists: 'Una pausa o una interrupción no deberían hacer perder el avance.',
  whenToUse: ['Para reanudar tras una pausa, una suspensión o una interrupción.'],
  whenNotToUse: ['Si al volver siempre se empieza desde el principio: basta el estado inicial.'],
  rules: ['Va dentro de un estado compuesto.', 'La transición que vuelve al compuesto apunta a la H.'],
  commonMistakes: ['Ponerla fuera de un estado compuesto.'],
  example: '«Suspendida» —reactivar→ H dentro de «Activa»: vuelve a «Normal» o «Restringida», según estaba.',
  relatedArtifacts: [S.compositeState],
  connectionRules: MANY,
};

const note: ArtifactDefinition = {
  type: S.note,
  diagramType: 'state',
  category: 'anotación',
  name: 'Nota',
  umlName: 'Comment',
  notation: 'Un rectángulo con la esquina doblada, unido con una línea discontinua a lo que comenta.',
  whatIs: 'Un comentario sobre un estado o una transición.',
  whatFor: 'Aclarar reglas de negocio, tiempos o excepciones.',
  whyExists: 'Algunas condiciones («a los 15 días») se entienden mejor explicadas.',
  whenToUse: ['Para explicar un plazo, una regla o una decisión.'],
  whenNotToUse: ['Para repetir lo que ya dice el diagrama.'],
  rules: ['Se ancla al elemento que comenta.'],
  commonMistakes: ['Dejarla suelta.'],
  example: 'Nota en «Vencido»: «se cobra multa por día».',
  relatedArtifacts: [S.annotationLink],
  connectionRules: NONE,
};

const relation = (definition: Omit<ArtifactDefinition, 'diagramType' | 'category' | 'connectionRules'>): ArtifactDefinition => ({
  ...definition,
  diagramType: 'state',
  category: 'conector',
  connectionRules: NONE,
});

const transition = relation({
  type: S.transition,
  name: 'Transición',
  umlName: 'Transition',
  notation: 'Flecha continua de un estado a otro, rotulada «evento [guarda] / efecto».',
  whatIs: 'El cambio de un estado a otro cuando ocurre un evento y se cumple la guarda.',
  whatFor: 'Dice qué hace cambiar al objeto y qué hace al cambiar.',
  whyExists: 'Las reglas de negocio viven aquí: qué eventos se aceptan en cada estado.',
  whenToUse: ['Entre cada par de estados entre los que se puede pasar.'],
  whenNotToUse: ['Para unir una nota: usa el anclaje.'],
  rules: [
    'Rótulo: evento [guarda] / efecto. Todo es opcional, pero casi siempre hay evento: «pagar [monto ≥ total] / emitir factura».',
    'Sin evento es una transición de finalización: ocurre en cuanto termina lo que hace el estado.',
  ],
  commonMistakes: ['Dejar transiciones sin evento sin querer.', 'Escribir la guarda sin corchetes.'],
  example: '«Activo» —devolver / registrar fecha→ «Devuelto».',
  relatedArtifacts: [S.state, S.choice],
});

const annotationLink = relation({
  type: S.annotationLink,
  name: 'Anclaje de nota',
  umlName: 'Comment annotatedElement',
  notation: 'Línea discontinua sin punta entre una nota y lo que comenta.',
  whatIs: 'La unión entre una nota y el elemento al que se refiere.',
  whatFor: 'Deja claro de qué habla cada comentario.',
  whyExists: 'Una nota suelta no se sabe a qué se refiere.',
  whenToUse: ['Siempre que una nota comenta un elemento concreto.'],
  whenNotToUse: ['Para unir estados: eso es una transición.'],
  rules: ['Solo une una nota con otro elemento.'],
  commonMistakes: ['Usarla como transición.'],
  example: 'Nota anclada a «Vencido».',
  relatedArtifacts: [S.note],
});

export const stateArtifacts: ArtifactDefinition[] = [state, compositeState, initial, final, choice, history, note, transition, annotationLink];
