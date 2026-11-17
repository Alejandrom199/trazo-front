import {
  createDiagramFromTemplate,
  nodeName,
  withLinkedDiagram,
  type Diagram,
  type DiagramProject,
  type Requirement,
  type RequirementKind,
  type RequirementLink,
  type DiagramRelation,
  type Template,
  type TraceEndpoint,
  type TraceLink,
  type TraceRelation,
} from '@/core/model';
import { ActivityArtifact as A } from './activity/artifactTypes';
import { createTemplateBuilder } from './activity/templates/templateBuilder';
import { classTemplates } from './class/templates';
import { componentTemplates } from './component/templates';
import { deploymentTemplates } from './deployment/templates';
import { erTemplates } from './er/templates';
import { sequenceTemplates } from './sequence/templates';
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
  const ok = t.node(A.activityFinal, '', { x: 260, y: 380 });
  const blocked = t.node(A.action, 'Informar que no hay ejemplares', { x: 540, y: 210 });
  const none = t.node(A.activityFinal, '', { x: 540, y: 300 });
  t.flow(start, query);
  t.flow(query, copies);
  t.flow(copies, hold, 'sí');
  t.flow(copies, blocked, 'no');
  t.flow(hold, ok);
  t.flow(blocked, none);
  return t.build({ id: 'sample.availability', name: 'Validar disponibilidad', description: 'Detalle del subproceso: se consulta el catálogo y se aparta un ejemplar si lo hay.', difficulty: 'básico', learningGoals: [] });
}

const fromCatalog = (templates: Template[], id: string): Template => {
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

  const useCases = make(fromCatalog(useCaseTemplates, 'usecase.library'), 'Casos de uso');
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
  const require = (code: string, title: string, kind: RequirementKind, priority: Requirement['priority'], status: Requirement['status'], description: string, ...targets: (TraceEndpoint | Diagram)[]) => {
    const id = createId();
    requirements.push({ id, code, title, description, kind, priority, status, createdAt: now.toISOString() });
    for (const target of targets) {
      requirementLinks.push({ id: createId(), requirementId: id, diagramId: 'elementId' in target ? target.diagramId : target.id, elementId: 'elementId' in target ? target.elementId : null, createdAt: now.toISOString() });
    }
  };
  require('RF-01', 'Pedir un libro prestado', 'funcional', 'alta', 'aprobado', 'El socio pide un libro desde el portal sin ir al mostrador.', endpoint(useCases, 'Pedir un préstamo'), loan);
  require('RF-02', 'Validar la disponibilidad antes de prestar', 'funcional', 'alta', 'aprobado', 'Antes de registrar el préstamo se comprueba que haya un ejemplar libre.', endpoint(loan, 'Validar disponibilidad'), availability);
  require('RF-03', 'Reservar un libro sin ejemplares', 'funcional', 'media', 'aprobado', 'Si no hay ejemplares, el socio puede dejar el libro reservado.', endpoint(loan, 'Reservar el libro'));
  require('RN-01', 'No se presta un libro sin ejemplares libres', 'regla de negocio', 'alta', 'aprobado', 'La disponibilidad se decide por ejemplar, no por título.', endpoint(availability, '¿Hay ejemplares libres?'));
  require('RNF-01', 'Los préstamos se guardan en una base gestionada', 'no funcional', 'media', 'aprobado', 'Base de datos relacional con respaldo diario, no expuesta a internet.', database, deployment);
  require('RF-04', 'Avisar por correo la fecha de devolución', 'funcional', 'baja', 'propuesto', 'Un día antes del vencimiento, el socio recibe un recordatorio.');

  return {
    project: { name: SAMPLE_PROJECT_NAME, diagramIds: diagrams.map((diagram) => diagram.id), traceLinks, folders, folderOf, diagramRelations, requirements, requirementLinks },
    diagrams,
  };
}
