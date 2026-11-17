import type { Diagram } from './diagram';
import type { WalkFact, WalkOutcome, WalkSuggestion } from './walkMemory';

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
  /** Resultado del subproceso del que acaba de salir; lo usa la decisión que sigue (y se pierde en cualquier otro paso). */
  carried?: WalkOutcome | null;
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
 * Lo que se eligió en un punto del recorrido: la salida de una decisión, o cómo
 * terminó un subproceso (`outcome`: su resultado; null si se siguió sin entrar
 * o terminó sin resultado). La lista de elecciones identifica un camino.
 */
export type WalkChoice = { nodeId: string; edgeId: string } | { nodeId: string; outcome: string | null };

/**
 * running: avanza. choice: espera que se elija un camino. call: un token llegó a
 * un subproceso enlazado y espera que se decida entrar o seguir sin entrar.
 */
export type WalkStatus = 'running' | 'choice' | 'call' | 'finished' | 'stuck';

/**
 * Subproceso al que llegó un token: el nodo que lo invoca y lo que lo detalla,
 * su diagrama enlazado o, si aún no existe, el ejemplo del que se puede crear.
 */
export interface WalkCall {
  tokenId: number;
  nodeId: string;
  diagramId: string | null;
  templateId: string | null;
}

export interface WalkState {
  /** Tokens listos para avanzar, en orden de llegada (avanza primero el más antiguo). */
  tokens: WalkToken[];
  /** Por nodo que espera a varias entradas: las flechas por las que ya llegó un token. */
  waiting: Record<string, string[]>;
  /** Decisión pendiente: el token detenido y los caminos posibles. */
  choice: { tokenId: number; nodeId: string; options: WalkOption[]; suggested: WalkSuggestion | null } | null;
  /** Subproceso pendiente de decidir (status 'call'). */
  call: WalkCall | null;
  status: WalkStatus;
  log: WalkEntry[];
  /** Todo lo recorrido hasta ahora (para mostrar la cobertura del recorrido). */
  visitedNodeIds: string[];
  visitedEdgeIds: string[];
  nextTokenId: number;
  /** Lo decidido en el recorrido (también en los subprocesos recorridos). */
  facts: WalkFact[];
  /** Cómo terminó este diagrama, si terminó en un final de actividad. */
  outcome: WalkOutcome | null;
  /** Lo elegido en este diagrama, en orden: decisiones y resultados de subprocesos. */
  choices: WalkChoice[];
}

/** Lo que un subproceso recorrido le devuelve al proceso que lo invocó. */
export interface WalkReturn {
  outcome: WalkOutcome | null;
  facts: WalkFact[];
}

/** Motor de recorrido de un tipo de diagrama. Funciones puras. */
export interface WalkthroughEngine {
  /** Empieza; `facts` es lo ya decidido si se entra desde otro proceso. */
  start: (diagram: Diagram, facts?: WalkFact[]) => WalkState;
  /** Avanza un paso; en una decisión pendiente, `chosenEdgeId` dice qué camino tomar. */
  step: (diagram: Diagram, state: WalkState, chosenEdgeId?: string) => WalkState;
  /**
   * Sigue después de un subproceso pendiente: 'skipped' si se decidió no entrar,
   * 'returned' si se recorrió su diagrama y se volvió. El token sale del nodo.
   */
  resumeCall?: (diagram: Diagram, state: WalkState, how: 'skipped' | 'returned', result?: WalkReturn) => WalkState;
  /** Resultados con los que puede terminar un diagrama (p. ej. los nombres de sus finales). */
  outcomes?: (diagram: Diagram) => string[];
}
