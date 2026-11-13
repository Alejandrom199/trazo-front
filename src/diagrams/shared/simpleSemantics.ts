import type { ConnectionResult, Diagram, DiagramNode, DiagramType, Narration, Template, ValidationIssue, ValidationRule } from '@/core/model';
import type { LearningWorkshop } from '@/core/registry';
import type { SimpleModuleSemantics } from './simpleModule';

type Check = (diagram: Diagram) => ValidationIssue[];

const rule = (diagramType: DiagramType, id: string, severity: ValidationIssue['severity'], title: string, explanation: string, check: Check): ValidationRule => ({
  id: `${diagramType}.${id}`, diagramType, severity, title, explanation, check,
});
const issue = (ruleId: string, severity: ValidationIssue['severity'], message: string, suggestion: string, nodeIds: string[] = [], edgeIds: string[] = []): ValidationIssue => ({
  ruleId, severity, message, suggestion, nodeIds, edgeIds,
});
const node = (diagram: Diagram, id: string) => diagram.nodes.find((item) => item.id === id);
const label = (item: DiagramNode | undefined) => item?.label.trim() || 'Sin nombre';
const prop = (item: DiagramNode | undefined, key: string) => {
  const value = item?.props[key];
  return typeof value === 'string' ? value.trim() : '';
};
const ofType = (diagram: Diagram, type: string) => diagram.nodes.filter((item) => item.artifactType === type);
const connected = (diagram: Diagram, id: string) => diagram.edges.some((edge) => edge.sourceId === id || edge.targetId === id);

function connection(
  diagram: Diagram,
  sourceId: string,
  targetId: string,
  edgeType: string,
  allowed: (source: DiagramNode, target: DiagramNode) => boolean,
  reason: string,
): ConnectionResult {
  const source = node(diagram, sourceId);
  const target = node(diagram, targetId);
  if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
  if (sourceId === targetId) return { allowed: false, reason: 'Un elemento no puede conectarse consigo mismo.' };
  if (!allowed(source, target)) return { allowed: false, reason };
  if (diagram.edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId && edge.artifactType === edgeType)) {
    return { allowed: false, reason: 'Esa relación ya existe.' };
  }
  return { allowed: true, edgeType };
}

function messageNumber(text: string): number {
  const match = text.match(/^(\d+(?:\.\d+)*)/);
  return match
    ? Number(match[1]!.split('.').map((part, index) => Number(part) / 10 ** (index * 3)).reduce((sum, part) => sum + part, 0))
    : Number.POSITIVE_INFINITY;
}

function countRule(diagram: Diagram, type: string, expected: number, ruleId: string, noun: string): ValidationIssue[] {
  const found = ofType(diagram, type);
  return found.length === expected
    ? []
    : [issue(ruleId, 'error', `El diagrama tiene ${found.length} nodos de ${noun}; debe tener ${expected}.`, `Deja exactamente ${expected} ${noun}.`, found.map((item) => item.id))];
}

function workshopFrom(
  levels: LearningWorkshop['levels'],
  correction: LearningWorkshop['correctionChallenges'],
  briefs: LearningWorkshop['briefExercises'],
  comparisons: LearningWorkshop['comparisons'],
): LearningWorkshop {
  return { levels, correctionChallenges: correction, briefExercises: briefs, comparisons };
}

function cloneTemplate(template: Template, id: string, name: string, description: string, mutate: (diagram: Diagram) => Diagram): Template {
  return {
    ...template,
    id,
    name,
    description,
    diagram: { ...mutate(template.diagram), id, name, description, templateId: id },
  };
}

function stripEdgeLabels(diagram: Diagram, type: string): Diagram {
  return { ...diagram, edges: diagram.edges.map((edge) => (edge.artifactType === type ? { ...edge, label: '' } : edge)) };
}

function moveOutside(diagram: Diagram, type: string): Diagram {
  return {
    ...diagram,
    nodes: diagram.nodes.map((item) => (item.artifactType === type ? { ...item, parentId: null } : item)),
  };
}

/* -------------------------------------------------------------------------- */
/* Objetos                                                                    */
/* -------------------------------------------------------------------------- */

