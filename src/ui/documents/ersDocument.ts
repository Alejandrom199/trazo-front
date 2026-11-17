import {
  emptyProjectDocument,
  nodeName,
  REQUIREMENT_KIND_SUMMARY,
  REQUIREMENT_KINDS,
  requirementCoverage,
  type Diagram,
  type DiagramProject,
  type DiagramType,
  type Requirement,
  type RequirementKind,
} from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { UseCaseArtifact as U } from '@/diagrams/usecase/artifactTypes';
import { readSpec, typicalCoursePairs, useCaseContext, useCaseSheetRows, type UseCaseSpec } from '@/diagrams/usecase/spec';
import { escapeHtml } from '@/ui/clipboard';
import { sheetRows } from '@/ui/requirements/RequirementSheet';
import { targetLabel } from '@/ui/traceability/elementLabels';
import { DOC_TABLE, requirementSheetHtml, useCaseSheetHtml } from './sheetHtml';

/**
 * Documento ERS (Especificación de Requerimientos de Software) con la
 * estructura de la plantilla IEEE 830: doce capítulos y un anexo con los casos
 * de prueba. Todo lo que el modelo sabe sale del proyecto (requisitos, casos de
 * uso, actores, diagramas, matrices, pruebas); lo que no, de los datos del
 * documento (problema, audiencia, glosario…). Lo que falta se marca «Por
 * completar». Un mismo HTML sirve para verlo, copiarlo, bajarlo como Word e
 * imprimirlo como PDF.
 */

export interface ErsInput {
  project: DiagramProject;
  /** Diagramas del proyecto, en su orden. */
  diagrams: readonly Diagram[];
  /** Imagen (data URL) de cada diagrama, si se generó. */
  images: Readonly<Record<string, string>>;
  date: Date;
}

/** En qué capítulo va cada tipo de diagrama (cada uno aparece una sola vez). */
const PROCESS_TYPES: ReadonlySet<DiagramType> = new Set(['activity']);
const DOMAIN_TYPES: ReadonlySet<DiagramType> = new Set(['class', 'er', 'object']);
const INTERACTION_TYPES: ReadonlySet<DiagramType> = new Set(['sequence', 'communication', 'interactionOverview', 'state', 'timing']);
const ARCHITECTURE_TYPES: ReadonlySet<DiagramType> = new Set(['component', 'deployment', 'package', 'composite', 'profile']);
/** Categorías de no funcionales que son «del ambiente» (las demás, «del producto»). */
const ENVIRONMENT_CATEGORIES = ['ético', 'etico', 'ética', 'legal', 'legales', 'ambiente', 'normativo', 'normativa'];
const STATUS_LABEL = { pendiente: 'Pendiente', pasa: 'Pasa', falla: 'Falla' } as const;

const STYLE = `
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.45; max-width: 820px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 24pt; margin: 0 0 8px; }
  h2 { font-size: 16pt; margin: 28px 0 10px; border-bottom: 1px solid #999; padding-bottom: 4px; page-break-before: always; }
  h3 { font-size: 13pt; margin: 20px 0 8px; }
  h4 { font-size: 11pt; margin: 14px 0 6px; }
  table { margin: 8px 0 16px; }
  th { background: #d9d9d9; text-align: left; }
  td, th { vertical-align: top; }
  img { max-width: 100%; border: 1px solid #ccc; }
  .cover { text-align: center; padding: 110px 0 70px; page-break-after: always; }
  .cover .kind { font-size: 13pt; letter-spacing: 1px; text-transform: uppercase; color: #444; }
  .cover p { font-size: 12pt; color: #444; margin: 4px 0; }
  .muted { color: #666; }
  .pending { color: #b45309; font-style: italic; }
  .center { text-align: center; }
  @page { margin: 2cm; }
  @media print { body { margin: 0; max-width: none; } }
`;

const formatDate = (date: Date) => date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
const PENDING = '<p class="pending">Por completar.</p>';

