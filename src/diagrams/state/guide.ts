import type { DiagramGuide } from '@/core/registry';
import { StateArtifact as S } from './artifactTypes';

/** Guía del diagrama de máquina de estados para la página Aprender. */
export const stateGuide: DiagramGuide = {
  summary:
    'Una máquina de estados muestra la vida de una sola cosa —un pedido, un préstamo, una cuenta—: en qué situaciones (estados) puede estar, qué eventos la hacen cambiar y qué ocurre al cambiar.',
  purposes: [
    'Dejar claras las reglas que dependen del momento: qué se puede hacer en cada estado y qué no.',
    'Descubrir casos olvidados: estados a los que no se llega o de los que no se sale.',
    'Guiar la implementación de un campo «estado» y sus validaciones.',
  ],
  whenToUse: [
    'Cuando un objeto responde distinto al mismo evento según su situación.',
    'Para entidades con ciclo de vida: pedidos, solicitudes, facturas, cuentas, tickets.',
    'Para dispositivos y protocolos: un reproductor, un cajero, una conexión.',
  ],
  whenNotToUse: [
    'Para un proceso con pasos y responsables: usa un diagrama de actividades.',
    'Para la conversación entre varios objetos: usa un diagrama de secuencia.',
  ],
  keyIdea: {
    title: 'Un objeto, sus situaciones y lo que lo hace cambiar',
    text: 'Cada caja es una situación en la que el objeto espera; cada flecha, un cambio con su rótulo «evento [guarda] / efecto». Pregúntate en cada estado: ¿qué eventos acepto aquí y a dónde me llevan?',
  },
  difficultyCriteria: [
    { name: 'básico', description: 'Pocos estados en línea, con eventos simples y un inicio y un fin.' },
    { name: 'intermedio', description: 'Idas y vueltas entre estados, guardas y elecciones.' },
    { name: 'avanzado', description: 'Estados compuestos con transiciones compartidas e historia para reanudar.' },
  ],
  howToRead: [
    { title: 'Empieza por el círculo negro', text: 'El estado inicial apunta al primer estado del objeto.', artifactTypes: [S.initial] },
    { title: 'Lee cada estado', text: 'Cada rectángulo redondeado es una situación estable: «Activo», «Vencido».', artifactTypes: [S.state] },
    { title: 'Sigue las flechas', text: 'Cada transición dice el evento que la dispara, la condición entre corchetes y lo que se hace al pasar.', artifactTypes: [S.transition, S.choice] },
    { title: 'Abre los compuestos', text: 'Un estado compuesto agrupa subestados: lo que sale de su borde vale para todos; la H recuerda dónde estaba.', artifactTypes: [S.compositeState, S.history] },
    { title: 'Busca el final', text: 'La diana marca dónde termina la vida del objeto. Algunos, como una puerta, nunca terminan.', artifactTypes: [S.final] },
  ],
};
