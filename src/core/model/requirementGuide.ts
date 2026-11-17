import type { Requirement, RequirementKind } from './requirements';

/**
 * Cómo se declara bien un requisito: una guía por tipo (estructura, consejos y
 * un ejemplo completo) y un revisor de calidad que la aplica al texto escrito.
 * Basado en las buenas prácticas de redacción de requisitos (IEEE 29148):
 * cada uno debe ser necesario, sin ambigüedad, verificable y singular.
 */

export interface RequirementGuide {
  /** Cómo se escribe el enunciado. */
  pattern: string;
  textPlaceholder: string;
  detailsLabel: string;
  detailsPlaceholder: string;
  /** Categorías habituales para este tipo (sugerencias; se puede escribir otra). */
  categories: string[];
  tips: string[];
  example: { title: string; text: string; category: string; details: string[] };
}

export const REQUIREMENT_GUIDES: Record<RequirementKind, RequirementGuide> = {
  funcional: {
    pattern: 'El sistema deberá / permitirá a [actor] [acción] [objeto] [condición].',
    textPlaceholder: 'El sistema permitirá a un administrador registrar un nuevo veterinario.',
    detailsLabel: 'Detalles y restricciones',
    detailsPlaceholder: 'El sistema deberá solicitar el nombre completo, la especialidad y el correo.',
    categories: ['Administración', 'Gestión', 'Consulta', 'Reportes', 'Seguridad', 'Integración', 'Notificaciones'],
    tips: [
      'El título es una acción en infinitivo: «Registrar nuevo veterinario».',
      'El texto nombra al actor y lo que el sistema le permite hacer.',
      'Un requisito, una capacidad: si hay dos «y» con dos verbos, son dos requisitos.',
      'Los detalles son los criterios para darlo por cumplido: datos obligatorios, validaciones, resultado.',
    ],
    example: {
      title: 'Registrar nuevo veterinario',
      text: 'El sistema permitirá a un administrador registrar un nuevo veterinario en la base de datos.',
      category: 'Administración',
      details: [
        'El sistema deberá solicitar como obligatorios el nombre completo, la especialidad y el correo electrónico.',
        'El sistema deberá permitir registrar opcionalmente el número de teléfono.',
        'El sistema deberá validar el formato del correo electrónico.',
        'Una vez registrado, el sistema deberá generar un identificador único para el veterinario.',
      ],
    },
  },
  'no funcional': {
    pattern: 'El sistema deberá [cualidad] [medida verificable] [bajo qué condición].',
    textPlaceholder: 'El sistema deberá responder a las consultas de mascotas en un máximo de 2 segundos.',
    detailsLabel: 'Detalles y restricciones (con medidas)',
    detailsPlaceholder: 'Las operaciones de guardado no deben superar los 3 segundos.',
    categories: ['Rendimiento', 'Seguridad', 'Usabilidad', 'Disponibilidad', 'Fiabilidad', 'Mantenibilidad', 'Compatibilidad', 'Escalabilidad'],
    tips: [
      'Un no funcional dice CÓMO debe ser el sistema, no QUÉ hace.',
      'Siempre con una medida: segundos, %, usuarios simultáneos, horas al mes.',
      'Di bajo qué condición se mide: «bajo carga normal (50 usuarios)».',
      'Evita palabras que no se pueden medir: rápido, fácil, intuitivo, seguro.',
    ],
    example: {
      title: 'Rendimiento del sistema',
      text: 'El sistema deberá responder a las solicitudes de consulta de mascotas en un tiempo máximo de 2 segundos.',
      category: 'Rendimiento',
      details: [
        'Las operaciones de búsqueda, visualización y listado deben ejecutarse en un máximo de 2 segundos.',
        'Las operaciones de guardado, actualización o eliminación no deben superar los 3 segundos.',
        'Los tiempos se miden con 50 usuarios simultáneos.',
      ],
    },
  },
  'regla de negocio': {
    pattern: '[Quién o qué] [debe / no puede / solo puede] [condición], [con qué medida].',
    textPlaceholder: 'Un socio no puede tener más de 3 préstamos activos al mismo tiempo.',
    detailsLabel: 'Detalles',
    detailsPlaceholder: 'Los préstamos vencidos también cuentan como activos.',
    categories: [],
    tips: [
      'Una regla es del negocio, no del sistema: existiría aunque no hubiera software.',
      'Escríbela con un verbo de obligación: debe, no puede, solo puede, siempre, nunca.',
      'Anota la fuente (política, ley, contrato): es a quien preguntar cuando cambie.',
      'Los ejemplos Dado / Entonces prueban que se entendió y se vuelven casos de prueba.',
      'Si tiene excepciones, escríbelas: «salvo los docentes, que pueden tener 5».',
    ],
    example: {
      title: 'Límite de préstamos activos',
      text: 'Un socio no puede tener más de 3 préstamos activos al mismo tiempo.',
      category: '',
      details: ['Un préstamo vencido y no devuelto también cuenta como activo.'],
    },
  },
};

