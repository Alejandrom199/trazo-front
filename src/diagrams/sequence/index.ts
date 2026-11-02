import type { DiagramModule } from '@/core/registry';
import { sequenceArtifacts } from './artifacts';
import { initialSequenceEdge, resolveSequenceConnection } from './connections';
import { sequenceGuide } from './guide';
import { narrateSequence } from './narrator';
import { sequenceEdgeKinds, sequenceNodeKinds } from './nodeKinds';
import { sequenceRules } from './rules';
import { sequenceTemplates } from './templates';

/** Módulo del Diagrama de Secuencia (UML 2.5, Interacciones). */
export const sequenceModule: DiagramModule = {
  diagramType: 'sequence',
  displayName: 'Diagrama de secuencia',
  artifacts: sequenceArtifacts,
  nodeKinds: sequenceNodeKinds,
  edgeKinds: sequenceEdgeKinds,
  resolveConnection: resolveSequenceConnection,
  initialEdge: (diagram, edgeType, sourceId) => initialSequenceEdge(diagram, edgeType, sourceId),
  rules: sequenceRules,
  narrate: narrateSequence,
  templates: sequenceTemplates,
  guide: sequenceGuide,
};
