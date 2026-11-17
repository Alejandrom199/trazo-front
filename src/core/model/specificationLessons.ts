import type { RequirementKind } from './requirements';

/**
 * Contenido de la lección «Requisitos y casos de uso» de Aprender. Es dato (no
 * texto metido en la interfaz) para que la lección, los enlaces del editor y
 * los ejercicios lean de una sola fuente. Las guías por tipo de requisito
 * (patrón, consejos, ejemplo) están en requirementGuide; la de la ficha de
 * caso de uso, en diagrams/usecase/specGuide.
 */

/** Las partes de la lección; cada una tiene su ancla en la página. */
export const SPEC_LESSONS = [
  { id: 'requisitos', title: 'Qué es un buen requisito' },
  { id: 'funcional', title: 'Requisito funcional' },
  { id: 'no-funcional', title: 'Requisito no funcional' },
  { id: 'regla-de-negocio', title: 'Regla de negocio' },
  { id: 'revisor', title: 'Prueba el revisor' },
  { id: 'caso-de-uso', title: 'Ficha de caso de uso' },
  { id: 'casos-de-prueba', title: 'Casos de prueba' },
  { id: 'trazabilidad', title: 'Cómo se conecta todo' },
  { id: 'ejercicios', title: 'Ejercicios' },
] as const;

export type SpecLessonId = (typeof SPEC_LESSONS)[number]['id'];

export const isSpecLessonId = (value: unknown): value is SpecLessonId => SPEC_LESSONS.some((lesson) => lesson.id === value);

/** La parte de la lección que explica cada tipo de requisito. */
export const LESSON_OF_KIND: Record<RequirementKind, SpecLessonId> = {
  funcional: 'funcional',
  'no funcional': 'no-funcional',
  'regla de negocio': 'regla-de-negocio',
};

/** Cualidades de un requisito bien escrito (IEEE 29148, resumidas). */
export const REQUIREMENT_QUALITIES = [
  { name: 'Necesario', text: 'Si se quita, falta algo que alguien pidió. Si nadie lo echaría de menos, sobra.' },
  { name: 'Sin ambigüedad', text: 'Dos personas lo leen y entienden lo mismo. Nada de «rápido», «fácil» o «etc.».' },
  { name: 'Verificable', text: 'Se puede comprobar si se cumple: con una prueba, una medida o una inspección.' },
  { name: 'Singular', text: 'Pide una sola cosa. Si tiene dos verbos unidos por «y», suelen ser dos requisitos.' },
] as const;

/** Qué distingue a cada tipo, en una frase y con la pregunta que responde. */
export const REQUIREMENT_KIND_SUMMARY: Record<RequirementKind, { question: string; text: string }> = {
  funcional: { question: '¿Qué debe hacer el sistema?', text: 'Una capacidad que el sistema le da a alguien.' },
  'no funcional': { question: '¿Cómo debe ser el sistema?', text: 'Una cualidad medible: rendimiento, seguridad, disponibilidad…' },
  'regla de negocio': { question: '¿Qué manda el negocio?', text: 'Una política que existiría aunque no hubiera software.' },
};

/** Un mismo requisito mal y bien escrito, con lo que se corrigió. */
export interface RewriteExample {
  bad: string;
  problems: string[];
  good: string;
}

export const REWRITE_EXAMPLES: Record<RequirementKind, RewriteExample> = {
  funcional: {
    bad: 'El sistema debe ser fácil para registrar veterinarios y sacar reportes.',
    problems: ['«Fácil» no se puede verificar.', 'Pide dos cosas: registrar y sacar reportes.', 'No dice quién lo hace.'],
    good: 'El sistema permitirá a un administrador registrar un nuevo veterinario.',
  },
  'no funcional': {
    bad: 'El sistema debe ser rápido.',
    problems: ['«Rápido» no tiene medida.', 'No dice qué operación ni en qué condiciones.'],
    good: 'El sistema deberá responder a las consultas de mascotas en un máximo de 2 segundos con 50 usuarios simultáneos.',
  },
  'regla de negocio': {
    bad: 'El sistema validará que el socio no tenga muchos préstamos.',
    problems: ['Habla del sistema: la regla es del negocio, el sistema solo la aplica.', '«Muchos» no es un límite.'],
    good: 'Un socio no puede tener más de 3 préstamos activos al mismo tiempo.',
  },
};

/** Cómo se escribe un caso de prueba. */
export const TEST_CASE_GUIDE = {
  intro: 'Un caso de prueba comprueba un camino concreto del proceso. Se escribe en tres partes, para que cualquiera lo pueda ejecutar y decir si pasa o falla.',
  parts: [
    { name: 'Dado', text: 'La situación de partida: quién es el usuario y qué datos hay. Sale de las precondiciones de la ficha del caso de uso.' },
    { name: 'Cuando', text: 'Lo que ocurre: las acciones y las decisiones del camino. Trazo lo escribe solo a partir del recorrido.' },
    { name: 'Entonces', text: 'El resultado que se puede observar. Sale de las postcondiciones. «Funciona» no sirve: di qué se ve o qué queda guardado.' },
  ],
  example: {
    code: 'CP-02',
    title: 'Libro sin ejemplares libres: se ofrece la reserva',
    given: 'El socio inició sesión y todos los ejemplares del libro están prestados.',
    when: 'Validar disponibilidad → no disponible',
    then: 'No se registra el préstamo: el sistema informa que no hay ejemplares y el socio puede reservar el libro.',
    verifies: 'RF-03, RN-01',
  },
  coverage: 'Cada decisión de un diagrama de actividades abre caminos. Si todas sus salidas tienen al menos un caso de prueba, las ramas están cubiertas. En el editor, Narración → Escenarios lista los caminos, los guarda como casos y te muestra las ramas que faltan.',
  tips: [
    'Un caso, un camino. Si el Entonces dice «y además…», probablemente son dos casos.',
    'Prueba también los caminos alternos: casi todos los errores están ahí.',
    'Vincula cada caso con el requisito que verifica: así se sabe qué requisito ya está probado.',
  ],
} as const;

