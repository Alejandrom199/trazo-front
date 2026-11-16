import { describe, expect, it } from 'vitest';
import { buildMapEdges, readLinkedDiagramId, validateDiagram, validateProject } from '@/core/model';
import { createRegistry } from '@/core/registry';
import { registerDiagramModules } from '.';
import { projectRules } from './crossDiagram';
import { buildSampleProject } from './sampleProject';

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
    const issues = validateProject({ diagrams, traceLinks: project.traceLinks }, projectRules).filter((issue) => issue.severity !== 'info');
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
});
