import { useMemo } from 'react';
import { validateProject, type Diagram, type ProjectIssue } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { projectRules } from '@/diagrams/crossDiagram';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';

/** Problemas entre los diagramas del proyecto abierto; vacío sin proyecto. */
export function useProjectIssues(): { issues: ProjectIssue[]; diagrams: Diagram[] } {
  const project = useProjectStore((state) => state.project);
  const diagrams = useProjectDiagrams();
  const issues = useMemo(
    () => (project
      ? validateProject({ diagrams, traceLinks: project.traceLinks, requirements: project.requirements, requirementLinks: project.requirementLinks }, projectRules)
      : []),
    [diagrams, project],
  );
  return { issues, diagrams };
}
