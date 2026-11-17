/**
 * Memoria del recorrido paso a paso: lo que ya se decidió y cómo terminó cada
 * subproceso. Sirve para que el recorrido no vuelva a preguntar algo resuelto
 * ni deje elegir, sin aviso, un camino que contradice lo ya decidido.
 *
 * Reglas (no se fuerza nada: se sugiere y se avisa):
 * - R1 Resultado del subproceso: un subproceso termina en un final de actividad;
 *   si el final tiene nombre, ese es su resultado. Si no lo tiene, el resultado
 *   es la última respuesta que se dio dentro de él.
 * - R2 La decisión que sigue a un subproceso (directo o por fusiones) sugiere la
 *   salida cuya guarda coincide con su resultado; si ninguna coincide y hay
 *   una [else], sugiere esa.
 * - R3 Una decisión con la misma pregunta que otra ya respondida (en este u otro
 *   diagrama del recorrido) sugiere la misma respuesta. La misma decisión
 *   vuelta a visitar (un bucle) NO se sugiere: en un bucle se pregunta de nuevo.
 * - R4 Elegir otra salida que la sugerida se permite, pero queda avisado.
 * - Coincidir es igualdad de texto sin mayúsculas, tildes, signos ni corchetes;
 *   sí/si/yes/verdadero y no/falso cuentan como lo mismo.
 */

/** Una respuesta dada en una decisión. */
export interface WalkFact {
  question: string;
  answer: string;
  nodeId: string;
  diagramName: string;
}

/** Cómo terminó un subproceso (R1). */
export interface WalkOutcome {
  label: string;
  /** 'final': el nombre de su final; 'decision': su última respuesta. */
  from: 'final' | 'decision';
  diagramName: string;
}

/** La salida sugerida en una decisión y por qué. */
export interface WalkSuggestion {
  edgeId: string;
  reason: string;
}

const SYNONYMS: Record<string, string> = { si: 'si', yes: 'si', verdadero: 'si', true: 'si', cierto: 'si', no: 'no', falso: 'no', false: 'no' };
const ELSE = new Set(['else', 'sino', 'en otro caso', 'otro caso', 'de lo contrario', 'otherwise']);

/** Texto comparable: sin tildes, mayúsculas, corchetes ni signos; con sinónimos de sí/no. */
export function normalizeAnswer(text: string): string {
  const plain = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return SYNONYMS[plain] ?? plain;
}

export const answersMatch = (a: string, b: string): boolean => {
  const left = normalizeAnswer(a);
  return left !== '' && left === normalizeAnswer(b);
};

export const isElseGuard = (guard: string): boolean => ELSE.has(normalizeAnswer(guard));

/** Una salida de una decisión, con el texto que la distingue (su guarda). */
export interface DecisionExit {
  edgeId: string;
  guard: string;
}

/**
 * Sugiere una salida (R2, R3). `outcome` es el resultado del subproceso que
 * acaba de terminar justo antes, si lo hay; `facts`, lo decidido hasta ahora.
 */
export function suggestExit(
  question: string,
  nodeId: string,
  exits: readonly DecisionExit[],
  outcome: WalkOutcome | null,
  facts: readonly WalkFact[],
): WalkSuggestion | null {
  if (outcome) {
    const match = exits.find((exit) => answersMatch(exit.guard, outcome.label));
    if (match) return { edgeId: match.edgeId, reason: `«${outcome.diagramName}» terminó en «${outcome.label}».` };
    const fallback = exits.find((exit) => isElseGuard(exit.guard));
    if (fallback) return { edgeId: fallback.edgeId, reason: `«${outcome.diagramName}» terminó en «${outcome.label}», que ninguna otra salida contempla.` };
  }
  if (normalizeAnswer(question) === '') return null;
  // La respuesta más reciente a la misma pregunta, en otra decisión (R3).
  const fact = [...facts].reverse().find((item) => item.nodeId !== nodeId && answersMatch(item.question, question));
  if (!fact) return null;
  const match = exits.find((exit) => answersMatch(exit.guard, fact.answer));
  return match ? { edgeId: match.edgeId, reason: `Ya se respondió «${fact.answer}» a «${fact.question}» en «${fact.diagramName}».` } : null;
}

/** Agrega una respuesta a lo decidido; la misma decisión respondida otra vez reemplaza la anterior. */
export const rememberFact = (facts: readonly WalkFact[], fact: WalkFact): WalkFact[] => [...facts.filter((item) => item.nodeId !== fact.nodeId), fact];

/**
 * Lo decidido de un diagrama hijo unido a lo del padre: el hijo empezó con lo
 * del padre, así que su lista ya lo incluye; se toma la del hijo.
 */
export const mergeFacts = (parent: readonly WalkFact[], child: readonly WalkFact[]): WalkFact[] =>
  child.reduce<WalkFact[]>((all, fact) => rememberFact(all, fact), [...parent]);
