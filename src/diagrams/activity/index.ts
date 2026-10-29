import type { DiagramModule } from '@/core/registry';

/**
 * Módulo del Diagrama de Actividades (UML 2.5).
 * Esqueleto de la Fase 0: catálogo, nodos, reglas, narrador y plantillas
 * se completan en las fases 1 a 5.
 */
export const activityModule: DiagramModule = {
  diagramType: 'activity',
  displayName: 'Diagrama de actividades',
  artifacts: [],
  nodeComponents: {},
  rules: [],
  narrate: () => [],
  templates: [],
};
