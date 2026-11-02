import type { DiagramModule } from '@/core/registry';
import { useCaseArtifacts } from './artifacts';
import { initialUseCaseEdge, resolveUseCaseConnection } from './connections';
import { useCaseGuide } from './guide';
import { narrateUseCase } from './narrator';
import { useCaseEdgeKinds, useCaseNodeKinds } from './nodeKinds';
import { useCaseRules } from './rules';
import { useCaseTemplates } from './templates';

export const useCaseModule: DiagramModule = {
  diagramType: 'usecase', displayName: 'Diagrama de casos de uso', artifacts: useCaseArtifacts,
  nodeKinds: useCaseNodeKinds, edgeKinds: useCaseEdgeKinds, resolveConnection: resolveUseCaseConnection,
  initialEdge: (_diagram, edgeType) => initialUseCaseEdge(edgeType), rules: useCaseRules,
  narrate: narrateUseCase, templates: useCaseTemplates, guide: useCaseGuide,
};
