import { describe, expect, it } from 'vitest';
import { createEmptyDiagram } from '@/core/model';
import { ActivityArtifact as A } from './artifactTypes';
import { narrateActivity } from './narrator';
import { documentApprovalTemplate } from './templates/documentApprovalTemplate';
import { loginTemplate } from './templates/loginTemplate';
import { onlineOrderTemplate } from './templates/onlineOrderTemplate';
import { parallelOnboardingTemplate } from './templates/parallelOnboardingTemplate';
import { createTemplateBuilder } from './templates/templateBuilder';

const textOf = (lines: ReturnType<typeof narrateActivity>) => lines.map((line) => line.text);

describe('narrador del diagrama de actividades', () => {
  it('Dado un lienzo vacío, Entonces no hay narración', () => {
    expect(narrateActivity(createEmptyDiagram({ diagramType: 'activity', name: 'x' }))).toEqual([]);
  });

  it('Dado un diagrama sin nodo inicial, Entonces lo dice en vez de inventar un orden', () => {
    const t = createTemplateBuilder();
    t.node(A.action, 'Pagar', { x: 0, y: 0 });
    const diagram = t.build({ id: 'x', name: 'x', description: '', difficulty: 'básico', learningGoals: [] }).diagram;

    expect(textOf(narrateActivity(diagram))[0]).toContain('no tiene nodo inicial');
  });

  it('Dada una secuencia simple, Entonces la cuenta en orden con "Primero" y "Luego"', () => {
    const t = createTemplateBuilder();
    const start = t.node(A.initialNode, '', { x: 0, y: 0 });
    const a = t.node(A.action, 'Pedir', { x: 0, y: 100 });
    const b = t.node(A.action, 'Pagar', { x: 0, y: 200 });
    const end = t.node(A.activityFinal, '', { x: 0, y: 300 });
    t.flow(start, a);
    t.flow(a, b);
    t.flow(b, end);
    const diagram = t.build({ id: 'x', name: 'Compra', description: '', difficulty: 'básico', learningGoals: [] }).diagram;

    expect(textOf(narrateActivity(diagram))).toEqual([
      'El proceso «Compra» empieza en el nodo inicial.',
      'Primero, se ejecuta «Pedir».',
      'Luego, se ejecuta «Pagar».',
      'Luego, el proceso termina.',
    ]);
  });

  it('Dado el login, Entonces narra la decisión con sus guardas y el bucle de reintento', () => {
    const text = textOf(narrateActivity(loginTemplate.diagram));

    expect(text).toContain('Luego, se toma una decisión:');
    expect(text).toContain('Si [credenciales válidas]:');
    expect(text).toContain('Si [credenciales inválidas]:');
    expect(text).toContain('Después vuelve a «Ingresar usuario y contraseña».');
  });

  it('Dado el pedido online, Entonces dice quién hace cada paso según el carril', () => {
    const text = textOf(narrateActivity(onlineOrderTemplate.diagram)).join('\n');

    expect(text).toContain('en «Cliente», se ejecuta «Seleccionar productos»');
    expect(text).toContain('en «Sistema», se ejecuta «Verificar stock»');
    expect(text).toContain('en «Bodega», se ejecuta «Preparar paquete»');
    expect(text).toContain('En «Cliente», se ejecuta «Ver aviso de falta de stock»');
  });

  it('Dada la incorporación, Entonces narra el paralelismo, cada rama y la reunión en el join', () => {
    const lines = narrateActivity(parallelOnboardingTemplate.diagram);
    const text = textOf(lines);

    expect(text).toContain('Luego, el flujo se divide: 4 tareas ocurren en paralelo.');
    expect(text.filter((line) => line.startsWith('Rama '))).toHaveLength(4);
    expect(text).toContain('Cuando terminan las ramas que llegan al join, el proceso continúa.');
    expect(text.at(-1)).toBe('Luego, el proceso termina.');
    expect(lines.find((line) => line.text.startsWith('Rama 1'))?.depth).toBe(1);
  });

  it('Dada la aprobación, Entonces narra señales, objetos y la espera independiente del aprobador', () => {
    const text = textOf(narrateActivity(documentApprovalTemplate.diagram)).join('\n');

    expect(text).toContain('se genera el objeto «Documento [borrador]»');
    expect(text).toContain('se envía la señal «Solicitar aprobación»');
    expect(text).toContain('Además, de forma independiente, en «Aprobador» se espera el evento «Solicitud recibida»');
  });

  it('Cada paso señala los elementos que describe, para poder resaltarlos', () => {
    const lines = narrateActivity(loginTemplate.diagram);
    const step = lines.find((line) => line.text.includes('«Validar credenciales»'));

    expect(step?.nodeIds).toHaveLength(1);
    expect(step?.edgeIds).toHaveLength(1);
  });

  it('Es determinista: el mismo diagrama produce la misma narración', () => {
    expect(narrateActivity(documentApprovalTemplate.diagram)).toEqual(narrateActivity(documentApprovalTemplate.diagram));
  });
});
