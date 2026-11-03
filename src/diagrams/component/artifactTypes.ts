/** Claves del catálogo del diagrama de componentes. */
export const ComponentArtifact = {
  component: 'component',
  providedInterface: 'providedInterface',
  requiredInterface: 'requiredInterface',
  subsystem: 'subsystem',
  note: 'note',
  provision: 'provision',
  requirement: 'requirement',
  assembly: 'assembly',
  dependency: 'dependency',
  annotationLink: 'annotationLink',
} as const;

const C = ComponentArtifact;

/** Las dos caras de una interfaz: la que un componente ofrece y la que necesita. */
export const INTERFACE_TYPES: ReadonlySet<string> = new Set([C.providedInterface, C.requiredInterface]);
