/**
 * Claves del catálogo del diagrama de actividades. Usar estas constantes en vez
 * de strings sueltos evita que un error de tipeo ("acction") pase sin avisar.
 */
export const ActivityArtifact = {
  initialNode: 'initialNode',
  activityFinal: 'activityFinal',
  flowFinal: 'flowFinal',
  action: 'action',
  decision: 'decision',
  merge: 'merge',
  fork: 'fork',
  join: 'join',
  objectNode: 'objectNode',
  sendSignal: 'sendSignal',
  acceptEvent: 'acceptEvent',
  partition: 'partition',
  note: 'note',
  controlFlow: 'controlFlow',
  objectFlow: 'objectFlow',
  annotationLink: 'annotationLink',
} as const;

export type ActivityArtifactType = (typeof ActivityArtifact)[keyof typeof ActivityArtifact];

/** Conexiones que son flujos: transportan tokens, cuentan en connectionRules y en el recorrido del grafo. */
export const FLOW_EDGE_TYPES: ReadonlySet<string> = new Set([ActivityArtifact.controlFlow, ActivityArtifact.objectFlow]);
