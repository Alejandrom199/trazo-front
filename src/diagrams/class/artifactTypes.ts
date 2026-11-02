export const ClassArtifact = {
  class: 'class', abstractClass: 'abstractClass', interface: 'interface', enumeration: 'enumeration', package: 'package', note: 'note',
  association: 'association', aggregation: 'aggregation', composition: 'composition', generalization: 'generalization', realization: 'realization', dependency: 'dependency', annotationLink: 'annotationLink',
} as const;

export const CLASSIFIER_TYPES: ReadonlySet<string> = new Set([
  ClassArtifact.class, ClassArtifact.abstractClass, ClassArtifact.interface, ClassArtifact.enumeration,
]);

export const CLASS_RELATION_TYPES = [
  ClassArtifact.association, ClassArtifact.aggregation, ClassArtifact.composition, ClassArtifact.generalization, ClassArtifact.realization, ClassArtifact.dependency,
];
