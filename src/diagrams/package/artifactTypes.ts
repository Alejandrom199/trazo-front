/** Claves del catálogo del diagrama de paquetes. */
export const PackageArtifact = {
  package: 'package',
  element: 'packagedElement',
  note: 'note',
  dependency: 'dependency',
  packageImport: 'packageImport',
  packageAccess: 'packageAccess',
  annotationLink: 'annotationLink',
} as const;

const P = PackageArtifact;

/** Las tres relaciones entre paquetes: se puede cambiar de una a otra. */
export const DEPENDENCY_TYPES: readonly string[] = [P.dependency, P.packageImport, P.packageAccess];

/** Estereotipo con el que nace cada relación. */
export const DEPENDENCY_STEREOTYPE: Readonly<Record<string, string>> = {
  [P.dependency]: '',
  [P.packageImport]: '«import»',
  [P.packageAccess]: '«access»',
};
