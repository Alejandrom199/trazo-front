import type { DiagramModule } from '@/core/registry';
import { classArtifacts } from './artifacts';
import { resolveClassConnection } from './connections';
import { classGuide } from './guide';
import { narrateClass } from './narrator';
import { classEdgeKinds, classNodeKinds } from './nodeKinds';
import { classRules } from './rules';
import { classTemplates } from './templates';
export const classModule: DiagramModule = { diagramType: 'class', displayName: 'Diagrama de clases', artifacts: classArtifacts, nodeKinds: classNodeKinds, edgeKinds: classEdgeKinds, resolveConnection: resolveClassConnection, rules: classRules, narrate: narrateClass, templates: classTemplates, guide: classGuide };
