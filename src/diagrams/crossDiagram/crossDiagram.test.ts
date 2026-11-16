import { describe, expect, it } from 'vitest';
import { createEmptyDiagram, validateProject, type Diagram, type DiagramType, type ProjectSnapshot, type TraceLink } from '@/core/model';
import { lifelineTypeName, messageCallName, classifierOperations, normalizeName } from './names';
import { brokenDiagramLink, subprocessUnlinked, brokenTraceLink, inconsistentName, lifelineWithoutType, messageWithoutOperation, projectRules, useCaseNotDetailed } from './rules';

let counter = 0;
const id = () => `id${++counter}`;

/** Diagrama mínimo para las pruebas: nodos por [tipo, etiqueta] y conexiones por índices. */
function diagram(type: DiagramType, name: string, nodes: [string, string][], edges: [string, number, number, string][] = []): Diagram {
  const base = createEmptyDiagram({ name, diagramType: type });
  const built = nodes.map(([artifactType, label]) => ({
    id: id(), artifactType, label, position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, parentId: null, props: {}, notes: '', locked: false,
  }));
  return {
    ...base,
    nodes: built,
    edges: edges.map(([artifactType, from, to, label]) => ({
      id: id(), artifactType, sourceId: built[from]!.id, targetId: built[to]!.id, guard: null, label, routing: 'orthogonal', waypoints: [], lineStyle: null, props: {},
    })),
  };
}

