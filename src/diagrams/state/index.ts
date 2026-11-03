import type { DiagramModule } from '@/core/registry';
import { stateArtifacts } from './artifacts';
import { resolveStateConnection } from './connections';
import { stateGuide } from './guide';
import { narrateStates } from './narrator';
import { stateEdgeKinds, stateNodeKinds } from './nodeKinds';
import { stateRules } from './rules';
import { stateTemplates } from './templates';

/** Módulo del Diagrama de Máquina de Estados (UML 2.5, cláusula 14). */
export const stateModule: DiagramModule = {
  diagramType: 'state',
  displayName: 'Diagrama de máquina de estados',
  artifacts: stateArtifacts,
  nodeKinds: stateNodeKinds,
  edgeKinds: stateEdgeKinds,
  resolveConnection: resolveStateConnection,
  rules: stateRules,
  narrate: narrateStates,
  templates: stateTemplates,
  guide: stateGuide,
};
