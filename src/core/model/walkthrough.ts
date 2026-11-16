import type { Diagram } from './diagram';

/**
 * Recorrido paso a paso: una simulación que mueve "tokens" por el diagrama y
 * se detiene en cada paso. Cada módulo que lo soporte da su propio motor; la
 * interfaz solo avanza, retrocede y elige caminos.
 */

/** Un token: un hilo de ejecución detenido en un nodo, listo para avanzar. */
export interface WalkToken {
  id: number;
  nodeId: string;
  /** Flecha por la que llegó (null si nació en un nodo de inicio). */
  viaEdgeId: string | null;
}

/** Lo que pasó en un paso, para el registro del recorrido. */
export interface WalkEntry {
  text: string;
  tone: 'step' | 'choice' | 'parallel' | 'wait' | 'end' | 'warning';
  nodeIds: string[];
  edgeIds: string[];
}

/** Un camino que el usuario puede elegir en una decisión. */
export interface WalkOption {
  edgeId: string;
  label: string;
}

/**
 * running: avanza. choice: espera que se elija un camino. call: un token llegó a
 * un subproceso enlazado y espera que se decida entrar o seguir sin entrar.
 */
export type WalkStatus = 'running' | 'choice' | 'call' | 'finished' | 'stuck';

/** Subproceso al que llegó un token: el nodo que lo invoca y el diagrama que lo detalla. */
export interface WalkCall {
  tokenId: number;
  nodeId: string;
  diagramId: string;
}

export interface WalkState {
  /** Tokens listos para avanzar, en orden de llegada (avanza primero el más antiguo). */
  tokens: WalkToken[];
  /** Por nodo que espera a varias entradas: las flechas por las que ya llegó un token. */
  waiting: Record<string, string[]>;
  /** Decisión pendiente: el token detenido y los caminos posibles. */
  choice: { tokenId: number; nodeId: string; options: WalkOption[] } | null;
  /** Subproceso pendiente de decidir (status 'call'). */
  call: WalkCall | null;
  status: WalkStatus;
  log: WalkEntry[];
  /** Todo lo recorrido hasta ahora (para mostrar la cobertura del recorrido). */
  visitedNodeIds: string[];
  visitedEdgeIds: string[];
  nextTokenId: number;
}

/** Motor de recorrido de un tipo de diagrama. Funciones puras. */
export interface WalkthroughEngine {
  start: (diagram: Diagram) => WalkState;
  /** Avanza un paso; en una decisión pendiente, `chosenEdgeId` dice qué camino tomar. */
  step: (diagram: Diagram, state: WalkState, chosenEdgeId?: string) => WalkState;
  /**
   * Sigue después de un subproceso pendiente: 'skipped' si se decidió no entrar,
   * 'returned' si se recorrió su diagrama y se volvió. El token sale del nodo.
   */
  resumeCall?: (diagram: Diagram, state: WalkState, how: 'skipped' | 'returned') => WalkState;
}