const link = (source: Diagram, sourceIndex: number, target: Diagram, targetIndex: number): TraceLink => ({
  id: id(),
  source: { diagramId: source.id, elementId: source.nodes[sourceIndex]!.id, kind: 'node' },
  target: { diagramId: target.id, elementId: target.nodes[targetIndex]!.id, kind: 'node' },
  relation: 'detalla',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const snapshot = (diagrams: Diagram[], traceLinks: TraceLink[] = []): ProjectSnapshot => ({ diagrams, traceLinks });

describe('nombres entre diagramas', () => {
  it('compara sin tildes, mayúsculas ni espacios', () => {
    expect(normalizeName('Servicio Préstamos')).toBe(normalizeName('servicioPrestamos'));
  });

  it('lee el tipo de una línea de vida', () => {
    expect(lifelineTypeName(':Catálogo')).toBe('Catálogo');
    expect(lifelineTypeName('portal: PortalWeb')).toBe('PortalWeb');
    expect(lifelineTypeName('Socio')).toBe('Socio');
    expect(lifelineTypeName('portal:')).toBeNull();
  });

  it('lee la operación que invoca un mensaje', () => {
    expect(messageCallName('solicitarPréstamo(isbn)')).toBe('solicitarPréstamo');
    expect(messageCallName('1.2: [ok] p = crear(x)')).toBe('crear');
    expect(messageCallName('ejemplar disponible')).toBeNull();
  });

  it('lee las operaciones de una clase', () => {
    expect(classifierOperations({ label: 'Libro\n--\n-isbn: String\n--\n+estaDisponible(): Boolean\n# reservar()' })).toEqual(['estaDisponible', 'reservar']);
  });
});

describe('reglas de proyecto', () => {
  it('Dado un vínculo a un elemento borrado, Entonces avisa y el arreglo quita el vínculo', () => {
    const cases = diagram('usecase', 'Casos', [['useCase', 'Prestar libro']]);
    const activity = diagram('activity', 'Préstamo', [['action', 'Registrar']]);
    const broken = link(cases, 0, activity, 0);
    const withoutAction = { ...activity, nodes: [] };

    const issues = brokenTraceLink.check(snapshot([cases, withoutAction], [broken]));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.elements).toEqual([broken.source]);
    expect(issues[0]!.fix!.apply([broken])).toEqual([]);
    expect(brokenTraceLink.check(snapshot([cases, activity], [broken]))).toEqual([]);
  });

  it('Dado un caso de uso sin diagrama de comportamiento que lo cuente, Entonces sugiere detallarlo', () => {
    const cases = diagram('usecase', 'Casos', [['useCase', 'Prestar libro'], ['useCase', 'Devolver libro'], ['useCase', 'Reservar libro']]);
    const loan = diagram('activity', 'Prestar libro', [['action', 'Registrar']]);
    const returns = diagram('sequence', 'Devolución', [['lifeline', ':Portal']]);

    const issues = useCaseNotDetailed.check(snapshot([cases, loan, returns], [link(cases, 1, returns, 0)]));
    // «Prestar libro» lo detalla el diagrama con su nombre; «Devolver libro», el vínculo.
    expect(issues.map((issue) => issue.message)).toEqual(['El caso de uso «Reservar libro» no está detallado en ningún diagrama de comportamiento.']);
  });

  it('Dado un proyecto sin diagramas de comportamiento, Entonces no exige detallar los casos de uso', () => {
    const cases = diagram('usecase', 'Casos', [['useCase', 'Prestar libro']]);
    expect(useCaseNotDetailed.check(snapshot([cases]))).toEqual([]);
  });

  it('Dada una línea de vida cuyo tipo no es clase ni componente, Entonces lo sugiere', () => {
    const classes = diagram('class', 'Dominio', [['class', 'Libro\n--\n+estaDisponible()']]);
    const components = diagram('component', 'Módulos', [['component', 'Catálogo']]);
    const sequence = diagram('sequence', 'Préstamo', [['lifeline', ':Libro'], ['lifeline', ':Catalogo'], ['lifeline', ':Notificaciones'], ['actor', 'Socio']]);

    const issues = lifelineWithoutType.check(snapshot([classes, components, sequence]));
    expect(issues.map((issue) => issue.elements[0]!.elementId)).toEqual([sequence.nodes[2]!.id]);
    expect(lifelineWithoutType.check(snapshot([sequence]))).toEqual([]);
  });

  it('Dado un mensaje a una clase que no declara la operación, Entonces avisa', () => {
    const classes = diagram('class', 'Dominio', [['class', 'Libro\n--\n-isbn: String\n--\n+estaDisponible(): Boolean']]);
    const sequence = diagram('sequence', 'Préstamo', [['lifeline', ':Portal'], ['lifeline', ':Libro']], [
      ['syncMessage', 0, 1, 'estaDisponible()'],
      ['syncMessage', 0, 1, 'reservar(socio)'],
      ['replyMessage', 1, 0, 'sí()'],
      ['syncMessage', 1, 0, 'mostrar()'],
    ]);

    const issues = messageWithoutOperation.check(snapshot([classes, sequence]));
    expect(issues.map((issue) => issue.elements[0]!.elementId)).toEqual([sequence.edges[1]!.id]);
  });

  it('Dado el mismo concepto escrito distinto en dos diagramas, Entonces avisa con ambas escrituras', () => {
    const classes = diagram('class', 'Dominio', [['class', 'Préstamo'], ['class', 'Libro']]);
    const sequence = diagram('sequence', 'Flujo', [['lifeline', 'p: Prestamo'], ['lifeline', ':Libro']]);

    const issues = inconsistentName.check(snapshot([classes, sequence]));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('«Préstamo», «Prestamo»');
    expect(issues[0]!.elements).toHaveLength(2);
  });

  it('Dado un subproceso sin diagrama, Entonces lo sugiere; enlazado a uno ausente, Entonces avisa', () => {
    const main = diagram('activity', 'Pedido', [['callBehavior', 'Procesar pago'], ['callBehavior', 'Enviar pedido'], ['callBehavior', 'Facturar']]);
    const payment = diagram('activity', 'Procesar pago', [['action', 'Cobrar']]);
    main.nodes[0]!.props = { linkedDiagramId: payment.id };
    main.nodes[1]!.props = { linkedDiagramId: 'borrado' };

    expect(subprocessUnlinked.check(snapshot([main, payment])).map((issue) => issue.elements[0]!.elementId)).toEqual([main.nodes[2]!.id]);
    expect(brokenDiagramLink.check(snapshot([main, payment])).map((issue) => issue.elements[0]!.elementId)).toEqual([main.nodes[1]!.id]);
  });

  it('ordena los problemas del proyecto por gravedad', () => {
    const classes = diagram('class', 'Dominio', [['class', 'Libro']]);
    const sequence = diagram('sequence', 'Flujo', [['lifeline', ':Libro'], ['lifeline', ':Portal']], [['syncMessage', 1, 0, 'reservar()']]);
    const severities = validateProject(snapshot([classes, sequence]), projectRules).map((issue) => issue.severity);
    expect(severities).toEqual(['warning', 'info']);
  });
});
