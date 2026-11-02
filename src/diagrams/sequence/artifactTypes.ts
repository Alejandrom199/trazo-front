/**
 * Claves del catálogo del diagrama de secuencia. Usar estas constantes en vez
 * de strings sueltos evita que un error de tipeo pase sin avisar.
 */
export const SequenceArtifact = {
  lifeline: 'lifeline',
  actor: 'actor',
  activation: 'activation',
  destruction: 'destruction',
  altFragment: 'altFragment',
  optFragment: 'optFragment',
  loopFragment: 'loopFragment',
  parFragment: 'parFragment',
  note: 'note',
  syncMessage: 'syncMessage',
  asyncMessage: 'asyncMessage',
  replyMessage: 'replyMessage',
  createMessage: 'createMessage',
  annotationLink: 'annotationLink',
} as const;

const S = SequenceArtifact;

/** Participantes: tienen línea de vida y entre ellos viajan los mensajes. */
export const PARTICIPANT_TYPES: ReadonlySet<string> = new Set([S.lifeline, S.actor]);

/** Mensajes: conexiones horizontales cuyo orden lo da su altura. */
export const MESSAGE_TYPES: readonly string[] = [S.syncMessage, S.asyncMessage, S.replyMessage, S.createMessage];

/** Fragmentos combinados: marcos que encierran un tramo de la interacción. */
export const FRAGMENT_TYPES: ReadonlySet<string> = new Set([S.altFragment, S.optFragment, S.loopFragment, S.parFragment]);

/** Fragmentos con dos regiones separadas por una línea discontinua. */
export const SPLIT_FRAGMENT_TYPES: ReadonlySet<string> = new Set([S.altFragment, S.parFragment]);

/** Operador UML que se escribe en la pestaña de cada fragmento. */
export const FRAGMENT_OPERATOR: Record<string, string> = {
  [S.altFragment]: 'alt',
  [S.optFragment]: 'opt',
  [S.loopFragment]: 'loop',
  [S.parFragment]: 'par',
};
