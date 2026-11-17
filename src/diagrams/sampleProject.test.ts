import { describe, expect, it } from 'vitest';
import { buildMapEdges, coverageSummary, readLinkedDiagramId, requirementCoverage, reviewRequirement, validateDiagram, validateProject } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { registerDiagramModules } from '.';
import { projectRules } from './crossDiagram';
import { buildSampleProject } from './sampleProject';
import { UseCaseArtifact } from './usecase/artifactTypes';
import { readSpec, reviewSpec, useCaseContext } from './usecase/spec';

const registry = createRegistry();
registerDiagramModules(registry);
let counter = 0;
const { project, diagrams } = buildSampleProject(() => `id${++counter}`, new Date(0));

describe('proyecto de ejemplo Biblioteca Digital', () => {
  it('Dados sus diagramas, Entonces ninguno tiene errores ni advertencias propios', () => {
    for (const diagram of diagrams) {
      const serious = validateDiagram(diagram, registry.get(diagram.diagramType).rules).filter((issue) => issue.severity !== 'info');
      expect({ diagram: diagram.name, serious }).toEqual({ diagram: diagram.name, serious: [] });
    }
  });

  it('Dado el proyecto entero, Entonces no hay problemas serios entre diagramas', () => {
    const issues = validateProject({ diagrams, traceLinks: project.traceLinks, requirements: project.requirements, requirementLinks: project.requirementLinks }, projectRules)
      .filter((issue) => issue.severity !== 'info');
    expect(issues).toEqual([]);
  });

  it('Dado el subproceso, Entonces enlaza el diagrama «Validar disponibilidad» del mismo proyecto', () => {
    const linked = diagrams.flatMap((diagram) => diagram.nodes).map(readLinkedDiagramId).filter((id) => id !== null);
    expect(linked.map((id) => diagrams.find((diagram) => diagram.id === id)?.name)).toEqual(['Validar disponibilidad']);
  });

  it('Dadas las carpetas y relaciones, Entonces todo diagrama tiene carpeta y el mapa muestra los tres tipos de flecha', () => {
    expect(project.diagramIds.every((id) => project.folderOf[id])).toBe(true);
    const kinds = new Set(buildMapEdges(diagrams, project).map((edge) => edge.kind));
    expect(kinds).toEqual(new Set(['subprocess', 'trace', 'relation']));
  });

  it('Dados sus requisitos, Entonces cubre todos los aprobados y deja pendiente solo el propuesto', () => {
    const coverage = requirementCoverage(project.requirements, project.requirementLinks, diagrams);
    expect(coverage.filter((item) => !item.covered).map((item) => item.requirement.code)).toEqual(['RF-04']);
    expect(coverage.every((item) => item.broken.length === 0)).toBe(true);
    expect(coverageSummary(coverage)).toEqual({ total: 6, covered: 5, percent: 83 });
  });

  it('Dadas sus fichas, Entonces sirven de modelo: ninguna tiene advertencias del revisor', () => {
    const warnings = project.requirements.map((item) => [item.code, reviewRequirement(item).filter((hint) => hint.level === 'warning').map((hint) => hint.text)]);
    expect(warnings).toEqual(project.requirements.map((item) => [item.code, []]));
  });

  it('Dados sus casos de uso, Entonces cada uno tiene su ficha CU sin advertencias del revisor', () => {
    const useCaseDiagram = diagrams.find((diagram) => diagram.name === 'Casos de uso')!;
    const useCases = useCaseDiagram.nodes.filter((node) => node.artifactType === UseCaseArtifact.useCase);
    const sheets = useCases.map((node) => {
      const spec = readSpec(node);
      const references = project.requirementLinks.filter((link) => link.elementId === node.id).length;
      return [spec?.code, spec ? reviewSpec(spec, useCaseContext(useCaseDiagram, node.id), references).filter((hint) => hint.level === 'warning') : ['sin ficha']];
    });
    expect(sheets).toEqual([['CU01', []], ['CU02', []], ['CU03', []]]);
  });
});