/** La cadena de trazabilidad: de lo que se pide a lo que se prueba. */
export const TRACE_CHAIN = [
  { name: 'Requisito', example: 'RF-01 Pedir un libro prestado', text: 'Qué se pidió.' },
  { name: 'Caso de uso', example: 'CU02 Pedir un préstamo', text: 'Quién lo hace y con qué meta. Su ficha cita el requisito en Referencias.' },
  { name: 'Diagrama de actividades', example: '«Pedir un préstamo»', text: 'Cómo ocurre paso a paso, con sus decisiones y subprocesos.' },
  { name: 'Caso de prueba', example: 'CP-01 Préstamo con ejemplar libre', text: 'Un camino de ese proceso que demuestra que el requisito se cumple.' },
] as const;

/** Una pregunta de práctica, con la explicación de cada respuesta. */
export interface SpecExercise {
  id: string;
  prompt: string;
  options: { id: string; label: string; explanation: string; correct: boolean }[];
}

export const SPEC_EXERCISES: SpecExercise[] = [
  {
    id: 'vague',
    prompt: '«El sistema deberá ser intuitivo y rápido.» ¿Qué le falta para ser un buen requisito no funcional?',
    options: [
      { id: 'measure', label: 'Una medida que se pueda comprobar', correct: true, explanation: 'Exacto: «intuitivo» y «rápido» no se miden. Por ejemplo: «responder en menos de 2 s» o «un usuario nuevo registra una mascota sin ayuda en menos de 3 minutos».' },
      { id: 'actor', label: 'Decir qué actor lo usa', correct: false, explanation: 'Un no funcional no necesita actor: describe una cualidad del sistema. Le falta la medida.' },
      { id: 'ok', label: 'Nada, está bien escrito', correct: false, explanation: 'No se puede verificar: dos personas no se pondrían de acuerdo sobre si es «rápido».' },
    ],
  },
  {
    id: 'singular',
    prompt: '«El sistema permitirá al bibliotecario registrar libros y generar reportes de multas.» ¿Qué harías?',
    options: [
      { id: 'split', label: 'Separarlo en dos requisitos', correct: true, explanation: 'Sí: son dos capacidades distintas, que se priorizan, se prueban y se entregan por separado.' },
      { id: 'nfr', label: 'Pasarlo a no funcional', correct: false, explanation: 'Describe lo que el sistema hace, así que es funcional. El problema es que pide dos cosas.' },
      { id: 'keep', label: 'Dejarlo así, es más corto', correct: false, explanation: 'Si una parte se cumple y la otra no, ¿el requisito está cumplido? Por eso conviene que sea singular.' },
    ],
  },
  {
    id: 'rule',
    prompt: '«La multa es de $500 por cada día de atraso.» ¿Qué es?',
    options: [
      { id: 'rule', label: 'Una regla de negocio de cálculo', correct: true, explanation: 'Correcto: la biblioteca la decide aunque no haya sistema, y dice cómo se obtiene un valor. El sistema solo la aplica.' },
      { id: 'fr', label: 'Un requisito funcional', correct: false, explanation: 'El funcional sería «El sistema deberá calcular la multa al registrar la devolución»; el monto es una regla del negocio.' },
      { id: 'nfr', label: 'Un requisito no funcional', correct: false, explanation: 'No describe una cualidad del sistema (rendimiento, seguridad…), sino una política del negocio.' },
    ],
  },
  {
    id: 'usecase-steps',
    prompt: 'Curso típico de una ficha esencial: «1. El sistema muestra el formulario. 2. El usuario hace clic en el botón azul Guardar.» ¿Qué está mal?',
    options: [
      { id: 'both', label: 'Empieza por el sistema y habla de botones', correct: true, explanation: 'El caso lo inicia el actor («Selecciona registrar mascota»), y una ficha esencial dice qué pasa, no cómo se ve: sin colores ni botones.' },
      { id: 'short', label: 'Tiene pocos pasos', correct: false, explanation: 'Dos pasos pueden bastar si cuentan el caso. El problema es quién empieza y el detalle de pantalla.' },
      { id: 'none', label: 'Nada', correct: false, explanation: 'Fíjate en quién empieza y en «botón azul»: eso es interfaz, no el caso de uso.' },
    ],
  },
  {
    id: 'test-then',
    prompt: 'Caso de prueba — Cuando: se presta un libro. Entonces: «funciona correctamente». ¿Qué le falta?',
    options: [
      { id: 'observable', label: 'Un resultado que se pueda observar', correct: true, explanation: 'Sí: por ejemplo «el préstamo queda registrado con fecha de devolución a 15 días y el ejemplar figura como prestado».' },
      { id: 'more-steps', label: 'Más pasos en Cuando', correct: false, explanation: 'Cuando puede ser corto. Lo que no se puede comprobar es «funciona correctamente».' },
      { id: 'priority', label: 'Una prioridad', correct: false, explanation: 'La prioridad ayuda a ordenar, pero el caso sigue sin decir qué se espera ver.' },
    ],
  },
];
