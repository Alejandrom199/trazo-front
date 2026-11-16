import { describe, expect, it } from 'vitest';
import { containerJoints, moveLaneInFrame, NO_JOINTS, packLanes, snapContainerPosition } from './containerLayout';
import type { Diagram, DiagramNode } from './diagram';
import { createEmptyDiagram } from './factories';

function lane(id: string, x: number, y = 0, overrides: Partial<DiagramNode> = {}): DiagramNode {
  return {
    id,
    artifactType: 'partition',
    label: id,
    position: { x, y },
    size: { width: 200, height: 400 },
    parentId: null,
    props: {},
    notes: '',
    locked: false,
    ...overrides,
  };
}

const isLane = (node: DiagramNode) => node.artifactType === 'partition';
const diagramWith = (nodes: DiagramNode[]): Diagram => ({ ...createEmptyDiagram({ diagramType: 'activity', name: 't' }), nodes });
const size = { width: 200, height: 400 };

describe('snapContainerPosition', () => {
  it('Dado un carril a 10 px a la derecha de otro, Entonces se pega a su costado y alinea el borde superior', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, null, { x: 210, y: 8 }, size, isLane)).toEqual({ x: 200, y: 0 });
  });

  it('Dado un carril que se acerca por la izquierda, Entonces se pega con su borde derecho', () => {
    const diagram = diagramWith([lane('a', 300)]);

    expect(snapContainerPosition(diagram, null, { x: 95, y: 0 }, size, isLane)).toEqual({ x: 100, y: 0 });
  });

  it('Dado un carril lejos de todos, Entonces conserva su posición', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, null, { x: 260, y: 0 }, size, isLane)).toEqual({ x: 260, y: 0 });
  });

  it('Dado el propio carril que se mueve, Entonces no se pega a sí mismo', () => {
    const diagram = diagramWith([lane('a', 0)]);

    expect(snapContainerPosition(diagram, 'a', { x: 5, y: 0 }, size, isLane)).toEqual({ x: 5, y: 0 });
  });
});

describe('containerJoints', () => {
  it('Dados dos carriles alineados y pegados, Entonces se enderezan las esquinas del lado común y el de la derecha no repite el borde', () => {
    const left = lane('a', 0);
    const right = lane('b', 200);
    const diagram = diagramWith([left, right]);

    expect(containerJoints(diagram, left, isLane)).toEqual({
      coveredSides: { top: false, right: true, bottom: false, left: false },
      squareCorners: { topLeft: false, topRight: true, bottomRight: true, bottomLeft: false },
    });
    expect(containerJoints(diagram, right, isLane).coveredSides.left).toBe(true);
  });

  it('Dados carriles pegados pero desalineados en altura, Entonces solo se endereza la esquina a la que llega el vecino y ambos conservan su borde', () => {
    // a: y 0..400; b: y 160..560, pegado a la derecha (como en la foto del problema).
    const a = lane('a', 0);
    const b = lane('b', 200, 160);
    const diagram = diagramWith([a, b]);

    const jointsA = containerJoints(diagram, a, isLane);
    const jointsB = containerJoints(diagram, b, isLane);

    expect(jointsA.squareCorners).toEqual({ topLeft: false, topRight: false, bottomRight: true, bottomLeft: false });
    expect(jointsA.coveredSides.right).toBe(false);
    expect(jointsB.squareCorners).toEqual({ topLeft: true, topRight: false, bottomRight: false, bottomLeft: false });
    expect(jointsB.coveredSides.left).toBe(false);
  });

  it('Dados dos carriles separados, Entonces no hay uniones', () => {
    const diagram = diagramWith([lane('a', 0), lane('b', 240)]);

    expect(containerJoints(diagram, diagram.nodes[0]!, isLane)).toEqual(NO_JOINTS);
  });

  it('Dados carriles alineados en x pero sin tramo vertical en común, Entonces no están unidos', () => {
    const diagram = diagramWith([lane('a', 0), lane('b', 200, 500)]);

    expect(containerJoints(diagram, diagram.nodes[0]!, isLane).squareCorners.topRight).toBe(false);
  });
});

describe('carriles dentro de un marco', () => {
  const isBox = (node: DiagramNode) => node.artifactType === 'partition' || node.artifactType === 'activityFrame';
  const frame = (width = 500, height = 300) => lane('marco', 0, 0, { artifactType: 'activityFrame', size: { width, height } });
  const inFrame = (id: string, x: number, width = 200) => lane(id, x, 7, { parentId: 'marco', size: { width, height: 150 } });

  it('Dados carriles sueltos en un marco, Entonces quedan en columnas, en su orden, bajo el encabezado y con su alto', () => {
    const packed = packLanes(diagramWith([frame(), inFrame('b', 260), inFrame('a', 30)]), 'marco', 40, isBox);
    const byId = (id: string) => packed.nodes.find((node) => node.id === id)!;

    expect(byId('a').position).toEqual({ x: 0, y: 40 });
    expect(byId('b').position).toEqual({ x: 200, y: 40 });
    expect(byId('a').size.height).toBe(260);
  });

  it('Dados carriles que no caben, Entonces el marco crece; nunca se encoge', () => {
    const packed = packLanes(diagramWith([frame(300, 300), inFrame('a', 0), inFrame('b', 250)]), 'marco', 40, isBox);
    expect(packed.nodes.find((node) => node.id === 'marco')!.size.width).toBe(400);
  });

  it('Dado un carril en el borde del marco, Entonces esa esquina queda recta sin ocultar su borde', () => {
    const packed = packLanes(diagramWith([frame(400, 300), inFrame('a', 0), inFrame('b', 250)]), 'marco', 40, isBox);
    const joints = containerJoints(packed, packed.nodes.find((node) => node.id === 'a')!, isBox);

    expect(joints.squareCorners).toEqual({ topLeft: true, topRight: true, bottomRight: true, bottomLeft: true });
    expect(joints.coveredSides.left).toBe(false);
  });

  it('Dado un carril que se mueve al primer lugar, Entonces los demás se corren a la derecha', () => {
    const packed = packLanes(diagramWith([frame(), inFrame('a', 0), inFrame('b', 200), inFrame('c', 400)]), 'marco', 40, isBox);
    const moved = moveLaneInFrame(packed, 'marco', 'c', 0, 40, isBox);
    const xOf = (id: string) => moved.nodes.find((node) => node.id === id)!.position.x;

    expect([xOf('c'), xOf('a'), xOf('b')]).toEqual([0, 200, 400]);
  });
});
