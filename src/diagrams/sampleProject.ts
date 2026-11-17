import {
  createDiagramFromTemplate,
  draftTestCase,
  emptyProjectDocument,
  enumerateScenarios,
  nodeName,
  requirementDefaults,
  withLinkedDiagram,
  type Diagram,
  type DiagramProject,
  type Requirement,
  type RequirementLink,
  type TestCase,
  type ProjectDocument,
  type DiagramRelation,
  type Template,
  type TraceEndpoint,
  type TraceLink,
  type TraceRelation,
} from '@/core/model';
import { ActivityArtifact as A } from './activity/artifactTypes';
import { activityWalkthrough } from './activity/walkthrough';
import { createTemplateBuilder } from './activity/templates/templateBuilder';
import { classTemplates } from './class/templates';
import { componentTemplates } from './component/templates';
import { deploymentTemplates } from './deployment/templates';
import { erTemplates } from './er/templates';
import { sequenceTemplates } from './sequence/templates';
import { withSpec, type UseCaseSpec } from './usecase/spec';
import { useCaseTemplates } from './usecase/templates';

/**
 * Proyecto de ejemplo «Biblioteca Digital»: muestra juntas todas las piezas de
 * un proyecto en Trazo. Carpetas por etapa, un proceso con marco y carriles cuyo
 * paso «Validar disponibilidad» es un subproceso enlazado, el MER de la base de
 * datos, relaciones entre diagramas y vínculos entre elementos, para que el mapa
 * del proyecto y la trazabilidad tengan algo que contar.
 */

export const SAMPLE_PROJECT_NAME = 'Biblioteca Digital';

export interface SampleProject {
  project: Omit<DiagramProject, 'id' | 'createdAt' | 'updatedAt'>;
  diagrams: Diagram[];
}

/** Proceso principal: marco con tres carriles; la validación es un subproceso (⋔). */
function loanProcess(): Template {
  const t = createTemplateBuilder();
  t.frame('Pedir un préstamo');
  t.lane('Socio', 0, 260, 560);
  t.lane('Portal', 260, 260, 560);
  t.lane('Bibliotecario', 520, 260, 560);
  const start = t.node(A.initialNode, '', { x: 130, y: 70 });
  const search = t.node(A.action, 'Buscar el libro', { x: 130, y: 150 });
  const validate = t.node(A.callBehavior, 'Validar disponibilidad', { x: 390, y: 150 });
  const available = t.node(A.decision, '¿Disponible?', { x: 390, y: 250 });
  const reserve = t.node(A.action, 'Reservar el libro', { x: 130, y: 250 });
  const reserved = t.node(A.activityFinal, '', { x: 130, y: 340 });
  const register = t.node(A.action, 'Registrar el préstamo', { x: 650, y: 250 });
  const deliver = t.node(A.action, 'Entregar el libro', { x: 650, y: 450 });
  const receive = t.node(A.action, 'Recibir el libro', { x: 130, y: 450 });
  const end = t.node(A.activityFinal, '', { x: 130, y: 525 });
  t.flow(start, search);
  t.flow(search, validate);
  t.flow(validate, available);
  t.flow(available, register, 'disponible');
  t.flow(available, reserve, 'no disponible');
  t.flow(reserve, reserved);
  t.flow(register, deliver);
  t.flow(deliver, receive);
  t.flow(receive, end);
  return t.build({ id: 'sample.loan', name: 'Pedir un préstamo', description: 'El socio pide un libro; el portal valida la disponibilidad (subproceso) y el bibliotecario lo entrega.', difficulty: 'intermedio', learningGoals: [] });
}

