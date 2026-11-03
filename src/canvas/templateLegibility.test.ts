import { describe, expect, it } from 'vitest';
import { absolutePosition, type Diagram, type Template } from '@/core/model';
import { createRegistry, type DiagramModule } from '@/core/registry';
import { registerDiagramModules } from '@/diagrams';
import { connectionPath } from './connectionPath';
import type { Rect } from './edgeGeometry';

/**
 * Las plantillas enseñan: deben leerse sin esfuerzo. Se dibujan con el mismo
 * recorrido que el lienzo y se comprueba que no haya nodos encimados ni textos
 * de flechas uno sobre otro.
 */

const registry = createRegistry();
registerDiagramModules(registry);
const cases = registry.list().flatMap((module) => module.templates.map((template) => ({ name: `${module.displayName}: ${template.name}`, module, template })));

/** Tamaño aproximado de un texto de flecha (12 px de alto, ~6 px por letra). */
const textBox = (text: string, at: { x: number; y: number }): Rect => ({ x: at.x - (text.length * 6) / 2, y: at.y - 8, width: text.length * 6, height: 16 });

/** Separación mínima entre dos nodos: menos que esto se lee como «pegados». */
const MIN_GAP = 30;
const inflate = (rect: Rect): Rect => ({ x: rect.x - MIN_GAP / 2, y: rect.y - MIN_GAP / 2, width: rect.width + MIN_GAP, height: rect.height + MIN_GAP });

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function rectsOf(diagram: Diagram): Map<string, Rect> {
  return new Map(diagram.nodes.map((node) => [node.id, { ...absolutePosition(diagram, node), ...node.size }]));
}

function edgeTexts(module: DiagramModule, template: Template) {
  const { diagram } = template;
  const rects = rectsOf(diagram);
  return diagram.edges.flatMap((edge) => {
    const text = module.edgeKinds[edge.artifactType]?.text === 'guard' ? edge.guard && `[${edge.guard}]` : edge.label;
    const source = rects.get(edge.sourceId);
    const target = rects.get(edge.targetId);
    if (!text || !source || !target) return [];
    return [{ text, box: textBox(text, connectionPath(diagram, module, edge, source, target).label) }];
  });
}

describe('plantillas legibles', () => {
  it.each(cases)('$name: los textos de las flechas no se enciman', ({ module, template }) => {
    const texts = edgeTexts(module, template);
    const clashes = texts.flatMap((a, i) => texts.slice(i + 1).filter((b) => overlaps(a.box, b.box)).map((b) => `${a.text} / ${b.text}`));
    expect(clashes).toEqual([]);
  });

  it.each(cases)('$name: dos flechas de un mismo nodo no salen del mismo punto', ({ module, template }) => {
    const { diagram } = template;
    const rects = rectsOf(diagram);
    const starts = diagram.edges.flatMap((edge) => {
      const source = rects.get(edge.sourceId);
      const target = rects.get(edge.targetId);
      if (!source || !target) return [];
      const start = connectionPath(diagram, module, edge, source, target).controlPoints[0]!;
      return [{ key: `${edge.sourceId}@${Math.round(start.x)},${Math.round(start.y)}`, edge }];
    });
    const shared = starts.filter((a, i) => starts.some((b, j) => i !== j && a.key === b.key)).map((entry) => entry.key);
    expect(shared).toEqual([]);
  });

  it.each(cases)('$name: los nodos dejan aire entre sí (al menos MIN_GAP px; salvo contenedores y marcos)', ({ module, template }) => {
    const { diagram } = template;
    const rects = rectsOf(diagram);
    const solid = diagram.nodes.filter((node) => {
      const kind = module.nodeKinds[node.artifactType];
      return kind && !kind.isContainer && !kind.gripOnly && !kind.centerInContainer;
    });
    const clashes = solid.flatMap((a, i) =>
      solid.slice(i + 1).filter((b) => overlaps(inflate(rects.get(a.id)!), inflate(rects.get(b.id)!))).map((b) => `${a.label || a.artifactType} / ${b.label || b.artifactType}`),
    );
    expect(clashes).toEqual([]);
  });
});
