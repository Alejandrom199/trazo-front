import { ActivityArtifact as A } from '../artifactTypes';
import { defineRule } from './defineRule';
import { nodesOfType } from './flowGraph';

/** Regla: toda acción tiene nombre. */
export const actionUnnamed = defineRule(
  {
    id: 'activity.action-unnamed',
    severity: 'warning',
    title: 'Acción sin nombre',
    explanation: 'Una acción sin nombre no dice qué se hace en ese paso: el diagrama deja de explicar el proceso.',
  },
  (graph) =>
    nodesOfType(graph, A.action)
      .filter((action) => !action.label.trim())
      .map((action) => ({
        message: 'Hay una acción sin nombre.',
        suggestion: 'Haz doble clic y nómbrala con un verbo y un complemento, p. ej. «Validar datos».',
        nodeIds: [action.id],
      })),
);

/**
 * ¿La primera palabra parece un verbo en infinitivo? Heurística para el español:
 * termina en -ar/-er/-ir, opcionalmente con un pronombre pegado ("Registrarse",
 * "Enviarlo"). Puede dar por buenos sustantivos como "lugar"; por eso la regla es solo informativa.
 */
export function startsWithInfinitive(label: string): boolean {
  const firstWord = label.trim().split(/\s+/)[0] ?? '';
  const plain = firstWord.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /^[a-zñ]+(ar|er|ir)(se|lo|la|los|las|le|les|me|te|nos)?$/.test(plain);
}

/** Regla (informativa): las acciones se nombran con un verbo en infinitivo. */
export const actionNotVerb = defineRule(
  {
    id: 'activity.action-not-verb',
    severity: 'info',
    title: 'Acción que no empieza con verbo',
    explanation:
      'Una acción es algo que se HACE. Nombrarla con un verbo en infinitivo ("Emitir factura") la distingue de un objeto ("Factura") y se lee como una instrucción.',
  },
  (graph) =>
    nodesOfType(graph, A.action)
      .filter((action) => action.label.trim() && !startsWithInfinitive(action.label))
      .map((action) => ({
        message: `«${action.label.trim()}» no empieza con un verbo en infinitivo.`,
        suggestion: 'Reescríbela como verbo + complemento, p. ej. «Registrar pedido».',
        nodeIds: [action.id],
      })),
);
