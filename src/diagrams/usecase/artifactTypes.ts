export const UseCaseArtifact = {
  actor: 'actor',
  useCase: 'useCase',
  systemBoundary: 'systemBoundary',
  note: 'note',
  association: 'association',
  include: 'include',
  extend: 'extend',
  generalization: 'generalization',
  annotationLink: 'annotationLink',
} as const;

export const USE_CASE_RELATION_TYPES = [UseCaseArtifact.include, UseCaseArtifact.extend] as const;
