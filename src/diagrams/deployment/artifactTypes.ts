/** Claves del catálogo del diagrama de despliegue. */
export const DeploymentArtifact = {
  node: 'node',
  device: 'device',
  executionEnvironment: 'executionEnvironment',
  artifact: 'artifact',
  note: 'note',
  communicationPath: 'communicationPath',
  deployment: 'deployment',
  annotationLink: 'annotationLink',
} as const;

const D = DeploymentArtifact;

/** Dónde puede vivir un artefacto: nodos, dispositivos y entornos de ejecución. */
export const HOST_TYPES: ReadonlySet<string> = new Set([D.node, D.device, D.executionEnvironment]);

/** Máquinas físicas o virtuales: se comunican entre sí por caminos de comunicación. */
export const MACHINE_TYPES: ReadonlySet<string> = new Set([D.node, D.device]);
