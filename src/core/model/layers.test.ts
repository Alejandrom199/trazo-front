import { describe, expect, it } from 'vitest';
import type { DiagramNode } from './diagram';
import { moveInLayers, placeRelativeTo } from './layers';

const node = (id: string, parentId: string | null = null): DiagramNode => ({
  id,
  artifactType: 'action',
  label: id,
  position: { x: 0, y: 0 },
  size: { width: 10, height: 10 },
  parentId,
  props: {},
  notes: '',
  locked: false,
});

const groupOf = (candidate: DiagramNode) => candidate.parentId ?? 'lienzo';
const ids = (nodes: DiagramNode[]) => nodes.map((candidate) => candidate.id);
const base = [node('a'), node('b'), node('c'), node('d')];

describe('moveInLayers', () => {
  it('Dado «traer al frente», Entonces el nodo pasa al final (se dibuja encima de todos)', () => {
    expect(ids(moveInLayers(base, new Set(['b']), 'front', groupOf))).toEqual(['a', 'c', 'd', 'b']);
  });

  it('Dado «enviar al fondo», Entonces pasa al principio', () => {
    expect(ids(moveInLayers(base, new Set(['c']), 'back', groupOf))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('Dados «adelante» y «atrás», Entonces se mueve un solo puesto', () => {
    expect(ids(moveInLayers(base, new Set(['b']), 'forward', groupOf))).toEqual(['a', 'c', 'b', 'd']);
    expect(ids(moveInLayers(base, new Set(['c']), 'backward', groupOf))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('Dados varios elegidos juntos, Entonces avanzan sin adelantarse entre sí', () => {
    expect(ids(moveInLayers(base, new Set(['a', 'b']), 'forward', groupOf))).toEqual(['c', 'a', 'b', 'd']);
  });

  it('Dados nodos en contenedores distintos, Entonces solo se reordena entre hermanos', () => {
    const nodes = [node('carril'), node('x', 'carril'), node('suelto'), node('y', 'carril')];
    expect(ids(moveInLayers(nodes, new Set(['x']), 'front', groupOf))).toEqual(['carril', 'y', 'suelto', 'x']);
  });

  it('Dado un movimiento que no cambia nada, Entonces devuelve la misma lista', () => {
    expect(moveInLayers(base, new Set(['d']), 'front', groupOf)).toBe(base);
  });
});

describe('placeRelativeTo', () => {
  it('Dado soltar delante de otro, Entonces queda justo encima de él', () => {
    expect(ids(placeRelativeTo(base, 'a', 'c', true, groupOf))).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(placeRelativeTo(base, 'd', 'b', false, groupOf))).toEqual(['a', 'd', 'b', 'c']);
  });

  it('Dados nodos que no son hermanos, Entonces no cambia nada', () => {
    const nodes = [node('carril'), node('x', 'carril'), node('suelto')];
    expect(placeRelativeTo(nodes, 'x', 'suelto', true, groupOf)).toBe(nodes);
  });
});
