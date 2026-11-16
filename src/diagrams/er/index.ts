import type { DiagramModule } from '@/core/registry';
import { erArtifacts } from './artifacts';
import { initialErEdge, resolveErConnection } from './connections';
import { erGuide } from './guide';
import { narrateEr } from './narrator';
import { erEdgeKinds, erNodeKinds } from './nodeKinds';
import { erRules } from './rules';
import { erTemplates } from './templates';

/** Módulo del diagrama entidad-relación (MER, notación de Chen). No es UML: va en «Modelado de datos». */
export const erModule: DiagramModule = {
  diagramType: 'er',
  displayName: 'Diagrama entidad-relación (MER)',
  artifacts: erArtifacts,
  nodeKinds: erNodeKinds,
  edgeKinds: erEdgeKinds,
  resolveConnection: resolveErConnection,
  initialEdge: (_diagram, edgeType) => initialErEdge(edgeType),
  rules: erRules,
  narrate: narrateEr,
  templates: erTemplates,
  guide: erGuide,
};