/** Texto libre: un párrafo por línea; las que empiezan con «-» o «•» van en lista. Vacío: «Por completar». */
function prose(value: string): string {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return PENDING;
  let html = '';
  let list: string[] = [];
  const flush = () => {
    if (list.length > 0) html += `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    list = [];
  };
  for (const line of lines) {
    if (/^[-•*]\s*/.test(line)) list.push(line.replace(/^[-•*]\s*/, ''));
    else {
      flush();
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }
  flush();
  return html;
}

function table(head: readonly string[], rows: readonly (readonly string[])[], empty = 'No hay elementos.'): string {
  if (rows.length === 0) return `<p class="muted">${empty}</p>`;
  return `<table ${DOC_TABLE}><tr>${head.map((title) => `<th>${escapeHtml(title)}</th>`).join('')}</tr>${rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
}

/** Matriz con X: filas × columnas, marcadas por `marked(fila, columna)`. */
function crossMatrix(corner: string, rows: readonly { id: string; label: string }[], columns: readonly { id: string; label: string }[], marked: (row: string, column: string) => boolean): string {
  if (rows.length === 0 || columns.length === 0) return '<p class="muted">No hay elementos que cruzar.</p>';
  return `<table ${DOC_TABLE}><tr><th>${escapeHtml(corner)}</th>${columns.map((column) => `<th class="center">${escapeHtml(column.label)}</th>`).join('')}</tr>${rows
    .map((row) => `<tr><td><strong>${escapeHtml(row.label)}</strong></td>${columns.map((column) => `<td class="center">${marked(row.id, column.id) ? 'X' : ''}</td>`).join('')}</tr>`).join('')}</table>`;
}

/** El documento completo, como HTML. */
export function buildErsHtml({ project, diagrams, images, date }: ErsInput): string {
  const doc = project.document ?? emptyProjectDocument();
  const requirements = project.requirements.filter((item) => item.status !== 'descartado');
  const codeOf = (id: string) => project.requirements.find((item) => item.id === id)?.code ?? '';
  const fulfilledBy = (requirement: Requirement) => project.requirementLinks
    .filter((link) => link.requirementId === requirement.id)
    .map((link) => targetLabel(diagrams, link.diagramId, link.elementId));
  const ofKind = (kind: RequirementKind) => requirements.filter((item) => item.kind === kind);
  const fichas = (list: readonly Requirement[], empty: string) => (list.length === 0
    ? `<p class="muted">${empty}</p>`
    : list.map((requirement) => `<h4>${escapeHtml(requirement.code)} ${escapeHtml(requirement.title)}</h4>${requirementSheetHtml(sheetRows(requirement, fulfilledBy(requirement)))}`).join(''));

  // Casos de uso y actores (salen de los diagramas de casos de uso).
  const useCases = diagrams
    .filter((diagram) => diagram.diagramType === 'usecase')
    .flatMap((diagram) => diagram.nodes.filter((node) => node.artifactType === U.useCase).map((node) => ({ diagram, node, spec: readSpec(node) })));
  const useCaseCode = (item: { node: { id: string }; spec: UseCaseSpec | null }, index: number) => item.spec?.code ?? `CU${String(index + 1).padStart(2, '0')}`;
  const useCaseRefs = (diagramId: string, nodeId: string) => project.requirementLinks.filter((link) => link.diagramId === diagramId && link.elementId === nodeId);
  const actors = new Map<string, { notes: string; useCases: string[] }>();
  useCases.forEach((item, index) => {
    for (const name of useCaseContext(item.diagram, item.node.id).actors) {
      const actorNode = item.diagram.nodes.find((node) => node.artifactType === U.actor && nodeName(node) === name);
      const entry = actors.get(name) ?? { notes: '', useCases: [] };
      actors.set(name, { notes: entry.notes || actorNode?.notes.trim() || '', useCases: [...entry.useCases, `${useCaseCode(item, index)} ${nodeName(item.node)}`] });
    }
  });

  // Diagramas: cada uno con su número DG-# y su ficha de referencia.
  const dgOf = (id: string) => `DG-${diagrams.findIndex((diagram) => diagram.id === id) + 1}`;
  const useCaseCodeByNode = new Map(useCases.map((item, index) => [`${item.diagram.id}:${item.node.id}`, useCaseCode(item, index)]));
  function relatedUseCases(diagram: Diagram): string[] {
    if (diagram.diagramType === 'usecase') return useCases.filter((item) => item.diagram.id === diagram.id).map((item) => useCaseCodeByNode.get(`${item.diagram.id}:${item.node.id}`)!);
    const codes = project.traceLinks.flatMap((link) => {
      const ends = [link.source, link.target];
      if (!ends.some((end) => end.diagramId === diagram.id)) return [];
      return ends.map((end) => useCaseCodeByNode.get(`${end.diagramId}:${end.elementId}`)).filter((code): code is string => code !== undefined);
    });
    return [...new Set(codes)];
  }
  function figure(diagram: Diagram): string {
    const module = diagramRegistry.has(diagram.diagramType) ? diagramRegistry.get(diagram.diagramType) : null;
    const image = images[diagram.id];
    const requirementCodes = [...new Set(project.requirementLinks.filter((link) => link.diagramId === diagram.id).map((link) => codeOf(link.requirementId)).filter(Boolean))];
    const scenarios = project.testCases.filter((item) => item.diagramId === diagram.id).map((item) => item.code);
    const narration = module ? module.narrate(diagram).map((line) => `<p style="margin:2px 0 2px ${line.depth * 18}px">${escapeHtml(line.text)}</p>`).join('') : '';
    return `<h4>${dgOf(diagram.id)} ${escapeHtml(diagram.name)}</h4>
      ${table(['ID Ref', 'Descripción', 'Reqs. asociados', 'CU asociados', 'Esc. asociados'], [[
        dgOf(diagram.id),
        `${module?.displayName ?? diagram.diagramType}${diagram.description ? `: ${diagram.description}` : ''}`,
        requirementCodes.join(', ') || '—',
        relatedUseCases(diagram).join(', ') || '—',
        scenarios.join(', ') || '—',
      ]])}
      ${image ? `<p><img src="${image}" alt="${escapeHtml(diagram.name)}"></p>` : '<p class="muted">(Agrega las imágenes de los diagramas para verlo aquí).</p>'}
      ${narration ? `<p><strong>Cómo se lee:</strong></p>${narration}` : ''}`;
  }
  const figures = (types: ReadonlySet<DiagramType>, empty: string) => {
    const list = diagrams.filter((diagram) => types.has(diagram.diagramType));
    return list.length === 0 ? `<p class="muted">${empty}</p>` : list.map(figure).join('');
  };
  const shown = new Set<DiagramType>(['usecase', ...PROCESS_TYPES, ...DOMAIN_TYPES, ...INTERACTION_TYPES, ...ARCHITECTURE_TYPES]);
  const otherTypes = new Set(diagrams.map((diagram) => diagram.diagramType).filter((type) => !shown.has(type)));

  const nonFunctional = ofKind('no funcional');
  const isEnvironment = (requirement: Requirement) => ENVIRONMENT_CATEGORIES.includes(requirement.category.trim().toLowerCase());
  const coverage = requirementCoverage(requirements, project.requirementLinks, diagrams);

  const chapters = [
    'Introducción', 'Presentación del producto', 'Descripción general', 'Descripción detallada de requerimientos', 'Modelo de casos de uso',
    'Modelo de análisis', 'Requerimientos de interfaz', 'Matriz de trazabilidad', 'Restricciones de diseño', 'Requerimientos de licencia',
    'Procedimiento de control de cambios', 'Observaciones',
  ];

  const glossaryRows = [
    ...doc.glossary.filter((entry) => entry.term.trim()).map((entry) => [entry.term, entry.definition || '—', entry.alias || '—', entry.abbreviation || '—']),
    ...REQUIREMENT_KINDS.map((kind) => [`Requerimiento ${kind.name.toLowerCase()}`, REQUIREMENT_KIND_SUMMARY[kind.id].text, '—', kind.prefix]),
    ['Caso de uso', 'Una meta de un actor y cómo la alcanza con el sistema.', '—', 'CU'],
    ['Actor', 'Rol, persona u otro sistema que interactúa con el sistema.', '—', 'ACT'],
    ['Diagrama', 'Modelo gráfico del sistema, referenciado por su número.', '—', 'DG'],
    ['Caso de prueba', 'Un camino del proceso con lo que debe pasar (Dado / Cuando / Entonces).', 'Escenario', 'CP'],
  ];

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>ERS · ${escapeHtml(project.name)}</title><style>${STYLE}</style></head><body>
    <div class="cover">
      <p class="kind">Documento de especificación de requerimientos de software</p>
      <h1>${escapeHtml(project.name)}</h1>
      ${doc.client.trim() ? `<p>Cliente: ${escapeHtml(doc.client.trim())}</p>` : ''}
      <p>Versión ${escapeHtml(doc.version.trim() || '1.0')} · ${formatDate(date)}</p>
    </div>

    <h3>Tabla de contenido</h3>
    <ol>${chapters.map((title) => `<li>${title}</li>`).join('')}</ol>
    <p>Anexo A. Casos de prueba</p>

    <h2>1. Introducción</h2>
    <h3>1.1 Objetivo</h3>
    <p>La presente Especificación de Requerimientos de Software tiene como objetivo definir con claridad los requerimientos del proyecto «${escapeHtml(project.name)}». Este documento refleja la funcionalidad del sistema y contiene la información necesaria para que el lector entienda los objetivos y el funcionamiento del producto.</p>
    <h3>1.2 Definiciones, acrónimos y abreviaturas</h3>
    ${table(['Término', 'Definición', 'Alias', 'Abreviatura'], glossaryRows)}
    <h3>1.3 Audiencia</h3>
    ${doc.audience.some((item) => item.name.trim()) ? table(['Stakeholder', 'Rol', 'Responsabilidad', 'Intereses', 'Información de contacto'], doc.audience.filter((item) => item.name.trim()).map((item) => [item.name, item.role || '—', item.responsibility || '—', item.interests || '—', item.contact || '—'])) : PENDING}
    <h3>1.4 Alcance</h3>
    <p>El alcance de esta ERS comprende la definición de los requerimientos funcionales y no funcionales, el objetivo del producto, lo que el sistema no contempla, las reglas de negocio, el modelo de casos de uso, el modelo de análisis, los requerimientos de interfaz, las restricciones de diseño, la trazabilidad y los casos de prueba que verifican los requerimientos.</p>

    <h2>2. Presentación del producto</h2>
    <h3>2.1 Propósito del sistema</h3>
    <h4>2.1.1 Planteamiento del problema</h4>${prose(doc.problem)}
    <h4>2.1.2 Objetivo</h4>${prose(doc.objective)}
    <h4>2.1.3 Alcance</h4>${prose(doc.scope)}
    <h4>2.1.4 El sistema no contempla</h4>${prose(doc.notIncluded)}
    <h3>2.2 Riesgos</h3>${prose(doc.risks)}

    <h2>3. Descripción general</h2>
    <h3>3.1 Contexto del producto</h3>${prose(doc.context)}
    <h3>3.2 Perspectivas futuras del producto</h3>${prose(doc.future)}
    ${requirements.some((item) => item.status === 'propuesto') ? `<p>Requerimientos propuestos, aún no aprobados: ${requirements.filter((item) => item.status === 'propuesto').map((item) => `${escapeHtml(item.code)} ${escapeHtml(item.title)}`).join('; ')}.</p>` : ''}
    <h3>3.3 Reglas y funciones de negocio</h3>
    ${fichas(ofKind('regla de negocio'), 'No hay reglas de negocio registradas.')}
    <p><strong>Procesos del negocio (diagramas de actividades):</strong></p>
    ${figures(PROCESS_TYPES, 'No hay diagramas de actividades.')}

    <h2>4. Descripción detallada de requerimientos</h2>
    <h3>4.1 Requerimientos funcionales</h3>${fichas(ofKind('funcional'), 'No hay requerimientos funcionales.')}
    <h3>4.2 Requerimientos no funcionales</h3>
    <h4>4.2.1 Del producto</h4>${fichas(nonFunctional.filter((item) => !isEnvironment(item)), 'No hay requerimientos de este tipo.')}
    <h4>4.2.2 Del ambiente</h4>${fichas(nonFunctional.filter(isEnvironment), 'No hay requerimientos del ambiente (éticos o legales).')}

    <h2>5. Modelo de casos de uso</h2>
    <h3>5.1 Actores</h3>
    ${actors.size === 0 ? '<p class="muted">No hay actores en los diagramas de casos de uso.</p>' : [...actors.entries()].map(([name, actor], index) => `<table ${DOC_TABLE}>
      <tr><th style="width:30%">Número:</th><td>ACT-${index + 1}</td></tr>
      <tr><th>Actor:</th><td>${escapeHtml(name)}</td></tr>
      <tr><th>Descripción:</th><td>${actor.notes ? escapeHtml(actor.notes) : '<span class="pending">Por completar (en las notas del actor, en el diagrama).</span>'}</td></tr>
      <tr><th>Responsabilidades:</th><td><ul>${actor.useCases.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></td></tr>
    </table>`).join('')}
    <h3>5.2 Diagramas de casos de uso</h3>${figures(new Set(['usecase']), 'No hay diagramas de casos de uso.')}
    <h3>5.3 Listado de casos de uso</h3>
    ${table(['Id', 'Caso de uso', 'Actor', 'Tipo', 'Requerimiento asociado'], useCases.map((item, index) => [
      useCaseCode(item, index),
      nodeName(item.node),
      useCaseContext(item.diagram, item.node.id).actors.join(', ') || '—',
      item.spec ? `${item.spec.importance} y ${item.spec.level}` : '—',
      useCaseRefs(item.diagram.id, item.node.id).map((link) => codeOf(link.requirementId)).filter(Boolean).join(', ') || '—',
    ]), 'No hay casos de uso.')}
    <h3>5.4 Detalle de casos de uso</h3>
    ${useCases.filter((item) => item.spec).map(({ diagram, node, spec }) => `<h4>${escapeHtml(spec!.code)} ${escapeHtml(nodeName(node))}</h4>${useCaseSheetHtml(
      useCaseSheetRows(nodeName(node), spec!, useCaseContext(diagram, node.id), useCaseRefs(diagram.id, node.id).map((link) => codeOf(link.requirementId)).filter(Boolean)),
      typicalCoursePairs(spec!),
      spec!.alternateCourses,
    )}`).join('') || '<p class="pending">Ningún caso de uso tiene ficha todavía (selecciona uno y abre su ficha en Propiedades).</p>'}

    <h2>6. Modelo de análisis</h2>
    <h3>6.1 Modelo del dominio</h3>${figures(DOMAIN_TYPES, 'No hay diagramas de clases ni de datos.')}
    <h3>6.2 Diagramas de secuencia y/o colaboración</h3>${figures(INTERACTION_TYPES, 'No hay diagramas de interacción ni de estados.')}
    <h3>6.3 Arquitectura</h3>${figures(ARCHITECTURE_TYPES, 'No hay diagramas de componentes ni de despliegue.')}
    ${otherTypes.size > 0 ? `<h3>6.4 Otros modelos</h3>${figures(otherTypes, '')}` : ''}

    <h2>7. Requerimientos de interfaz</h2>
    <h3>7.1 Interfaces con el usuario</h3>${prose(doc.userInterfaces)}
    <h3>7.2 Interfaces de hardware</h3>${prose(doc.hardwareInterfaces)}
    <h3>7.3 Interfaces de software</h3>${prose(doc.softwareInterfaces)}
    <h3>7.4 Interfaces de comunicación</h3>${prose(doc.communicationInterfaces)}

    <h2>8. Matriz de trazabilidad</h2>
    <h3>8.1 Trazabilidad de requisitos</h3>
    <p class="muted">Qué diagrama (DG) cumple cada requerimiento.</p>
    ${crossMatrix('Req. id', requirements.map((item) => ({ id: item.id, label: item.code })), diagrams.map((diagram) => ({ id: diagram.id, label: dgOf(diagram.id) })),
      (requirementId, diagramId) => coverage.some((item) => item.requirement.id === requirementId && item.links.some((link) => link.diagramId === diagramId)))}
    <p class="muted">${diagrams.map((diagram) => `${dgOf(diagram.id)}: ${escapeHtml(diagram.name)}`).join(' · ')}</p>
    <h3>8.2 Trazabilidad de casos de uso</h3>
    <p class="muted">Qué caso de uso cumple cada requerimiento (sus Referencias).</p>
    ${crossMatrix('Req. id', requirements.map((item) => ({ id: item.id, label: item.code })), useCases.map((item, index) => ({ id: `${item.diagram.id}:${item.node.id}`, label: useCaseCode(item, index) })),
      (requirementId, key) => project.requirementLinks.some((link) => link.requirementId === requirementId && `${link.diagramId}:${link.elementId}` === key))}
    <h3>8.3 Verificación</h3>
    ${table(['Req. id', 'Requerimiento', 'Lo cumple', 'Lo verifica'], requirements.map((requirement) => [
      requirement.code,
      requirement.title,
      fulfilledBy(requirement).join('\n') || 'Sin cubrir',
      project.testCases.filter((item) => item.requirementIds.includes(requirement.id)).map((item) => `${item.code} (${STATUS_LABEL[item.status]})`).join('\n') || 'Sin probar',
    ]))}

    <h2>9. Restricciones de diseño</h2>${prose(doc.designConstraints)}
    <h2>10. Requerimientos de licencia</h2>${prose(doc.licensing)}
    <h2>11. Procedimiento de control de cambios</h2>${prose(doc.changeControl)}
    <h2>12. Observaciones</h2>${prose(doc.observations)}

    <h2>Anexo A. Casos de prueba</h2>
    ${table(['Código', 'Caso de prueba', 'Proceso', 'Dado', 'Cuando', 'Entonces', 'Verifica', 'Estado'], project.testCases.map((item) => [
      item.code, item.title, `${dgOf(item.diagramId)} ${diagrams.find((diagram) => diagram.id === item.diagramId)?.name ?? ''}`, item.given || '—', item.when, item.then,
      item.requirementIds.map(codeOf).filter(Boolean).join(', ') || '—', STATUS_LABEL[item.status],
    ]), 'No hay casos de prueba (Narración → Escenarios).')}
  </body></html>`;
}

/**
 * El documento como .doc que Word abre con sus imágenes: un MHTML (HTML con las
 * imágenes adjuntas), porque Word no muestra imágenes incrustadas como data URL.
 */
export function toWordDocument(html: string): string {
  const boundary = '----=_TrazoERS';
  const images: { location: string; mime: string; data: string }[] = [];
  const body = html.replace(/src="data:(image\/[a-z+]+);base64,([^"]+)"/g, (_, mime: string, data: string) => {
    const location = `file:///C:/ers/imagen${images.length + 1}.${mime === 'image/png' ? 'png' : 'svg'}`;
    images.push({ location, mime, data });
    return `src="${location}"`;
  });
  const lines = (data: string) => data.match(/.{1,76}/g)?.join('\r\n') ?? '';
  return [
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    'Content-Location: file:///C:/ers/ers.htm',
    '',
    body,
    ...images.flatMap((image) => [`--${boundary}`, `Content-Type: ${image.mime}`, 'Content-Transfer-Encoding: base64', `Content-Location: ${image.location}`, '', lines(image.data)]),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}
