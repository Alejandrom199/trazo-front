import type { DiagramModule } from '@/core/registry';
import { deploymentArtifacts } from './artifacts';
import { initialDeploymentEdge, resolveDeploymentConnection } from './connections';
import { deploymentGuide } from './guide';
import { narrateDeployment } from './narrator';
import { deploymentEdgeKinds, deploymentNodeKinds } from './nodeKinds';
import { deploymentRules } from './rules';
import { deploymentTemplates } from './templates';

/** Módulo del Diagrama de Despliegue (UML 2.5, cláusula 19). */
export const deploymentModule: DiagramModule = {
  diagramType: 'deployment',
  displayName: 'Diagrama de despliegue',
  artifacts: deploymentArtifacts,
  nodeKinds: deploymentNodeKinds,
  edgeKinds: deploymentEdgeKinds,
  resolveConnection: resolveDeploymentConnection,
  initialEdge: (_diagram, edgeType) => initialDeploymentEdge(edgeType),
  rules: deploymentRules,
  narrate: narrateDeployment,
  templates: deploymentTemplates,
  guide: deploymentGuide,
};
