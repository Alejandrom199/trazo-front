import { describe, expect, it } from 'vitest';
import { qualityLevel, REQUIREMENT_GUIDES, reviewRequirement, vagueWordsIn } from './requirementGuide';
import { requirementDefaults, type Requirement } from './requirements';

const requirement = (patch: Partial<Requirement>): Requirement => ({ ...requirementDefaults(), id: 'r', code: 'RF-01', title: 'Registrar', kind: 'funcional', createdAt: '', ...patch });
const texts = (item: Requirement) => reviewRequirement(item).map((hint) => hint.text);

describe('revisor de calidad de requisitos', () => {
  it('Dado el ejemplo de cada guía completo, Entonces no tiene advertencias', () => {
    for (const kind of ['funcional', 'no funcional'] as const) {
      const { example } = REQUIREMENT_GUIDES[kind];
      const hints = reviewRequirement(requirement({ kind, title: example.title, description: example.text, category: example.category, details: example.details }));
      expect({ kind, warnings: hints.filter((hint) => hint.level === 'warning') }).toEqual({ kind, warnings: [] });
    }
  });

  it('Dado un texto sin verbo de obligación, Entonces pide escribirlo como obligación', () => {
    expect(texts(requirement({ description: 'Registro de veterinarios.' }))).toContain('Escríbelo como obligación: «deberá», «permitirá», «no puede», «solo puede».');
  });

  it('Dadas palabras que no se pueden medir, Entonces las señala', () => {
    expect(vagueWordsIn('El sistema deberá ser rápido e intuitivo, etc.')).toEqual(['rápido', 'intuitivo', 'etc']);
    expect(vagueWordsIn('Responde en 2 segundos')).toEqual([]);
  });

  it('Dado un no funcional sin medida, Entonces pide una medida', () => {
    const item = requirement({ kind: 'no funcional', description: 'El sistema deberá responder pronto a las consultas.', category: 'Rendimiento', details: ['Bajo carga normal.'] });
    expect(texts(item)).toContain('Un requisito no funcional necesita una medida (segundos, %, usuarios, horas).');
  });

  it('Dada una regla sin fuente ni ejemplos, Entonces está incompleta; con ambos, lista', () => {
    const rule = requirement({ kind: 'regla de negocio', code: 'RN-01', title: 'Límite de préstamos', description: 'Un socio no puede tener más de 3 préstamos activos.' });
    expect(qualityLevel(reviewRequirement(rule))).toBe('incompleto');
    const complete = { ...rule, rule: { ...rule.rule, source: 'Reglamento de la biblioteca', examples: [{ given: 'un socio con 3 préstamos', then: 'no puede pedir otro' }] } };
    expect(qualityLevel(reviewRequirement(complete))).toBe('listo');
  });
});
