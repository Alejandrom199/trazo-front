import type { DiagramModule } from '@/core/registry';
import { activityArtifacts } from './artifacts';
import { resolveActivityConnection } from './connections';
import { activityGuide } from './guide';
import { narrateActivity } from './narrator';
import { activityEdgeKinds, activityNodeKinds } from './nodeKinds';
import { activityRules } from './rules';
import { activityTemplates } from './templates';
import { activityWalkthrough } from './walkthrough';

/** Módulo del Diagrama de Actividades (UML 2.5). */
export const activityModule: DiagramModule = {
  diagramType: 'activity',
  displayName: 'Diagrama de actividades',
  artifacts: activityArtifacts,
  nodeKinds: activityNodeKinds,
  edgeKinds: activityEdgeKinds,
  resolveConnection: resolveActivityConnection,
  rules: activityRules,
  narrate: narrateActivity,
  walkthrough: activityWalkthrough,
  templates: activityTemplates,
  guide: activityGuide,
};
