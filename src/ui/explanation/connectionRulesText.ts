import type { ConnectionRules } from '@/core/model';

export interface ConnectionRulesText {
  incoming: string;
  outgoing: string;
}

/**
 * Pasa connectionRules a lenguaje humano ("exactamente 1", "2 o más").
 * Devuelve null para artefactos que no participan en flujos (carriles, notas, conexiones).
 */
export function describeConnectionRules(rules: ConnectionRules): ConnectionRulesText | null {
  const participates = rules.maxIn !== 0 || rules.maxOut !== 0;
  if (!participates) return null;
  return {
    incoming: describeRange(rules.minIn, rules.maxIn),
    outgoing: describeRange(rules.minOut, rules.maxOut),
  };
}

function describeRange(min: number, max: number | null): string {
  if (max === 0) return 'ninguna';
  if (max === null) return min === 0 ? 'cualquier cantidad' : `${min} o más`;
  if (min === max) return `exactamente ${min}`;
  if (min === 0) return `hasta ${max}`;
  return `entre ${min} y ${max}`;
}
