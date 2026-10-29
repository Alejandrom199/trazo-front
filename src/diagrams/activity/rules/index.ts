import type { ValidationRule } from '@/core/model';
import { nodeIsolated, nodeUnreachable, noteUnanchored } from './connectivityRules';
import { forkWithoutJoin, joinUsedAsMerge, joinWithoutFork, mergeUsedAsJoin } from './concurrencyRules';
import { decisionGuardDuplicate, decisionGuardMissing, decisionOutgoing } from './decisionRules';
import { actionNotVerb, actionUnnamed } from './namingRules';
import { finalMissing, initialMissing, initialMultiple } from './structureRules';

/** Todas las reglas del diagrama de actividades, en el orden en que conviene leerlas. */
export const activityRules: ValidationRule[] = [
  initialMissing,
  initialMultiple,
  finalMissing,
  nodeIsolated,
  nodeUnreachable,
  decisionOutgoing,
  decisionGuardMissing,
  decisionGuardDuplicate,
  forkWithoutJoin,
  joinWithoutFork,
  mergeUsedAsJoin,
  joinUsedAsMerge,
  actionUnnamed,
  actionNotVerb,
  noteUnanchored,
];
