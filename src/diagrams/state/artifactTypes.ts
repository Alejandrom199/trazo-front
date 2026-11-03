/** Claves del catálogo del diagrama de máquina de estados. */
export const StateArtifact = {
  state: 'state',
  compositeState: 'compositeState',
  initial: 'initialState',
  final: 'finalState',
  choice: 'choice',
  history: 'shallowHistory',
  note: 'note',
  transition: 'transition',
  annotationLink: 'annotationLink',
} as const;

const S = StateArtifact;

/** Estados propiamente dichos: donde la máquina puede quedarse esperando. */
export const STATE_TYPES: ReadonlySet<string> = new Set([S.state, S.compositeState]);

/** Pseudoestados: puntos de paso que la máquina atraviesa sin quedarse. */
export const PSEUDOSTATE_TYPES: ReadonlySet<string> = new Set([S.initial, S.choice, S.history]);
