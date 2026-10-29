import type { DiagramModule } from '@/core/registry';
import { activityArtifacts } from './artifacts';
import { resolveActivityConnection } from './connections';
import { activityEdgeKinds, activityNodeKinds } from './nodeKinds';

/**
 * Módulo del Diagrama de Actividades (UML 2.5).
 * Reglas de validación, narrador y plantillas se completan en las fases 3 a 5.
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
  templates: [],
};
