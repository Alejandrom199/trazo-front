import { useMemo } from 'react';
import { validateProject, type Diagram, type ProjectIssue } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { projectRules } from '@/diagrams/crossDiagram';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';

/** Problemas entre los diagramas del proyecto abierto; vacío sin proyecto. */
export function useProjectIssues(): { issues: ProjectIssue[]; diagrams: Diagram[] } {
  const traceLinks = useProjectStore((state) => state.project?.traceLinks);
  const diagrams = useProjectDiagrams();
  const issues = useMemo(
    () => (traceLinks ? validateProject({ diagrams, traceLinks }, projectRules) : []),
    [diagrams, traceLinks],
  );
  return { issues, diagrams };
}
