import type { ValidationRule } from '@/core/model';
import { callWithoutReply, createNotFirst, messageAfterDestruction, messageBeyondLifeline, messageUnnamed, replyWithoutCall } from './messageRules';
import { fragmentEmpty, fragmentGuardMissing, occurrenceLoose, participantDuplicate, participantIdle } from './structureRules';

/** Todas las reglas del diagrama de secuencia, en el orden en que conviene leerlas. */
export const sequenceRules: ValidationRule[] = [
  messageAfterDestruction,
  createNotFirst,
  participantIdle,
  participantDuplicate,
  occurrenceLoose,
  replyWithoutCall,
  messageBeyondLifeline,
  fragmentGuardMissing,
  fragmentEmpty,
  messageUnnamed,
  callWithoutReply,
];