/** Subproceso: el detalle del paso «Validar disponibilidad». */
function availabilityProcess(): Template {
  const t = createTemplateBuilder();
  const start = t.node(A.initialNode, '', { x: 260, y: 40 });
  const query = t.node(A.action, 'Consultar el catálogo', { x: 260, y: 120 });
  const copies = t.node(A.decision, '¿Hay ejemplares libres?', { x: 260, y: 210 });
  const hold = t.node(A.action, 'Apartar un ejemplar', { x: 260, y: 300 });
  // Los finales con nombre son el resultado que usa «¿Disponible?» en el proceso mayor.
  const ok = t.node(A.activityFinal, 'disponible', { x: 260, y: 380 });
  const blocked = t.node(A.action, 'Informar que no hay ejemplares', { x: 540, y: 210 });
  const none = t.node(A.activityFinal, 'no disponible', { x: 540, y: 300 });
  t.flow(start, query);
  t.flow(query, copies);
  t.flow(copies, hold, 'sí');
  t.flow(copies, blocked, 'no');
  t.flow(hold, ok);
  t.flow(blocked, none);
  return t.build({ id: 'sample.availability', name: 'Validar disponibilidad', description: 'Detalle del subproceso: se consulta el catálogo y se aparta un ejemplar si lo hay.', difficulty: 'básico', learningGoals: [] });
}

/** Descripción de cada actor (sus notas en el diagrama): el ERS la usa en 5.1 Actores. */
const ACTOR_NOTES: Record<string, string> = {
  Socio: 'Persona inscrita en la biblioteca que busca, pide y devuelve libros desde el portal.',
  Bibliotecario: 'Empleado de la biblioteca que entrega los libros prestados y recibe las devoluciones.',
};

/**
 * Datos del documento ERS del ejemplo (lo que el modelo no sabe): con ellos el
 * ERS de «Biblioteca Digital» sale completo.
 */
const SAMPLE_DOCUMENT: ProjectDocument = {
  ...emptyProjectDocument(),
  client: 'Biblioteca Municipal Central',
  version: '1.0',
  problem: 'La biblioteca presta sus libros solo en el mostrador: el socio debe acercarse para saber si hay ejemplares y el bibliotecario registra cada préstamo a mano en fichas de papel.\nAfecta a: socios, bibliotecarios y la dirección de la biblioteca.\nCuyo impacto es:\n- Filas en el mostrador en las horas de más demanda.\n- Préstamos sin registrar o con la fecha de devolución equivocada.\n- No se sabe qué libros están prestados ni a quién sin revisar las fichas.',
  objective: 'Para la Biblioteca Municipal Central, que necesita prestar sus libros sin filas y con un registro confiable, el producto Biblioteca Digital es un portal web que permite a los socios buscar, pedir y reservar libros, y a los bibliotecarios registrar entregas y devoluciones.',
  scope: 'La solución permitirá:\n- Módulo de catálogo: buscar libros y ver cuántos ejemplares están libres.\n- Módulo de préstamos: pedir un libro, registrar la entrega y la devolución, con fecha de devolución a 15 días.\n- Módulo de reservas: reservar un libro sin ejemplares libres y avisar cuando se libere.',
  notIncluded: '- El cobro de multas en línea.\n- Los libros digitales (préstamo de PDF o e-books).',
  risks: '- Que los socios de más edad no usen el portal: se mantiene la atención en el mostrador.\n- Que el catálogo inicial tenga ejemplares mal registrados: se hará un inventario antes de empezar.',
  context: 'La biblioteca atiende a unos 3 000 socios, tiene alrededor de 12 000 ejemplares y trabajan 6 bibliotecarios en dos turnos.',
  future: '- Avisos por correo antes del vencimiento (RF-04).\n- Aplicación móvil para socios.',
  glossary: [
    { term: 'Ejemplar', definition: 'Cada copia física de un libro; un libro puede tener varios.', alias: 'Copia', abbreviation: '' },
    { term: 'Préstamo activo', definition: 'Préstamo entregado al socio y aún no devuelto.', alias: '', abbreviation: '' },
    { term: 'Reserva', definition: 'Pedido de un libro sin ejemplares libres; caduca a los 3 días de quedar disponible.', alias: '', abbreviation: '' },
  ],
  audience: [
    { name: 'Dirección de la biblioteca', role: 'Patrocinador', responsibility: 'Aprobar el proyecto y su alcance', interests: 'Reducir filas y tener un registro confiable', contact: '' },
    { name: 'Bibliotecarios', role: 'Usuario directo', responsibility: 'Registrar entregas y devoluciones', interests: 'Menos trabajo manual y menos errores', contact: '' },
    { name: 'Socios', role: 'Usuario directo', responsibility: 'Buscar, pedir y devolver libros', interests: 'Pedir libros sin ir al mostrador', contact: '' },
    { name: 'Analista de requerimientos', role: 'Equipo', responsibility: 'Especificar y validar los requerimientos', interests: 'Requerimientos claros y verificables', contact: '' },
  ],
  userInterfaces: 'Portal web adaptable a computadora y teléfono, con búsqueda en la parte superior, el detalle de cada libro con su disponibilidad y la lista de préstamos del socio.',
  hardwareInterfaces: 'No aplica: se usa el lector de código de barras del mostrador como un teclado.',
  softwareInterfaces: 'Base de datos PostgreSQL gestionada; servicio de correo para los avisos (versión futura).',
  communicationInterfaces: 'HTTPS entre el portal y la API; la base de datos solo acepta conexiones de la API (TCP 5432).',
  designConstraints: '- API REST en un contenedor Docker.\n- La base de datos no se expone a internet.',
  licensing: 'No aplica: se usa software de código abierto.',
  changeControl: '- Toda solicitud de cambio la aprueba la dirección de la biblioteca.\n- El analista evalúa su impacto con el mapa del proyecto y la matriz de trazabilidad.\n- Se acuerda la prioridad y la versión en que entra.\n- Se actualizan los requerimientos, los diagramas y los casos de prueba afectados.',
  observations: 'Ninguna.',
};

