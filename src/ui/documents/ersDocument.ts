import {
  groupByFolder,
  LESSON_OF_KIND,
  nodeName,
  REQUIREMENT_KIND_SUMMARY,
  REQUIREMENT_KINDS,
  SPEC_LESSONS,
  type Diagram,
  type DiagramProject,
  type Requirement,
  type RequirementKind,
} from '@/core/model';
import { diagramRegistry } from '@/core/registry';
import { UseCaseArtifact as U } from '@/diagrams/usecase/artifactTypes';
import { readSpec, typicalCoursePairs, useCaseContext, useCaseSheetRows } from '@/diagrams/usecase/spec';
import { escapeHtml } from '@/ui/clipboard';
import { sheetRows } from '@/ui/requirements/RequirementSheet';
import { targetLabel } from '@/ui/traceability/elementLabels';
import { DOC_TABLE, requirementSheetHtml, useCaseSheetHtml } from './sheetHtml';

/**
 * Documento ERS (Especificación de Requisitos de Software) del proyecto, como
 * un HTML completo: el mismo sirve para verlo, copiarlo, bajarlo como Word e
 * imprimirlo como PDF. Se arma con lo que ya hay en el proyecto (requisitos,
 * fichas de casos de uso, diagramas, vínculos y casos de prueba): no se escribe
 * nada dos veces. Etapas: reunir → numerar secciones → escribir cada una.
 */

export interface ErsInput {
  project: DiagramProject;
  /** Diagramas del proyecto, en su orden. */
  diagrams: readonly Diagram[];
  /** Imagen (data URL) de cada diagrama, si se generó. */
  images: Readonly<Record<string, string>>;
  date: Date;
}

const KIND_ORDER: RequirementKind[] = ['funcional', 'no funcional', 'regla de negocio'];
const KIND_TITLES: Record<RequirementKind, string> = { funcional: 'Requisitos funcionales', 'no funcional': 'Requisitos no funcionales', 'regla de negocio': 'Reglas de negocio' };
const STATUS_LABEL = { pendiente: 'Pendiente', pasa: 'Pasa', falla: 'Falla' } as const;

const STYLE = `
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.45; max-width: 820px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 26pt; margin: 0 0 8px; }
  h2 { font-size: 16pt; margin: 28px 0 10px; border-bottom: 1px solid #999; padding-bottom: 4px; page-break-before: always; }
  h3 { font-size: 13pt; margin: 20px 0 8px; }
  h4 { font-size: 11pt; margin: 14px 0 6px; }
  table { margin: 8px 0 16px; }
  th { background: #d9d9d9; text-align: left; }
  td, th { vertical-align: top; }
  img { max-width: 100%; border: 1px solid #ccc; }
  .cover { text-align: center; padding: 120px 0 80px; page-break-after: always; }
  .cover p { font-size: 13pt; color: #444; }
  .muted { color: #666; }
  .narration p { margin: 2px 0; }
  @page { margin: 2cm; }
  @media print { body { margin: 0; max-width: none; } }
`;