export const objectSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    if (source.artifactType === 'valueSpecification' && target.artifactType === 'valueSpecification') {
      return { allowed: false, reason: 'Dos valores no forman un enlace UML; un valor describe un objeto.' };
    }
    if (source.artifactType === 'valueSpecification' || target.artifactType === 'valueSpecification') {
      const objectEnd = source.artifactType === 'objectInstance' ? source : target;
      const valueEnd = source.artifactType === 'valueSpecification' ? source : target;
      if (objectEnd.artifactType !== 'objectInstance') {
        return { allowed: false, reason: 'Un valor solo puede enlazarse con una instancia.' };
      }
      if (diagram.edges.some((edge) => edge.artifactType === 'objectLink' && (edge.sourceId === valueEnd.id || edge.targetId === valueEnd.id))) {
        return { allowed: false, reason: 'Ese valor ya pertenece a una instancia.' };
      }
    }
    return connection(diagram, sourceId, targetId, 'objectLink', () => true, '');
  },
  rules: [
    rule('object', 'instance-notation', 'warning', 'Notación de instancia', 'Una instancia se escribe como nombre: Clase y se subraya.', (diagram) =>
      ofType(diagram, 'objectInstance')
        .filter((item) => !item.label.includes(':') && !prop(item, 'classifier'))
        .map((item) => issue('object.instance-notation', 'warning', `«${label(item)}» no indica su clasificador.`, 'Usa instancia: Clase o completa la propiedad Clasificador.', [item.id])),
    ),
    rule('object', 'value-notation', 'warning', 'Valor sin asignación', 'Un slot muestra una propiedad y su valor concreto.', (diagram) =>
      ofType(diagram, 'valueSpecification')
        .filter((item) => !(item.label.includes('=') || (prop(item, 'slotName') && prop(item, 'slotValue'))))
        .map((item) => issue('object.value-notation', 'warning', `«${label(item)}» no parece una asignación.`, 'Escribe atributo = valor o completa Nombre del slot y Valor.', [item.id])),
    ),
    rule('object', 'orphan-value', 'error', 'Valor sin objeto', 'Un valor aislado no dice a qué instancia pertenece.', (diagram) =>
      ofType(diagram, 'valueSpecification')
        .filter((item) => !connected(diagram, item.id))
        .map((item) => issue('object.orphan-value', 'error', `El valor «${label(item)}» no pertenece a ningún objeto.`, 'Conéctalo con la instancia que describe.', [item.id])),
    ),
    rule('object', 'value-degree', 'error', 'Valor compartido', 'Un slot pertenece a una sola instancia.', (diagram) =>
      ofType(diagram, 'valueSpecification')
        .filter((item) => diagram.edges.filter((edge) => edge.sourceId === item.id || edge.targetId === item.id).length > 1)
        .map((item) => issue('object.value-degree', 'error', `«${label(item)}» está enlazado a más de un objeto.`, 'Deja un solo enlace entre el valor y su instancia.', [item.id])),
    ),
    rule('object', 'no-instances', 'warning', 'Fotografía vacía', 'Sin instancias no hay fotografía del sistema.', (diagram) =>
      diagram.nodes.length === 0 || ofType(diagram, 'objectInstance').length > 0
        ? []
        : [issue('object.no-instances', 'warning', 'Solo hay valores; falta al menos una instancia.', 'Agrega un objeto con la forma nombre: Clase.')],
    ),
  ],
  narrate: (diagram) => {
    const instances = ofType(diagram, 'objectInstance');
    const values = ofType(diagram, 'valueSpecification');
    if (instances.length + values.length === 0) return [];
    const byId = new Map(diagram.nodes.map((item) => [item.id, item]));
    const lines: Narration = [{
      text: `La fotografía muestra ${instances.length} instancia${instances.length === 1 ? '' : 's'} y ${values.length} valor${values.length === 1 ? '' : 'es'} concretos.`,
      kind: 'participants',
      depth: 0,
      nodeIds: instances.map((item) => item.id),
      edgeIds: [],
    }];
    for (const instance of instances) {
      const classifier = prop(instance, 'classifier');
      lines.push({
        text: classifier ? `«${label(instance)}» es una instancia de ${classifier}.` : `Aparece la instancia «${label(instance)}».`,
        kind: 'step',
        depth: 0,
        nodeIds: [instance.id],
        edgeIds: [],
      });
      for (const edge of diagram.edges.filter((item) => item.sourceId === instance.id || item.targetId === instance.id)) {
        const otherId = edge.sourceId === instance.id ? edge.targetId : edge.sourceId;
        const other = byId.get(otherId);
        if (other?.artifactType === 'valueSpecification') {
          lines.push({
            text: `En «${label(instance)}», ${label(other)}.`,
            kind: 'branch',
            depth: 1,
            nodeIds: [instance.id, other.id],
            edgeIds: [edge.id],
          });
        } else if (other) {
          lines.push({
            text: `«${label(instance)}» ${edge.label ? `—${edge.label}→` : 'se enlaza con'} «${label(other)}».`,
            kind: 'step',
            depth: 0,
            nodeIds: [instance.id, other.id],
            edgeIds: [edge.id],
          });
        }
      }
    }
    return lines;
  },
  workshop: (templates) => {
    const base = templates[0]!;
    const broken = cloneTemplate(base, 'object.challenge.values', 'Reto: valores sueltos', 'Hay valores sin dueño y una instancia sin clasificador.', (diagram) => ({
      ...diagram,
      nodes: diagram.nodes.map((item) => (item.artifactType === 'objectInstance' ? { ...item, label: item.label.split(':')[0] ?? item.label } : item)),
      edges: diagram.edges.filter((edge) => {
        const source = node(diagram, edge.sourceId);
        const target = node(diagram, edge.targetId);
        return !(source?.artifactType === 'valueSpecification' || target?.artifactType === 'valueSpecification');
      }),
    }));
    return workshopFrom(
      [
        { name: 'básico', description: 'Reconoce instancias, valores y enlaces.' },
        { name: 'intermedio', description: 'Detecta slots huérfanos y notación incompleta.' },
        { name: 'avanzado', description: 'Defiende qué pertenece a la fotografía y qué al modelo de clases.' },
      ],
      [{
        id: 'object-orphan-slots',
        title: 'Una fotografía a medias',
        context: 'Alguien copió un diagrama de clases y lo rellenó con datos, pero dejó valores sin dueño.',
        diagram: broken,
        expectedProblems: 5,
        question: {
          id: 'object-fix',
          prompt: '¿Qué corrección recupera primero el sentido de una fotografía UML?',
          options: [
            { id: 'link-values', label: 'Enlazar cada valor con la instancia que describe', explanation: 'Correcto: un slot solo tiene sentido como estado de una instancia.', correct: true },
            { id: 'timeline', label: 'Ordenar los objetos de arriba a abajo como una secuencia', explanation: 'Eso pertenece a un diagrama de secuencia, no a una fotografía de instancias.', correct: false },
            { id: 'delete-objects', label: 'Borrar las instancias y dejar solo los valores', explanation: 'Sin instancias no hay fotografía del sistema.', correct: false },
          ],
        },
      }],
      [{
        id: 'object-brief',
        title: 'Instantánea de un carrito',
        brief: 'Quieres enseñar que Ana tiene un carrito con dos teclados y que el carrito está abierto.',
        questions: [{
          id: 'object-brief-q',
          prompt: '¿Qué elementos deben aparecer?',
          options: [
            { id: 'instances', label: 'Instancias ana: Cliente, carrito9: Carrito, teclado: Producto y el valor cantidad = 2', explanation: 'Correcto: personas, objetos y datos observables en un instante.', correct: true },
            { id: 'classes', label: 'Solo las clases Cliente, Carrito y Producto', explanation: 'Eso es el molde, no la fotografía.', correct: false },
            { id: 'messages', label: 'Mensajes addItem() entre Ana y el carrito', explanation: 'Los mensajes pertenecen a un diagrama de interacción.', correct: false },
          ],
        }],
      }],
      [{
        id: 'object-compare',
        title: 'Molde o fotografía',
        context: 'Un equipo duda si su diagrama explica el tipo o un caso concreto.',
        options: [
          { id: 'photo', label: 'ana: Estudiante — prestamo42: Préstamo, con estado = Activo', explanation: 'Correcto: identidad y valores concretos.', correct: true },
          { id: 'mold', label: 'Estudiante 1 — Préstamo 0..* con atributos tipados', explanation: 'Eso describe el molde de clases, no una fotografía.', correct: false },
        ],
      }],
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Perfiles                                                                   */
/* -------------------------------------------------------------------------- */

export const profileSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    if (source.artifactType === 'stereotype' && target.artifactType === 'metaclass') {
      return connection(diagram, sourceId, targetId, 'extension', () => true, '');
    }
    if (source.artifactType === 'metaclass' && target.artifactType === 'stereotype') {
      return { allowed: false, reason: 'La extensión UML va del estereotipo hacia la metaclase, no al revés.' };
    }
    if (source.artifactType === 'profile' || target.artifactType === 'profile') {
      return { allowed: false, reason: 'El perfil contiene elementos; no se conecta como un extremo de relación.' };
    }
    if ((source.artifactType === 'stereotype' || source.artifactType === 'metaclass') && (target.artifactType === 'stereotype' || target.artifactType === 'metaclass')) {
      return connection(diagram, sourceId, targetId, 'profileReference', () => true, '');
    }
    return { allowed: false, reason: 'En un perfil solo se relacionan estereotipos y metaclases.' };
  },
  rules: [
    rule('profile', 'stereotype-outside', 'warning', 'Estereotipo fuera del perfil', 'Los estereotipos pertenecen al paquete que define el perfil.', (diagram) =>
      ofType(diagram, 'stereotype')
        .filter((item) => node(diagram, item.parentId ?? '')?.artifactType !== 'profile')
        .map((item) => issue('profile.stereotype-outside', 'warning', `«${label(item)}» está fuera de un perfil.`, 'Colócalo dentro del paquete «profile».', [item.id])),
    ),
    rule('profile', 'extension-direction', 'error', 'Extensión inválida', 'La extensión UML va del estereotipo hacia la metaclase.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'extension' && (node(diagram, edge.sourceId)?.artifactType !== 'stereotype' || node(diagram, edge.targetId)?.artifactType !== 'metaclass'))
        .map((edge) => issue('profile.extension-direction', 'error', 'Una extensión no une un estereotipo con una metaclase.', 'Conecta estereotipo → metaclase.', [edge.sourceId, edge.targetId], [edge.id])),
    ),
    rule('profile', 'unextended-stereotype', 'warning', 'Estereotipo sin metaclase', 'Sin extensión no se sabe dónde puede aplicarse el estereotipo.', (diagram) =>
      ofType(diagram, 'stereotype')
        .filter((item) => !diagram.edges.some((edge) => edge.artifactType === 'extension' && edge.sourceId === item.id) && !prop(item, 'baseMetaclass'))
        .map((item) => issue('profile.unextended-stereotype', 'warning', `«${label(item)}» no extiende ninguna metaclase.`, 'Añade una extensión o indica la metaclase base.', [item.id])),
    ),
    rule('profile', 'empty-profile', 'info', 'Perfil vacío', 'Un perfil sin estereotipos no aporta vocabulario.', (diagram) =>
      ofType(diagram, 'profile')
        .filter((item) => !diagram.nodes.some((child) => child.parentId === item.id && child.artifactType === 'stereotype'))
        .map((item) => issue('profile.empty-profile', 'info', `El perfil «${label(item)}» no contiene estereotipos.`, 'Agrega al menos un estereotipo dentro del paquete.', [item.id])),
    ),
    rule('profile', 'metaclass-style', 'info', 'Metaclase poco reconocible', 'Las metaclases suelen usar nombres del metamodelo UML.', (diagram) =>
      ofType(diagram, 'metaclass')
        .filter((item) => !/^[A-Z][A-Za-z0-9]+$/.test(item.label.trim()))
        .map((item) => issue('profile.metaclass-style', 'info', `«${label(item)}» no parece una metaclase UML.`, 'Usa nombres como Class, Component u Operation.', [item.id])),
    ),
  ],
  narrate: (diagram) => {
    const profiles = ofType(diagram, 'profile');
    const stereotypes = ofType(diagram, 'stereotype');
    if (profiles.length + stereotypes.length === 0) return [];
    const lines: Narration = [{
      text: `El perfil define ${stereotypes.length} estereotipo${stereotypes.length === 1 ? '' : 's'} para adaptar UML.`,
      kind: 'start',
      depth: 0,
      nodeIds: [...profiles, ...stereotypes].map((item) => item.id),
      edgeIds: [],
    }];
    for (const stereotype of stereotypes) {
      const extension = diagram.edges.find((edge) => edge.artifactType === 'extension' && edge.sourceId === stereotype.id);
      const metaclass = extension ? node(diagram, extension.targetId) : undefined;
      const base = prop(stereotype, 'baseMetaclass') || (metaclass ? label(metaclass) : '');
      lines.push({
        text: base ? `«${label(stereotype)}» extiende ${base}.` : `«${label(stereotype)}» todavía no declara a qué metaclase se aplica.`,
        kind: extension ? 'step' : 'warning',
        depth: 0,
        nodeIds: extension ? [stereotype.id, extension.targetId] : [stereotype.id],
        edgeIds: extension ? [extension.id] : [],
      });
    }
    for (const edge of diagram.edges.filter((item) => item.artifactType === 'profileReference')) {
      lines.push({
        text: `«${label(node(diagram, edge.sourceId))}» se relaciona con «${label(node(diagram, edge.targetId))}»${edge.label ? ` (${edge.label})` : ''}.`,
        kind: 'branch',
        depth: 0,
        nodeIds: [edge.sourceId, edge.targetId],
        edgeIds: [edge.id],
      });
    }
    return lines;
  },
  workshop: (templates) => {
    const broken = cloneTemplate(templates[0]!, 'profile.challenge.direction', 'Reto: extensión al revés', 'La flecha de extensión apunta en el sentido incorrecto.', (diagram) => ({
      ...moveOutside(diagram, 'stereotype'),
      edges: diagram.edges.map((edge) => (edge.artifactType === 'extension' ? { ...edge, sourceId: edge.targetId, targetId: edge.sourceId } : edge)),
    }));
    return workshopFrom(
      [
        { name: 'básico', description: 'Reconoce perfil, estereotipo y metaclase.' },
        { name: 'intermedio', description: 'Corrige la dirección de las extensiones.' },
        { name: 'avanzado', description: 'Decide cuándo un estereotipo aporta más que una nota.' },
      ],
      [{
        id: 'profile-extension',
        title: 'Un perfil que no se puede aplicar',
        context: 'El equipo dibujó estereotipos fuera del paquete y extendió metaclases hacia estereotipos.',
        diagram: broken,
        expectedProblems: 8,
        question: {
          id: 'profile-fix',
          prompt: '¿Cuál es la corrección UML imprescindible?',
          options: [
            { id: 'direction', label: 'Invertir la extensión para que salga del estereotipo hacia la metaclase', explanation: 'Correcto: Extension va de Stereotype a Metaclass.', correct: true },
            { id: 'rename', label: 'Renombrar el perfil como paquete de clases', explanation: 'Eso elimina la intención de adaptar UML.', correct: false },
            { id: 'messages', label: 'Numerar las extensiones como mensajes', explanation: 'Los perfiles no ordenan comportamiento.', correct: false },
          ],
        },
      }],
      [{
        id: 'profile-brief',
        title: 'Vocabulario de persistencia',
        brief: 'Quieres marcar clases como entidades y operaciones como consultas auditadas.',
        questions: [{
          id: 'profile-brief-q',
          prompt: '¿Qué metaclases debes extender?',
          options: [
            { id: 'class-op', label: 'Class para «entity» y Operation para «audited»', explanation: 'Correcto: cada estereotipo declara dónde puede aplicarse.', correct: true },
            { id: 'node', label: 'Node y Artifact', explanation: 'Eso sería un perfil de despliegue, no de persistencia.', correct: false },
            { id: 'actor', label: 'Actor y UseCase', explanation: 'Eso modela alcance, no persistencia.', correct: false },
          ],
        }],
      }],
      [{
        id: 'profile-compare',
        title: '¿Estereotipo o clase?',
        context: 'Hay que marcar componentes que exponen APIs HTTP.',
        options: [
          { id: 'stereo', label: 'Un estereotipo «endpoint» que extiende Operation o Component', explanation: 'Correcto: añade significado a UML sin inventar otra clase de dominio.', correct: true },
          { id: 'class', label: 'Una clase Endpoint con atributos url y método', explanation: 'Puede servir en el dominio, pero no adapta la notación UML de los demás diagramas.', correct: false },
        ],
      }],
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Estructura compuesta                                                       */
/* -------------------------------------------------------------------------- */

export const compositeSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    if (source.artifactType === 'structuredClassifier' || target.artifactType === 'structuredClassifier') {
      return { allowed: false, reason: 'El clasificador es el marco; las conexiones van entre partes y puertos.' };
    }
    if (source.artifactType === 'port' && target.artifactType === 'part') {
      return connection(diagram, sourceId, targetId, 'delegationConnector', () => true, '');
    }
    if (source.artifactType === 'part' && target.artifactType === 'port') {
      return { allowed: false, reason: 'La delegación entra por el puerto y llega a la parte, no al revés.' };
    }
    if (['part', 'port'].includes(source.artifactType) && ['part', 'port'].includes(target.artifactType)) {
      return connection(diagram, sourceId, targetId, 'connector', () => true, '');
    }
    return { allowed: false, reason: 'Los conectores internos solo unen partes y puertos.' };
  },
  rules: [
    rule('composite', 'outside-classifier', 'warning', 'Elemento fuera del clasificador', 'Las partes y puertos describen el interior de un clasificador estructurado.', (diagram) =>
      diagram.nodes
        .filter((item) => ['part', 'port'].includes(item.artifactType) && node(diagram, item.parentId ?? '')?.artifactType !== 'structuredClassifier')
        .map((item) => issue('composite.outside-classifier', 'warning', `«${label(item)}» está fuera del clasificador.`, 'Colócalo dentro del marco que está describiendo.', [item.id])),
    ),
    rule('composite', 'delegation-shape', 'error', 'Delegación inválida', 'Una delegación lleva la interacción desde un puerto hacia una parte interna.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'delegationConnector' && (node(diagram, edge.sourceId)?.artifactType !== 'port' || node(diagram, edge.targetId)?.artifactType !== 'part'))
        .map((edge) => issue('composite.delegation-shape', 'error', 'La delegación no va de un puerto a una parte.', 'Conecta puerto → parte.', [edge.sourceId, edge.targetId], [edge.id])),
    ),
    rule('composite', 'unused-port', 'warning', 'Puerto sin delegación', 'Un puerto debe conducir la interacción hacia la estructura interna.', (diagram) =>
      ofType(diagram, 'port')
        .filter((item) => !diagram.edges.some((edge) => edge.artifactType === 'delegationConnector' && edge.sourceId === item.id))
        .map((item) => issue('composite.unused-port', 'warning', `El puerto «${label(item)}» no delega en ninguna parte.`, 'Conéctalo con la parte que atiende la interacción.', [item.id])),
    ),
    rule('composite', 'part-type', 'warning', 'Parte sin tipo', 'Una parte declara un rol tipado dentro del clasificador.', (diagram) =>
      ofType(diagram, 'part')
        .filter((item) => !item.label.includes(':') && !prop(item, 'partType'))
        .map((item) => issue('composite.part-type', 'warning', `«${label(item)}» no declara su tipo.`, 'Usa rol: Tipo o completa la propiedad Tipo.', [item.id])),
    ),
    rule('composite', 'lonely-part', 'info', 'Parte desconectada', 'Una parte sin conectores puede estar incompleta.', (diagram) =>
      ofType(diagram, 'part')
        .filter((item) => !connected(diagram, item.id))
        .map((item) => issue('composite.lonely-part', 'info', `La parte «${label(item)}» no colabora con nadie.`, 'Conéctala a otra parte o recibe una delegación.', [item.id])),
    ),
  ],
  narrate: (diagram) => {
    const classifiers = ofType(diagram, 'structuredClassifier');
    const parts = ofType(diagram, 'part');
    const ports = ofType(diagram, 'port');
    if (classifiers.length + parts.length === 0) return [];
    const lines: Narration = [{
      text: `${classifiers[0] ? `«${label(classifiers[0])}»` : 'El clasificador'} abre su interior con ${parts.length} parte${parts.length === 1 ? '' : 's'} y ${ports.length} puerto${ports.length === 1 ? '' : 's'}.`,
      kind: 'participants',
      depth: 0,
      nodeIds: [...classifiers, ...parts, ...ports].map((item) => item.id),
      edgeIds: [],
    }];
    for (const edge of diagram.edges.filter((item) => item.artifactType === 'delegationConnector')) {
      lines.push({
        text: `El puerto «${label(node(diagram, edge.sourceId))}» delega en «${label(node(diagram, edge.targetId))}».`,
        kind: 'branch',
        depth: 0,
        nodeIds: [edge.sourceId, edge.targetId],
        edgeIds: [edge.id],
      });
    }
    for (const edge of diagram.edges.filter((item) => item.artifactType === 'connector')) {
      lines.push({
        text: `«${label(node(diagram, edge.sourceId))}» colabora con «${label(node(diagram, edge.targetId))}».`,
        kind: 'step',
        depth: 0,
        nodeIds: [edge.sourceId, edge.targetId],
        edgeIds: [edge.id],
      });
    }
    return lines;
  },
  workshop: (templates) => {
    const broken = cloneTemplate(templates[0]!, 'composite.challenge.port', 'Reto: puerto sin delegación', 'El puerto externo no llega a ninguna parte.', (diagram) => ({
      ...diagram,
      edges: diagram.edges.filter((edge) => edge.artifactType !== 'delegationConnector'),
    }));
    return workshopFrom(
      [
        { name: 'básico', description: 'Reconoce clasificador, partes y puertos.' },
        { name: 'intermedio', description: 'Explica delegaciones y conectores internos.' },
        { name: 'avanzado', description: 'Decide qué abrir y qué dejar como caja negra.' },
      ],
      [{
        id: 'composite-port',
        title: 'Una API que no entra',
        context: 'El servicio muestra partes internas, pero el puerto HTTP quedó decorativo.',
        diagram: broken,
        expectedProblems: 2,
        question: {
          id: 'composite-fix',
          prompt: '¿Qué falta para que el puerto cumpla su papel?',
          options: [
            { id: 'delegate', label: 'Una delegación desde el puerto hacia la parte que atiende la petición', explanation: 'Correcto: el puerto conduce la interacción al interior.', correct: true },
            { id: 'message', label: 'Numerar mensajes entre las partes', explanation: 'Eso sería comunicación o secuencia, no estructura interna.', correct: false },
            { id: 'outside', label: 'Sacar las partes fuera del clasificador', explanation: 'Rompería precisamente la idea de abrir la caja negra.', correct: false },
          ],
        },
      }],
      [{
        id: 'composite-brief',
        title: 'Abrir un carrito',
        brief: 'El carrito recibe peticiones por una API y calcula totales con un servicio de precios.',
        questions: [{
          id: 'composite-brief-q',
          prompt: '¿Qué estructura interna encaja?',
          options: [
            { id: 'parts', label: 'Puerto API → controlador; controlador — cálculo; cálculo — precios', explanation: 'Correcto: delegación al entrar y conectores entre colaboradores.', correct: true },
            { id: 'classes', label: 'Solo asociaciones entre clases Carrito y Precio', explanation: 'Eso no muestra el ensamblaje interno de una pieza.', correct: false },
            { id: 'states', label: 'Estados Vacío, Lleno y Pagado', explanation: 'Eso describe el ciclo de vida, no la estructura.', correct: false },
          ],
        }],
      }],
      [{
        id: 'composite-compare',
        title: 'Componente o interior',
        context: 'Hay que explicar cómo un servicio atiende HTTP.',
        options: [
          { id: 'interior', label: 'Estructura compuesta con puerto, controlador y repositorio', explanation: 'Correcto cuando importa el ensamblaje interno.', correct: true },
          { id: 'boxes', label: 'Dos cajas Component unidas por una dependencia', explanation: 'Sirve para el mapa externo, no para abrir la pieza.', correct: false },
        ],
      }],
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Comunicación                                                               */
/* -------------------------------------------------------------------------- */

export const communicationSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    const participants = new Set(['communicationParticipant', 'communicationActor']);
    if (!participants.has(source.artifactType) || !participants.has(target.artifactType)) {
      return { allowed: false, reason: 'Los mensajes solo se intercambian entre participantes o actores.' };
    }
    return connection(diagram, sourceId, targetId, 'numberedMessage', () => true, '');
  },
  rules: [
    rule('communication', 'message-number', 'error', 'Mensaje sin orden', 'El número del mensaje reemplaza al eje temporal.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'numberedMessage' && !/^\d+(?:\.\d+)*\s*:/.test(edge.label.trim()))
        .map((edge) => issue('communication.message-number', 'error', `«${edge.label || 'Mensaje'}» no empieza con un número de orden.`, 'Usa 1: mensaje() o 1.1: mensaje().', [edge.sourceId, edge.targetId], [edge.id])),
    ),
    rule('communication', 'duplicate-number', 'warning', 'Orden repetido', 'Dos mensajes con el mismo número vuelven ambigua la lectura.', (diagram) => {
      const seen = new Map<string, string>();
      const result: ValidationIssue[] = [];
      for (const edge of diagram.edges.filter((item) => item.artifactType === 'numberedMessage')) {
        const number = edge.label.match(/^(\d+(?:\.\d+)*)\s*:/)?.[1];
        if (!number) continue;
        const previous = seen.get(number);
        if (previous) result.push(issue('communication.duplicate-number', 'warning', `El número ${number} se usa más de una vez.`, 'Asigna un orden único a cada mensaje.', [], [previous, edge.id]));
        else seen.set(number, edge.id);
      }
      return result;
    }),
    rule('communication', 'actor-receives-first', 'info', 'Inicio poco claro', 'Normalmente el actor inicia la colaboración.', (diagram) => {
      const ordered = diagram.edges.filter((edge) => edge.artifactType === 'numberedMessage').sort((a, b) => messageNumber(a.label) - messageNumber(b.label));
      const first = ordered[0];
      return first && node(diagram, first.sourceId)?.artifactType !== 'communicationActor'
        ? [issue('communication.actor-receives-first', 'info', 'El primer mensaje no parte de un actor.', 'Comprueba quién inicia realmente el escenario.', [first.sourceId], [first.id])]
        : [];
    }),
    rule('communication', 'no-messages', 'warning', 'Red sin conversación', 'Una colaboración sin mensajes no cuenta el escenario.', (diagram) =>
      diagram.nodes.length > 0 && diagram.edges.every((edge) => edge.artifactType !== 'numberedMessage')
        ? [issue('communication.no-messages', 'warning', 'Hay participantes, pero ningún mensaje numerado.', 'Agrega mensajes con orden 1:, 2:, 3:…')]
        : [],
    ),
    rule('communication', 'self-message', 'info', 'Mensaje reflexivo', 'Un mensaje a sí mismo suele modelarse con cuidado.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'numberedMessage' && edge.sourceId === edge.targetId)
        .map((edge) => issue('communication.self-message', 'info', 'Hay un mensaje de un participante hacia sí mismo.', 'Confirma que representa una operación interna y no un error de enlace.', [edge.sourceId], [edge.id])),
    ),
  ],
  narrate: (diagram) => {
    const messages = [...diagram.edges].filter((edge) => edge.artifactType === 'numberedMessage').sort((a, b) => messageNumber(a.label) - messageNumber(b.label));
    const participants = diagram.nodes.filter((item) => item.artifactType === 'communicationParticipant' || item.artifactType === 'communicationActor');
    if (participants.length === 0) return [];
    const lines: Narration = [{
      text: `La colaboración reúne ${participants.length} participantes y ${messages.length} mensajes numerados.`,
      kind: 'participants',
      depth: 0,
      nodeIds: participants.map((item) => item.id),
      edgeIds: [],
    }];
    for (const edge of messages) {
      const depth = (edge.label.match(/\./g) ?? []).length;
      lines.push({
        text: `${edge.label || 'Mensaje'}: «${label(node(diagram, edge.sourceId))}» → «${label(node(diagram, edge.targetId))}».`,
        kind: 'step',
        depth,
        nodeIds: [edge.sourceId, edge.targetId],
        edgeIds: [edge.id],
      });
    }
    return lines;
  },
  workshop: (templates) => {
    const broken = cloneTemplate(templates[0]!, 'communication.challenge.numbers', 'Reto: mensajes sin orden', 'La red existe, pero los mensajes perdieron su numeración.', (diagram) => stripEdgeLabels(diagram, 'numberedMessage'));
    return workshopFrom(
      [
        { name: 'básico', description: 'Lee la red y la numeración de mensajes.' },
        { name: 'intermedio', description: 'Detecta órdenes repetidos o ausentes.' },
        { name: 'avanzado', description: 'Elige cuándo preferir comunicación frente a secuencia.' },
      ],
      [{
        id: 'communication-numbers',
        title: 'Una red mudada',
        context: 'Al pasar de secuencia a comunicación se perdieron los números.',
        diagram: broken,
        expectedProblems: 4,
        question: {
          id: 'communication-fix',
          prompt: '¿Qué restaura el orden del escenario?',
          options: [
            { id: 'numbers', label: 'Numerar cada mensaje como 1:, 2:, 3: o 1.1:', explanation: 'Correcto: en comunicación el número reemplaza al eje temporal.', correct: true },
            { id: 'stack', label: 'Apilar los participantes de arriba a abajo', explanation: 'La posición no define el orden en este diagrama.', correct: false },
            { id: 'colors', label: 'Colorear las flechas según el emisor', explanation: 'El color no sustituye la numeración UML.', correct: false },
          ],
        },
      }],
      [{
        id: 'communication-brief',
        title: 'Quién habla con quién',
        brief: 'Un estudiante pide un préstamo; el portal consulta el catálogo y crea el préstamo.',
        questions: [{
          id: 'communication-brief-q',
          prompt: '¿Qué vista destaca mejor el acoplamiento?',
          options: [
            { id: 'network', label: 'Una red con Estudiante, Portal, Catálogo y Servicio, y mensajes 1..4', explanation: 'Correcto: se ve la estructura de colaboración.', correct: true },
            { id: 'states', label: 'Los estados Solicitado y Activo del préstamo', explanation: 'Eso explica el ciclo de vida, no la red.', correct: false },
            { id: 'packages', label: 'Paquetes Portal y Dominio con dependencias', explanation: 'Eso es arquitectura a gran escala.', correct: false },
          ],
        }],
      }],
      [{
        id: 'communication-compare',
        title: 'Secuencia o comunicación',
        context: 'El equipo quiere ver qué servicios quedan más acoplados.',
        options: [
          { id: 'comm', label: 'Diagrama de comunicación con la red y mensajes numerados', explanation: 'Correcto: enfatiza la topología de la colaboración.', correct: true },
          { id: 'seq', label: 'Solo una secuencia larga con muchos fragmentos', explanation: 'La secuencia prioriza el tiempo, no el acoplamiento estructural.', correct: false },
        ],
      }],
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Interacción general                                                        */
/* -------------------------------------------------------------------------- */

export const interactionOverviewSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    if (source.artifactType === 'interactionOverviewFrame' || target.artifactType === 'interactionOverviewFrame') {
      return { allowed: false, reason: 'El marco contiene el recorrido; no es un extremo del flujo.' };
    }
    if (source.artifactType === 'interactionEnd') return { allowed: false, reason: 'Nada sale del fin del recorrido.' };
    if (target.artifactType === 'interactionStart') return { allowed: false, reason: 'Nada puede entrar al inicio.' };
    return connection(diagram, sourceId, targetId, 'interactionFlow', () => true, '');
  },
  rules: [
    rule('interactionOverview', 'start-count', 'error', 'Inicio único', 'Un recorrido necesita un punto de entrada inequívoco.', (diagram) => countRule(diagram, 'interactionStart', 1, 'interactionOverview.start-count', 'inicio')),
    rule('interactionOverview', 'end-missing', 'warning', 'Fin ausente', 'Un fin hace explícito cuándo termina el recorrido.', (diagram) =>
      diagram.nodes.some((item) => item.artifactType === 'interactionEnd') || diagram.nodes.length === 0
        ? []
        : [issue('interactionOverview.end-missing', 'warning', 'El recorrido no tiene un fin.', 'Añade un nodo final y conecta las rutas que terminan.')],
    ),
    rule('interactionOverview', 'decision-branches', 'error', 'Decisión sin alternativas', 'Una decisión debe separar al menos dos caminos.', (diagram) =>
      ofType(diagram, 'interactionDecision')
        .filter((item) => diagram.edges.filter((edge) => edge.sourceId === item.id).length < 2)
        .map((item) => issue('interactionOverview.decision-branches', 'error', `«${label(item)}» no tiene dos salidas.`, 'Añade y nombra las rutas alternativas.', [item.id])),
    ),
    rule('interactionOverview', 'unguarded-decision', 'warning', 'Salidas sin guarda', 'Las salidas de una decisión se distinguen con etiquetas.', (diagram) =>
      ofType(diagram, 'interactionDecision')
        .filter((item) => {
          const outs = diagram.edges.filter((edge) => edge.sourceId === item.id);
          return outs.length >= 2 && outs.some((edge) => !edge.label.trim());
        })
        .map((item) => issue('interactionOverview.unguarded-decision', 'warning', `Las salidas de «${label(item)}» no están etiquetadas.`, 'Nombra cada camino, por ejemplo sí / no.', [item.id])),
    ),
    rule('interactionOverview', 'outside-frame', 'warning', 'Paso fuera del marco', 'El marco delimita la interacción general.', (diagram) =>
      diagram.nodes
        .filter((item) => item.artifactType !== 'interactionOverviewFrame' && node(diagram, item.parentId ?? '')?.artifactType !== 'interactionOverviewFrame')
        .map((item) => issue('interactionOverview.outside-frame', 'warning', `«${label(item)}» está fuera del marco.`, 'Colócalo dentro de la interacción general.', [item.id])),
    ),
    rule('interactionOverview', 'ref-name', 'info', 'Referencia poco clara', 'Un uso de interacción debería nombrar el escenario reutilizado.', (diagram) =>
      ofType(diagram, 'interactionUse')
        .filter((item) => !prop(item, 'refName') && item.label.trim().length < 3)
        .map((item) => issue('interactionOverview.ref-name', 'info', `La referencia «${label(item)}» no identifica bien la interacción.`, 'Completa el nombre o la propiedad Interacción referida.', [item.id])),
    ),
  ],
  narrate: (diagram) => {
    const start = ofType(diagram, 'interactionStart')[0];
    if (!start) {
      return diagram.nodes.length
        ? [{ text: 'No hay un inicio desde el que recorrer la interacción.', kind: 'warning', depth: 0, nodeIds: [], edgeIds: [] }]
        : [];
    }
    const byId = new Map(diagram.nodes.map((item) => [item.id, item]));
    const result: Narration = [{ text: 'El mapa de interacciones comienza.', kind: 'start', depth: 0, nodeIds: [start.id], edgeIds: [] }];
    const visited = new Set<string>();
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const edge of diagram.edges.filter((item) => item.sourceId === id)) {
        const target = byId.get(edge.targetId);
        if (!target) continue;
        const ref = prop(target, 'refName');
        const text = target.artifactType === 'interactionUse'
          ? `${edge.label ? `[${edge.label}] ` : ''}ref ${ref || label(target)}`
          : `${edge.label ? `[${edge.label}] ` : ''}${label(target)}`;
        result.push({
          text,
          kind: target.artifactType === 'interactionDecision' ? 'decision' : target.artifactType === 'interactionEnd' ? 'end' : 'step',
          depth: 0,
          nodeIds: [id, target.id],
          edgeIds: [edge.id],
        });
        queue.push(target.id);
      }
    }
    return result;
  },
  workshop: (templates) => {
    const broken = cloneTemplate(templates[0]!, 'interaction-overview.challenge.decision', 'Reto: decisión ciega', 'Una decisión tiene una sola salida sin etiqueta.', (diagram) => ({
      ...diagram,
      edges: diagram.edges.filter((edge) => edge.label !== 'no').map((edge) => (edge.label === 'sí' ? { ...edge, label: '' } : edge)),
    }));
    return workshopFrom(
      [
        { name: 'básico', description: 'Sigue un mapa de interacciones con ref.' },
        { name: 'intermedio', description: 'Corrige decisiones y marcos incompletos.' },
        { name: 'avanzado', description: 'Diseña recorridos que reutilizan secuencias.' },
      ],
      [{
        id: 'overview-decision',
        title: 'Un préstamo sin alternativa',
        context: 'El recorrido decide disponibilidad, pero solo dejó un camino.',
        diagram: broken,
        expectedProblems: 1,
        question: {
          id: 'overview-fix',
          prompt: '¿Qué hace legible la decisión?',
          options: [
            { id: 'branches', label: 'Dos salidas etiquetadas, por ejemplo sí y no, hacia interacciones distintas', explanation: 'Correcto: una decisión UML separa alternativas nombradas.', correct: true },
            { id: 'stack', label: 'Convertir la decisión en un mensaje numerado', explanation: 'Eso cambia de tipo de diagrama.', correct: false },
            { id: 'delete', label: 'Eliminar el marco para simplificar', explanation: 'El marco delimita la interacción general.', correct: false },
          ],
        },
      }],
      [{
        id: 'overview-brief',
        title: 'Checkout con inventario',
        brief: 'Calcular total, reservar stock y, según haya existencia, pagar o avisar.',
        questions: [{
          id: 'overview-brief-q',
          prompt: '¿Cómo lo modelas?',
          options: [
            { id: 'refs', label: 'Usos de interacción para cada escenario y una decisión ¿Hay stock?', explanation: 'Correcto: el mapa reutiliza interacciones detalladas.', correct: true },
            { id: 'one-seq', label: 'Una sola secuencia con todos los mensajes mezclados', explanation: 'Pierde la reutilización que ofrece este diagrama.', correct: false },
            { id: 'classes', label: 'Clases Carrito, Stock y Pago', explanation: 'Eso no cuenta el recorrido entre escenarios.', correct: false },
          ],
        }],
      }],
      [{
        id: 'overview-compare',
        title: '¿Qué representa un ref?',
        context: 'Aparece un bloque redondeado rotulado ref.',
        options: [
          { id: 'interaction', label: 'Una interacción detallada y reutilizable', explanation: 'Correcto.', correct: true },
          { id: 'component', label: 'Un componente físico desplegado', explanation: 'Eso pertenece al despliegue.', correct: false },
        ],
      }],
    );
  },
};

/* -------------------------------------------------------------------------- */
/* Tiempos                                                                    */
/* -------------------------------------------------------------------------- */

export const timingSemantics: SimpleModuleSemantics = {
  resolveConnection: (diagram, sourceId, targetId) => {
    const source = node(diagram, sourceId);
    const target = node(diagram, targetId);
    if (!source || !target) return { allowed: false, reason: 'Uno de los extremos ya no existe.' };
    if (source.artifactType === 'timingLifeline' || target.artifactType === 'timingLifeline') {
      return { allowed: false, reason: 'La línea temporal contiene estados; los eventos unen invariantes de estado.' };
    }
    if (source.artifactType === 'stateInvariant' && target.artifactType === 'stateInvariant') {
      return connection(diagram, sourceId, targetId, 'timeEvent', () => true, '');
    }
    return { allowed: false, reason: 'Los eventos temporales conectan invariantes de estado.' };
  },
  rules: [
    rule('timing', 'state-outside-lifeline', 'warning', 'Estado fuera de la línea temporal', 'Cada estado observado pertenece a una línea de vida.', (diagram) =>
      ofType(diagram, 'stateInvariant')
        .filter((item) => node(diagram, item.parentId ?? '')?.artifactType !== 'timingLifeline')
        .map((item) => issue('timing.state-outside-lifeline', 'warning', `«${label(item)}» no pertenece a una línea temporal.`, 'Colócalo dentro del carril del participante.', [item.id])),
    ),
    rule('timing', 'duration-label', 'warning', 'Duración imprecisa', 'Una restricción temporal debe declarar una magnitud o un límite.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'durationConstraint' && !/(\d|ms|s\b|min|hora|día|≤|≥|<|>)/i.test(edge.label))
        .map((edge) => issue('timing.duration-label', 'warning', 'La restricción no expresa una duración verificable.', 'Incluye una magnitud, unidad o desigualdad, por ejemplo {≤ 5 min}.', [edge.sourceId, edge.targetId], [edge.id])),
    ),
    rule('timing', 'event-label', 'info', 'Evento sin causa', 'Nombrar el evento permite entender por qué cambia el estado.', (diagram) =>
      diagram.edges
        .filter((edge) => edge.artifactType === 'timeEvent' && !edge.label.trim())
        .map((edge) => issue('timing.event-label', 'info', 'Hay un cambio de estado sin evento.', 'Nombra la señal, operación o instante que provoca el cambio.', [edge.sourceId, edge.targetId], [edge.id])),
    ),
    rule('timing', 'duration-prop', 'info', 'Duración sin magnitud', 'La propiedad Duración ayuda a leer el tramo horizontal.', (diagram) =>
      ofType(diagram, 'stateInvariant')
        .filter((item) => {
          const value = item.props.duration;
          return typeof value !== 'number' || value <= 0;
        })
        .map((item) => issue('timing.duration-prop', 'info', `«${label(item)}» no declara una duración positiva.`, 'Indica cuántas unidades de tiempo cubre ese estado.', [item.id])),
    ),
    rule('timing', 'unordered', 'warning', 'Cambio sin secuencia', 'Los estados de una línea deberían encadenarse con eventos.', (diagram) =>
      ofType(diagram, 'timingLifeline').flatMap((lane) => {
        const states = diagram.nodes.filter((item) => item.parentId === lane.id && item.artifactType === 'stateInvariant');
        if (states.length < 2) return [];
        const linked = states.filter((item) => connected(diagram, item.id));
        return linked.length === 0
          ? [issue('timing.unordered', 'warning', `La línea «${label(lane)}» tiene estados sin eventos entre ellos.`, 'Conecta los cambios de estado con eventos temporales.', [lane.id])]
          : [];
      }),
    ),
  ],
  narrate: (diagram) => {
    const lanes = ofType(diagram, 'timingLifeline');
    if (lanes.length === 0) return [];
    const lines: Narration = [{
      text: `El diagrama observa ${lanes.length} línea${lanes.length === 1 ? '' : 's'} temporal${lanes.length === 1 ? '' : 'es'}.`,
      kind: 'start',
      depth: 0,
      nodeIds: lanes.map((item) => item.id),
      edgeIds: [],
    }];
    for (const lane of lanes) {
      const states = diagram.nodes
        .filter((item) => item.parentId === lane.id && item.artifactType === 'stateInvariant')
        .sort((a, b) => a.position.x - b.position.x);
      lines.push({
        text: `En «${label(lane)}» se observan ${states.length} estado${states.length === 1 ? '' : 's'}.`,
        kind: 'participants',
        depth: 0,
        nodeIds: [lane.id, ...states.map((item) => item.id)],
        edgeIds: [],
      });
      for (const state of states) {
        const duration = typeof state.props.duration === 'number' ? state.props.duration : null;
        lines.push({
          text: duration ? `Permanece en «${label(state)}» durante ${duration} unidades.` : `Permanece en «${label(state)}».`,
          kind: 'step',
          depth: 1,
          nodeIds: [state.id],
          edgeIds: [],
        });
      }
      for (const edge of diagram.edges.filter((item) => states.some((state) => state.id === item.sourceId))) {
        lines.push({
          text: edge.artifactType === 'durationConstraint'
            ? `Restricción ${edge.label || 'de duración'} entre «${label(node(diagram, edge.sourceId))}» y «${label(node(diagram, edge.targetId))}».`
            : `${edge.label || 'Un evento'} pasa de «${label(node(diagram, edge.sourceId))}» a «${label(node(diagram, edge.targetId))}».`,
          kind: edge.artifactType === 'durationConstraint' ? 'branch' : 'step',
          depth: 1,
          nodeIds: [edge.sourceId, edge.targetId],
          edgeIds: [edge.id],
        });
      }
    }
    return lines;
  },
  workshop: (templates) => {
    const broken = cloneTemplate(templates[0]!, 'timing.challenge.duration', 'Reto: plazos sin magnitud', 'Los eventos existen, pero las restricciones no dicen cuánto tiempo.', (diagram) => stripEdgeLabels({
      ...moveOutside(diagram, 'stateInvariant'),
      edges: diagram.edges.map((edge) => (edge.artifactType === 'durationConstraint' ? { ...edge, label: 'duración' } : edge)),
    }, 'timeEvent'));
    return workshopFrom(
      [
        { name: 'básico', description: 'Lee estados sobre un eje temporal.' },
        { name: 'intermedio', description: 'Exige duraciones y causas de cambio.' },
        { name: 'avanzado', description: 'Modela plazos, reintentos y solapes.' },
      ],
      [{
        id: 'timing-duration',
        title: 'Un vencimiento borroso',
        context: 'El préstamo cambia de estado, pero nadie fijó cuánto dura cada tramo.',
        diagram: broken,
        expectedProblems: 9,
        question: {
          id: 'timing-fix',
          prompt: '¿Qué recupera el significado temporal?',
          options: [
            { id: 'units', label: 'Declarar duraciones o restricciones con magnitudes, por ejemplo {15 días}', explanation: 'Correcto: en tiempos la distancia horizontal representa tiempo.', correct: true },
            { id: 'stack', label: 'Apilar los estados en vertical como una máquina de estados', explanation: 'Eso pierde el eje temporal.', correct: false },
            { id: 'numbers', label: 'Numerar los estados 1, 2, 3 como mensajes', explanation: 'La numeración no sustituye duraciones.', correct: false },
          ],
        },
      }],
      [{
        id: 'timing-brief',
        title: 'Sesión que expira',
        brief: 'Una sesión pasa de activa a inactiva a los 30 minutos sin actividad y luego expira.',
        questions: [{
          id: 'timing-brief-q',
          prompt: '¿Qué debe conservar el diagrama?',
          options: [
            { id: 'axis', label: 'La distancia horizontal entre cambios y una restricción {30 min}', explanation: 'Correcto: el tiempo es información de primer orden.', correct: true },
            { id: 'actors', label: 'Solo actores y casos de uso de iniciar sesión', explanation: 'Eso no captura duraciones.', correct: false },
            { id: 'packages', label: 'Paquetes Auth y Session', explanation: 'Eso no explica cuándo ocurre cada cambio.', correct: false },
          ],
        }],
      }],
      [{
        id: 'timing-compare',
        title: '¿Qué significa el eje X?',
        context: 'Comparas un diagrama de tiempos con uno de secuencia.',
        options: [
          { id: 'time', label: 'La distancia horizontal representa duración real', explanation: 'Correcto.', correct: true },
          { id: 'order', label: 'Solo el orden, igual que en secuencia', explanation: 'En secuencia el eje ordena; en tiempos también mide.', correct: false },
        ],
      }],
    );
  },
};
