import type { DiagramModule } from '@/core/registry';
import { classArtifacts } from './artifacts';
import { initialClassEdge, resolveClassConnection } from './connections';
import { classGuide } from './guide';
import { narrateClass } from './narrator';
import { classEdgeKinds, classNodeKinds } from './nodeKinds';
import { classRules } from './rules';
import { classTemplates } from './templates';
export const classModule: DiagramModule = {
  diagramType: 'class',
  displayName: 'Diagrama de clases',
  artifacts: classArtifacts,
  nodeKinds: classNodeKinds,
  edgeKinds: classEdgeKinds,
  resolveConnection: resolveClassConnection,
  initialEdge: (_diagram, edgeType) => initialClassEdge(edgeType),
  rules: classRules,
  narrate: narrateClass,
  templates: classTemplates,
  guide: classGuide,
};