/** Fichas de los casos de uso del ejemplo, por nombre del caso. */
const USE_CASE_SPECS: Record<string, UseCaseSpec> = {
  'Buscar un libro': {
    code: 'CU01', purpose: 'Encontrar un libro del catálogo y saber si se puede pedir.', importance: 'primario', level: 'esencial',
    summary: 'El socio busca por título o autor y el sistema le muestra los libros que coinciden y su disponibilidad.',
    preconditions: ['El socio está en el portal de la biblioteca.'],
    postconditions: ['El socio ve los libros que coinciden y cuáles tienen ejemplares libres.'],
    typicalCourse: [
      { by: 'actor', text: 'Escribe el título, el autor o un tema.' },
      { by: 'system', text: 'Busca en el catálogo los libros que coinciden.' },
      { by: 'system', text: 'Muestra la lista con la disponibilidad de cada libro.' },
      { by: 'actor', text: 'Elige un libro para ver su detalle.' },
      { by: 'system', text: 'Muestra el detalle y cuántos ejemplares están libres.' },
    ],
    alternateCourses: [{ step: 2, text: 'Si ningún libro coincide, muestra «No hay resultados» y sugiere revisar lo escrito.' }],
  },
  'Pedir un préstamo': {
    code: 'CU02', purpose: 'Llevarse un libro prestado sin hacer trámites en el mostrador.', importance: 'primario', level: 'esencial',
    summary: 'El socio pide un libro con ejemplares libres; el sistema registra el préstamo y le confirma la fecha de devolución.',
    preconditions: ['El socio inició sesión en el portal.', 'El socio no tiene préstamos vencidos.'],
    postconditions: ['El préstamo queda registrado con su fecha de devolución.', 'El ejemplar queda marcado como prestado.'],
    typicalCourse: [
      { by: 'actor', text: 'Elige el libro y selecciona «Pedir préstamo».' },
      { by: 'system', text: 'Comprueba que haya un ejemplar libre y lo aparta.' },
      { by: 'system', text: 'Muestra el resumen del préstamo con la fecha de devolución.' },
      { by: 'actor', text: 'Confirma el préstamo.' },
      { by: 'system', text: 'Registra el préstamo y confirma al socio la fecha de devolución.' },
    ],
    alternateCourses: [
      { step: 2, text: 'Si no hay ejemplares libres, ofrece reservar el libro.' },
      { step: 4, text: 'Si el socio cancela, libera el ejemplar apartado.' },
    ],
  },
  'Devolver un libro': {
    code: 'CU03', purpose: 'Cerrar un préstamo y dejar el ejemplar disponible para otros.', importance: 'primario', level: 'esencial',
    summary: 'El bibliotecario recibe el libro y el sistema cierra el préstamo del socio.',
    preconditions: ['El socio tiene un préstamo abierto de ese ejemplar.'],
    postconditions: ['El préstamo queda cerrado.', 'El ejemplar vuelve a estar libre.'],
    typicalCourse: [
      { by: 'actor', text: 'Registra el código del ejemplar devuelto.' },
      { by: 'system', text: 'Busca el préstamo abierto de ese ejemplar.' },
      { by: 'system', text: 'Cierra el préstamo y marca el ejemplar como libre.' },
    ],
    alternateCourses: [{ step: 3, text: 'Si la devolución llega vencida, registra la demora en la cuenta del socio.' }],
  },
};