/** Un consejo del revisor: 'warning' si el requisito no es verificable así; 'tip' si se puede mejorar. */
export interface QualityHint {
  level: 'warning' | 'tip';
  text: string;
}

/** Palabras que suenan bien pero no se pueden verificar. */
const VAGUE_WORDS = [
  'rápido', 'rápida', 'rápidamente', 'fácil', 'fácilmente', 'amigable', 'intuitivo', 'intuitiva', 'eficiente', 'eficientemente',
  'adecuado', 'adecuada', 'suficiente', 'flexible', 'robusto', 'robusta', 'moderno', 'moderna', 'mejor', 'óptimo', 'óptima',
  'user-friendly', 'aceptable', 'razonable', 'etc', 'entre otros', 'lo antes posible', 'normalmente', 'generalmente',
];
// Límites de palabra Unicode: el \b de JavaScript no entiende «á», y «permitirá» no cerraría.
const OBLIGATION = /(^|[^\p{L}])(deber[áa]n?|deben?|permitir[áa]n?|tendr[áa]n?|ser[áa]n?|no pueden?|s[óo]lo pueden?|nunca|siempre|obligatori[oa]s?)(?=[^\p{L}]|$)/iu;

const words = (text: string) => text.toLowerCase().normalize('NFC');

/** Palabras vagas presentes en un texto, sin repetir. */
export function vagueWordsIn(text: string): string[] {
  const lower = words(text);
  return VAGUE_WORDS.filter((word) => new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'u').test(lower));
}

/**
 * Revisa un requisito según su tipo y devuelve consejos concretos. No impide
 * guardar: guía. Las advertencias marcan lo que no se podría verificar.
 */
export function reviewRequirement(requirement: Requirement): QualityHint[] {
  const hints: QualityHint[] = [];
  const text = requirement.description.trim();
  const all = [text, ...requirement.details].join(' ');
  const warn = (message: string) => hints.push({ level: 'warning', text: message });
  const tip = (message: string) => hints.push({ level: 'tip', text: message });

  if (!text) {
    warn('Falta el texto: el enunciado completo del requisito.');
  } else {
    if (!OBLIGATION.test(text)) warn('Escríbelo como obligación: «deberá», «permitirá», «no puede», «solo puede».');
    if (requirement.kind === 'funcional' && !/\bsistema\b/i.test(text)) tip('Nombra al sistema y al actor: «El sistema permitirá a [actor]…».');
    if (/\by\b.*\by\b/i.test(text) && text.split(/[.;]/).filter(Boolean).length > 1) tip('Parece que hay más de un requisito en el texto: sepáralos si se pueden cumplir por separado.');
  }
  const vague = vagueWordsIn(all);
  if (vague.length > 0) warn(`«${vague.join('», «')}» no se puede verificar: cámbialo por algo medible.`);

  if (requirement.kind === 'no funcional' && text && !/\d/.test(all)) warn('Un requisito no funcional necesita una medida (segundos, %, usuarios, horas).');
  if (requirement.kind !== 'regla de negocio' && requirement.details.length === 0) tip(`Agrega ${REQUIREMENT_GUIDES[requirement.kind].detailsLabel.toLowerCase()}: son los criterios para darlo por cumplido.`);
  if (!requirement.category.trim() && requirement.kind !== 'regla de negocio') tip('Elige una categoría (p. ej. «Administración», «Rendimiento») para agruparlo.');

  if (requirement.kind === 'regla de negocio') {
    if (!requirement.rule.source.trim()) warn('Anota la fuente de la regla: quién la dicta y a quién preguntar si cambia.');
    if (requirement.rule.examples.length === 0) warn('Agrega al menos un ejemplo Dado / Entonces: prueba que la regla se entendió.');
    else if (requirement.rule.examples.some((example) => !example.given.trim() || !example.then.trim())) tip('Completa cada ejemplo: la situación (Dado) y el resultado (Entonces).');
  }
  if (requirement.kind === 'funcional' && requirement.title && !/^\p{L}+(ar|er|ir)(se)?\b/iu.test(requirement.title.trim().normalize('NFD').replace(/\p{M}/gu, ''))) {
    tip('El título de un funcional suele ser una acción en infinitivo: «Registrar…», «Consultar…».');
  }
  return hints;
}

/** Puntaje simple para mostrar el estado: sin advertencias es «listo». */
export function qualityLevel(hints: readonly QualityHint[]): 'listo' | 'mejorable' | 'incompleto' {
  if (hints.some((hint) => hint.level === 'warning')) return 'incompleto';
  return hints.length > 0 ? 'mejorable' : 'listo';
}
