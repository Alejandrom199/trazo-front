import type { DiagramModule } from '@/core/registry';
import { packageArtifacts } from './artifacts';
import { initialPackageEdge, resolvePackageConnection } from './connections';
import { packageGuide } from './guide';
import { narratePackages } from './narrator';
import { packageEdgeKinds, packageNodeKinds } from './nodeKinds';
import { packageRules } from './rules';
import { packageTemplates } from './templates';

/** Módulo del Diagrama de Paquetes (UML 2.5, cláusula 12). */
export const packageModule: DiagramModule = {
  diagramType: 'package',
  displayName: 'Diagrama de paquetes',
  artifacts: packageArtifacts,
  nodeKinds: packageNodeKinds,
  edgeKinds: packageEdgeKinds,
  resolveConnection: resolvePackageConnection,
  initialEdge: (_diagram, edgeType) => initialPackageEdge(edgeType),
  rules: packageRules,
  narrate: narratePackages,
  templates: packageTemplates,
  guide: packageGuide,
};
