import { describe, expect, it } from 'vitest';
import { activityArtifacts } from '@/diagrams/activity/artifacts';
import { normalize, searchArtifacts } from './artifactSearch';

const names = (query: string) => searchArtifacts(activityArtifacts, query).map((artifact) => artifact.name);

describe('searchArtifacts', () => {
  it('Dada una búsqueda vacía, Entonces devuelve todo el catálogo en su orden', () => {
    expect(names('  ')).toEqual(activityArtifacts.map((artifact) => artifact.name));
  });

  it('Dada una palabra sin tilde, Entonces encuentra el artefacto con tilde', () => {
    expect(names('decision')[0]).toBe('Nodo de decisión');
  });

  it('Dado el nombre UML, Entonces encuentra el artefacto', () => {
    expect(names('ForkNode')).toContain('Nodo de bifurcación (fork)');
  });

  it('Dadas varias palabras, Entonces todas deben aparecer', () => {
    expect(names('nodo final').every((name) => normalize(name).includes('final'))).toBe(true);
  });

  it('Dada una coincidencia por nombre y otra por descripción, Entonces la del nombre va primero', () => {
    const results = names('accion');
    expect(results[0]).toBe('Acción');
  });

  it('Dado un texto que no existe, Entonces no devuelve nada', () => {
    expect(names('zzz')).toEqual([]);
  });
});