const fromCatalog =(templates: Template[], id: string): Template => {
  const template = templates.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Proyecto de ejemplo: falta la plantilla «${id}».`);
  return template;
};

/**
 * Arma el proyecto con ids nuevos (de `createId`). Puro salvo por `createId` y
 * `now`, para poder probarlo.
 */
export function buildSampleProject(createId: () => string, now: Date = new Date()): SampleProject {
  const make = (template: Template, name: string): Diagram => ({ ...createDiagramFromTemplate(template, now), id: createId(), name });

  const useCasesBase = make(fromCatalog(useCaseTemplates, 'usecase.library'), 'Casos de uso');
  // Cada caso trae su ficha (CU01…), como en un documento de análisis.
  const useCases: Diagram = {
    ...useCasesBase,
    nodes: useCasesBase.nodes.map((node) => {
      const spec = USE_CASE_SPECS[nodeName(node, '')];
      const actorNotes = ACTOR_NOTES[nodeName(node, '')];
      if (actorNotes) return { ...node, notes: actorNotes };
      return spec ? { ...node, props: withSpec(node.props, spec) } : node;
    }),
  };
  const loanBase = make(loanProcess(), 'Pedir un préstamo');
  const availability = make(availabilityProcess(), 'Validar disponibilidad');
  const sequence = make(fromCatalog(sequenceTemplates, 'sequence.library-loan'), 'Préstamo en el portal');
  const domain = make(fromCatalog(classTemplates, 'class.library'), 'Dominio');
  const database = make(fromCatalog(erTemplates, 'er.library'), 'Base de datos');
  const components = make(fromCatalog(componentTemplates, 'component.library'), 'Componentes');
  const deployment = make(fromCatalog(deploymentTemplates, 'deployment.library'), 'Despliegue');

  // El paso ⋔ del préstamo enlaza el diagrama que lo detalla.
  const loan: Diagram = {
    ...loanBase,
    nodes: loanBase.nodes.map((node) => (node.artifactType === A.callBehavior ? { ...node, props: withLinkedDiagram(node.props, availability.id) } : node)),
  };

  const diagrams = [useCases, loan, availability, sequence, domain, database, components, deployment];
  const folders = [
    { id: createId(), name: 'Análisis' },
    { id: createId(), name: 'Diseño' },
    { id: createId(), name: 'Datos e infraestructura' },
  ];
  const [analysis, design, data] = folders.map((folder) => folder.id) as [string, string, string];
  const folderOf: Record<string, string> = {
    [useCases.id]: analysis,
    [loan.id]: analysis,
    [availability.id]: analysis,
    [sequence.id]: design,
    [domain.id]: design,
    [components.id]: design,
    [database.id]: data,
    [deployment.id]: data,
  };

  const relation = (source: Diagram, target: Diagram, kind: TraceRelation): DiagramRelation =>
    ({ id: createId(), sourceDiagramId: source.id, targetDiagramId: target.id, relation: kind, createdAt: now.toISOString() });
  const diagramRelations = [
    relation(loan, useCases, 'detalla'),
    relation(sequence, loan, 'detalla'),
    relation(database, domain, 'implementa'),
    relation(components, domain, 'implementa'),
    relation(deployment, components, 'implementa'),
  ];

  const endpoint = (diagram: Diagram, label: string): TraceEndpoint => {
    const node = diagram.nodes.find((candidate) => nodeName(candidate, '') === label);
    if (!node) throw new Error(`Proyecto de ejemplo: «${label}» no está en «${diagram.name}».`);
    return { diagramId: diagram.id, elementId: node.id, kind: 'node' };
  };
  const link = (source: TraceEndpoint, target: TraceEndpoint, kind: TraceRelation): TraceLink =>
    ({ id: createId(), source, target, relation: kind, createdAt: now.toISOString() });
  const traceLinks = [
    link(endpoint(loan, 'Buscar el libro'), endpoint(useCases, 'Buscar un libro'), 'detalla'),
    link(endpoint(database, 'Libro'), endpoint(domain, 'Libro'), 'implementa'),
    link(endpoint(database, 'Socio'), endpoint(domain, 'Socio'), 'implementa'),
  ];

  // Requisitos: qué se pidió y qué parte del modelo lo cumple. RF-04 queda
  // propuesto y sin cubrir a propósito, para que la cobertura muestre lo pendiente.
  const requirements: Requirement[] = [];
  const requirementLinks: RequirementLink[] = [];
  // Fichas completas, como se declaran en un documento de requisitos: texto
  // como obligación, categoría, criterios, versión y revisión. La regla RN-01
  // trae su fuente, una excepción y sus ejemplos Dado / Entonces.
  const require = (sheet: Partial<Requirement> & Pick<Requirement, 'code' | 'title' | 'kind' | 'priority' | 'status' | 'description'>, ...targets: (TraceEndpoint | Diagram)[]) => {
    const id = createId();
    requirements.push({ ...requirementDefaults(), version: '1.1', reviewedAt: '2026-11-10', ...sheet, id, createdAt: now.toISOString() });
    for (const target of targets) {
      requirementLinks.push({ id: createId(), requirementId: id, diagramId: 'elementId' in target ? target.diagramId : target.id, elementId: 'elementId' in target ? target.elementId : null, createdAt: now.toISOString() });
    }
  };
  require({
    code: 'RF-01', title: 'Pedir un libro prestado', kind: 'funcional', category: 'Préstamos', priority: 'alta', status: 'aprobado',
    description: 'El sistema permitirá a un socio pedir un libro prestado desde el portal, sin ir al mostrador.',
    details: [
      'El sistema deberá mostrar solo los libros con al menos un ejemplar libre como prestables.',
      'El sistema deberá registrar la fecha del préstamo y la fecha de devolución (15 días después).',
      'El sistema deberá confirmar el préstamo al socio con la fecha de devolución.',
    ],
  }, endpoint(useCases, 'Pedir un préstamo'), loan);
  require({
    code: 'RF-02', title: 'Validar la disponibilidad antes de prestar', kind: 'funcional', category: 'Préstamos', priority: 'alta', status: 'aprobado',
    description: 'El sistema deberá comprobar que haya un ejemplar libre antes de registrar un préstamo.',
    details: ['El sistema deberá apartar el ejemplar mientras se completa el préstamo.', 'Si no hay ejemplares libres, el sistema deberá ofrecer la reserva.'],
  }, endpoint(loan, 'Validar disponibilidad'), availability);
  require({
    code: 'RF-03', title: 'Reservar un libro sin ejemplares', kind: 'funcional', category: 'Préstamos', priority: 'media', status: 'aprobado',
    description: 'El sistema permitirá a un socio reservar un libro cuando no haya ejemplares libres.',
    details: ['El sistema deberá avisar al socio cuando un ejemplar reservado quede libre.', 'Una reserva sin retirar caduca a los 3 días.'],
  }, endpoint(loan, 'Reservar el libro'));
  require({
    code: 'RN-01', title: 'Disponibilidad por ejemplar', kind: 'regla de negocio', priority: 'alta', status: 'aprobado',
    description: 'Un libro solo puede prestarse si al menos uno de sus ejemplares está libre.',
    details: ['La disponibilidad se decide por ejemplar, no por título.'],
    rule: {
      type: 'restricción', source: 'Reglamento de préstamos de la biblioteca, art. 4', validFrom: '2026-01-01', validTo: '',
      exceptions: ['Los ejemplares de consulta en sala nunca se prestan, aunque estén libres.'],
      examples: [
        { given: 'un libro con 2 ejemplares prestados y 1 libre', then: 'se puede prestar el ejemplar libre' },
        { given: 'un libro con todos sus ejemplares prestados', then: 'no se puede prestar y se ofrece la reserva' },
      ],
    },
  }, endpoint(availability, '¿Hay ejemplares libres?'));
  require({
    code: 'RNF-01', title: 'Resguardo de los datos de préstamos', kind: 'no funcional', category: 'Fiabilidad', priority: 'media', status: 'aprobado',
    description: 'El sistema deberá guardar los préstamos en una base de datos gestionada con respaldo cada 24 horas.',
    details: ['La base no deberá aceptar conexiones desde internet: solo desde la API.', 'Un respaldo deberá poder restaurarse en menos de 1 hora.'],
  }, database, deployment);
  require({
    code: 'RF-04', title: 'Avisar la fecha de devolución', kind: 'funcional', category: 'Notificaciones', priority: 'baja', status: 'propuesto', version: '1.0', reviewedAt: '',
    description: 'El sistema deberá enviar al socio un recordatorio por correo un día antes del vencimiento.',
  });

  // Casos de prueba: los dos caminos del préstamo, sacados de su propio recorrido
  // (el subproceso decide cuál), con lo que debe pasar y el requisito que verifican.
  const { scenarios } = enumerateScenarios(activityWalkthrough, loan, (call) =>
    (call.diagramId === availability.id ? { diagramName: availability.name, outcomes: activityWalkthrough.outcomes!(availability) } : null));
  const requirementId = (code: string) => requirements.find((item) => item.code === code)!.id;
  const testCase = (code: string, outcome: string, sheet: Pick<TestCase, 'title' | 'given' | 'then' | 'status'>, verifies: string[]): TestCase => {
    const scenario = scenarios.find((candidate) => candidate.choices.some((choice) => 'outcome' in choice && choice.outcome === outcome));
    if (!scenario) throw new Error(`Proyecto de ejemplo: no hay camino con «${outcome}».`);
    const draft = draftTestCase(loan, scenario.choices, scenario.final);
    return { ...draft, ...sheet, id: createId(), code, diagramId: loan.id, choices: scenario.choices, requirementIds: verifies.map(requirementId), createdAt: now.toISOString() };
  };
  const testCases = [
    testCase('CP-01', 'disponible', {
      title: 'Préstamo de un libro con ejemplar libre', status: 'pasa',
      given: 'El socio inició sesión y el libro tiene al menos un ejemplar libre.',
      then: 'El préstamo queda registrado con su fecha de devolución y el bibliotecario entrega el libro.',
    }, ['RF-01', 'RF-02']),
    testCase('CP-02', 'no disponible', {
      title: 'Libro sin ejemplares libres: se ofrece la reserva', status: 'pendiente',
      given: 'El socio inició sesión y todos los ejemplares del libro están prestados.',
      then: 'No se registra el préstamo: el sistema informa que no hay ejemplares y el socio puede reservar el libro.',
    }, ['RF-03', 'RN-01']),
  ];

  return {
    project: { name: SAMPLE_PROJECT_NAME, diagramIds: diagrams.map((diagram) => diagram.id), traceLinks, folders, folderOf, diagramRelations, requirements, requirementLinks, testCases, document: SAMPLE_DOCUMENT },
    diagrams,
  };
}
