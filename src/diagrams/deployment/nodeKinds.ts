import type { EdgeKind, NodeKind } from '@/core/registry';
import { NoteShape } from '@/diagrams/shared/NoteShape';
import { DeploymentArtifact as D } from './artifactTypes';
import { ArtifactShape, DeviceShape, ExecutionEnvironmentShape, NodeShape } from './nodes/DeploymentShapes';

const base: Omit<NodeKind, 'component' | 'defaultSize'> = {
  defaultLabel: '',
  defaultProps: {},
  hasLabel: true,
  resizable: true,
  isContainer: false,
  connectable: true,
  properties: [],
};

/**
 * Máquinas y entornos: contenedores (dentro van artefactos y entornos) que no se
 * pegan a sus vecinos. El entorno de ejecución, además, va dentro de una máquina.
 */
const host = { ...base, isContainer: true, magnetic: false, previewSize: { width: 120, height: 84 } };

export const deploymentNodeKinds: Record<string, NodeKind> = {
  [D.node]: { ...host, component: NodeShape, defaultSize: { width: 300, height: 200 }, defaultLabel: 'Servidor' },
  [D.device]: { ...host, component: DeviceShape, defaultSize: { width: 240, height: 170 }, defaultLabel: 'Dispositivo' },
  [D.executionEnvironment]: {
    ...host,
    component: ExecutionEnvironmentShape,
    defaultSize: { width: 220, height: 140 },
    defaultLabel: 'Entorno',
    nestable: true,
    connectable: false,
  },
  [D.artifact]: { ...base, component: ArtifactShape, defaultSize: { width: 150, height: 60 }, defaultLabel: 'app.jar', labelCaption: 'Nombre del archivo' },
  [D.note]: { ...base, component: NoteShape, defaultSize: { width: 170, height: 80 }, defaultLabel: 'Comentario', secondaryDetail: true },
};

export const deploymentEdgeKinds: Record<string, EdgeKind> = {
  [D.communicationPath]: { dashed: false, arrow: null, text: 'label', textCaption: 'Protocolo' },
  [D.deployment]: { dashed: true, arrow: 'open', text: 'label', textCaption: 'Estereotipo' },
  [D.annotationLink]: { dashed: true, arrow: null, text: null, secondaryDetail: true },
};