const prefixOf = (kind: RequirementKind) => REQUIREMENT_KINDS.find((item) => item.id === kind)!.prefix;
const formatDate = (date: Date) => date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return '<p class="muted">No hay elementos.</p>';
  return `<table ${DOC_TABLE}><tr>${head.map((title) => `<th>${escapeHtml(title)}</th>`).join('')}</tr>${rows
    .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
}

/** El documento completo, como HTML. */
export function buildErsHtml({ project, diagrams, images, date }: ErsInput): string {
  const requirements = project.requirements.filter((item) => item.status !== 'descartado');
  const codeOf = (id: string) => project.requirements.find((item) => item.id === id)?.code ?? '';
  const fulfilledBy = (requirement: Requirement) => project.requirementLinks
    .filter((link) => link.requirementId === requirement.id)
    .map((link) => targetLabel(diagrams, link.diagramId, link.elementId));
  const testsOf = (requirement: Requirement) => project.testCases.filter((item) => item.requirementIds.includes(requirement.id));
  const useCases = diagrams
    .filter((diagram) => diagram.diagramType === 'usecase')
    .flatMap((diagram) => diagram.nodes.filter((node) => node.artifactType === U.useCase).map((node) => ({ diagram, node, spec: readSpec(node) })));
  const diagramName = (id: string) => diagrams.find((diagram) => diagram.id === id)?.name ?? '—';

  // 1. Introducción
  const counts = KIND_ORDER.map((kind) => `${requirements.filter((item) => item.kind === kind).length} ${KIND_TITLES[kind].toLowerCase()}`);
  const introduction = `<h2>1. Introducción</h2>
    <h3>1.1 Propósito</h3>
    <p>Este documento especifica los requisitos del sistema «${escapeHtml(project.name)}»: lo que debe hacer (requisitos funcionales), cómo debe ser (requisitos no funcionales) y las reglas del negocio que aplica, junto con los casos de uso, los modelos que los detallan y los casos de prueba que los verifican.</p>
    <h3>1.2 Alcance</h3>
    <p>Contiene ${counts.join(', ')}; ${useCases.length} casos de uso; ${diagrams.length} diagramas y ${project.testCases.length} casos de prueba.</p>
    <h3>1.3 Definiciones</h3>
    ${table(['Sigla', 'Significado'], [
      ...KIND_ORDER.map((kind) => [prefixOf(kind), `${SPEC_LESSONS.find((lesson) => lesson.id === LESSON_OF_KIND[kind])!.title}: ${REQUIREMENT_KIND_SUMMARY[kind].text}`]),
      ['CU', 'Caso de uso: una meta de un actor y cómo la alcanza con el sistema.'],
      ['CP', 'Caso de prueba: un camino del proceso con lo que debe pasar (Dado / Cuando / Entonces).'],
    ])}`;

  // 2. Requisitos
  const requirementSections = KIND_ORDER.map((kind, index) => {
    const ofKind = requirements.filter((item) => item.kind === kind);
    return `<h3>2.${index + 1} ${KIND_TITLES[kind]}</h3>${ofKind.length === 0
      ? '<p class="muted">No hay requisitos de este tipo.</p>'
      : ofKind.map((requirement) => `<h4>${escapeHtml(requirement.code)} ${escapeHtml(requirement.title)}</h4>${requirementSheetHtml(sheetRows(requirement, fulfilledBy(requirement)))}`).join('')}`;
  }).join('');

  // 3. Casos de uso
  const useCaseList = table(['Código', 'Nombre del caso de uso', 'Actor'], useCases.map(({ diagram, node, spec }) => [spec?.code ?? '—', nodeName(node), useCaseContext(diagram, node.id).actors.join(', ') || '—']));
  const useCaseSheets = useCases.filter((item) => item.spec).map(({ diagram, node, spec }) => {
    const references = project.requirementLinks.filter((link) => link.diagramId === diagram.id && link.elementId === node.id).map((link) => codeOf(link.requirementId)).filter(Boolean);
    return `<h4>${escapeHtml(spec!.code)} ${escapeHtml(nodeName(node))}</h4>${useCaseSheetHtml(useCaseSheetRows(nodeName(node), spec!, useCaseContext(diagram, node.id), references), typicalCoursePairs(spec!), spec!.alternateCourses)}`;
  }).join('');

  // 4. Modelos: por carpeta, cada diagrama con su imagen y su narración.
  let modelIndex = 0;
  const models = groupByFolder(project).filter((group) => group.diagramIds.length > 0).map((group) => {
    const items = group.diagramIds.map((id) => diagrams.find((diagram) => diagram.id === id)).filter((diagram): diagram is Diagram => diagram !== undefined).map((diagram) => {
      modelIndex += 1;
      const module = diagramRegistry.has(diagram.diagramType) ? diagramRegistry.get(diagram.diagramType) : null;
      const narration = module ? module.narrate(diagram).map((line) => `<p style="margin-left:${line.depth * 18}px">${escapeHtml(line.text)}</p>`).join('') : '';
      const image = images[diagram.id];
      return `<h3>4.${modelIndex} ${escapeHtml(diagram.name)}</h3>
        <p class="muted">${escapeHtml(module?.displayName ?? diagram.diagramType)}${diagram.description ? ` · ${escapeHtml(diagram.description)}` : ''}</p>
        ${image ? `<p><img src="${image}" alt="${escapeHtml(diagram.name)}"></p>` : ''}
        ${narration ? `<div class="narration">${narration}</div>` : ''}`;
    }).join('');
    return `${group.folder ? `<p><strong>Carpeta: ${escapeHtml(group.folder.name)}</strong></p>` : ''}${items}`;
  }).join('');

  // 5. Matriz de trazabilidad
  const matrix = table(['Requisito', 'Título', 'Lo cumple', 'Lo verifica'], requirements.map((requirement) => [
    requirement.code,
    requirement.title,
    fulfilledBy(requirement).join('\n') || 'Sin cubrir',
    testsOf(requirement).map((item) => `${item.code} (${STATUS_LABEL[item.status]})`).join('\n') || 'Sin probar',
  ]));

  // 6. Casos de prueba
  const tests = table(['Código', 'Caso de prueba', 'Proceso', 'Dado', 'Cuando', 'Entonces', 'Verifica', 'Estado'], project.testCases.map((item) => [
    item.code, item.title, diagramName(item.diagramId), item.given || '—', item.when, item.then, item.requirementIds.map(codeOf).filter(Boolean).join(', ') || '—', STATUS_LABEL[item.status],
  ]));

  const sections = ['Introducción', 'Requisitos', 'Casos de uso', 'Modelos del sistema', 'Matriz de trazabilidad', 'Casos de prueba'];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>ERS · ${escapeHtml(project.name)}</title><style>${STYLE}</style></head><body>
    <div class="cover">
      <p>Especificación de Requisitos de Software</p>
      <h1>${escapeHtml(project.name)}</h1>
      <p>${formatDate(date)}</p>
    </div>
    <h3>Contenido</h3>
    <ol>${sections.map((title) => `<li>${title}</li>`).join('')}</ol>
    ${introduction}
    <h2>2. Requisitos</h2>${requirementSections}
    <h2>3. Casos de uso</h2><h3>3.1 Listado de casos de uso</h3>${useCaseList}<h3>3.2 Fichas de casos de uso</h3>${useCaseSheets || '<p class="muted">Ningún caso de uso tiene ficha todavía.</p>'}
    <h2>4. Modelos del sistema</h2>${models || '<p class="muted">El proyecto no tiene diagramas.</p>'}
    <h2>5. Matriz de trazabilidad</h2>${matrix}
    <h2>6. Casos de prueba</h2>${tests}
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
