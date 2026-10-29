import type { DiagramModule } from '@/core/registry';
import { activityArtifacts } from './artifacts';
import { resolveActivityConnection } from './connections';
import { activityEdgeKinds, activityNodeKinds } from './nodeKinds';
import { activityTemplates } from './templates';

/**
 * Módulo del Diagrama de Actividades (UML 2.5).
 * Reglas de validación y narrador se completan en las fases 4 y 5.
 */
export const activityModule: DiagramModule = {
  diagramType: 'activity',
  displayName: 'Diagrama de actividades',
  artifacts: activityArtifacts,
  nodeKinds: activityNodeKinds,
  edgeKinds: activityEdgeKinds,
  resolveConnection: resolveActivityConnection,
  rules: [],
  narrate: () => [],
  templates: activityTemplates,
};
