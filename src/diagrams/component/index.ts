import type { DiagramModule } from '@/core/registry';
import { componentArtifacts } from './artifacts';
import { initialComponentEdge, resolveComponentConnection } from './connections';
import { componentGuide } from './guide';
import { narrateComponents } from './narrator';
import { componentEdgeKinds, componentNodeKinds } from './nodeKinds';
import { componentRules } from './rules';
import { componentTemplates } from './templates';

/** Módulo del Diagrama de Componentes (UML 2.5, cláusula 11). */
export const componentModule: DiagramModule = {
  diagramType: 'component',
  displayName: 'Diagrama de componentes',
  artifacts: componentArtifacts,
  nodeKinds: componentNodeKinds,
  edgeKinds: componentEdgeKinds,
  resolveConnection: resolveComponentConnection,
  initialEdge: (_diagram, edgeType) => initialComponentEdge(edgeType),
  rules: componentRules,
  narrate: narrateComponents,
  templates: componentTemplates,
  guide: componentGuide,
};
