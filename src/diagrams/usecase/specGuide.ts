import type { UseCaseContext, UseCaseSpec } from './spec';

/**
 * Cómo se escribe la ficha de un caso de uso: qué va en cada campo y un ejemplo
 * completo. Lo usan la lección de Aprender y, como recordatorio, el editor.
 */

export const USE_CASE_SHEET_FIELDS = [
  { field: 'Caso de uso', text: 'El nombre del óvalo, con verbo en infinitivo («Registrar mascota»), y su código (CU01).' },
  { field: 'Actores', text: 'Quién lo inicia y quién participa. En Trazo se leen del diagrama: no se escriben dos veces.' },
  { field: 'Propósito', text: 'Para qué lo hace el actor, en una frase. Es la meta, no los pasos.' },
  { field: 'Tipo', text: 'Primario si es la razón de ser del sistema; secundario, de apoyo. Esencial si cuenta qué pasa sin pantallas; real, si nombra pantallas y botones.' },
  { field: 'Resumen', text: 'Una o dos frases con el caso completo, de principio a fin.' },
  { field: 'Precondiciones', text: 'Lo que debe ser cierto antes de empezar («El usuario inició sesión»). Se vuelven el Dado de las pruebas.' },
  { field: 'Postcondiciones', text: 'Cómo queda el sistema cuando el caso termina bien («La mascota queda guardada»). Se vuelven el Entonces.' },
  { field: 'Referencias', text: 'Los requisitos que cumple (RF-1). Es el puente entre lo que se pidió y lo que se diseña.' },
  { field: 'Curso típico de eventos', text: 'El camino feliz en dos columnas: lo que hace el actor y lo que responde el sistema, numerado y en presente.' },
  { field: 'Curso alterno de eventos', text: 'Qué pasa si algo falla, indicando en qué paso del curso típico: «4. Si falta un campo obligatorio, muestra "Campo requerido"».' },
] as const;

export const USE_CASE_SHEET_TIPS = [
  'El curso típico empieza con el actor: el sistema responde a algo.',
  'Un paso, una acción. «Ingresa los datos y guarda» son dos pasos.',
  'Escribe en presente y sin detalles de pantalla en una ficha esencial: «Ingresa los datos», no «Escribe en el cuadro azul».',
  'Cada curso alterno nombra el paso donde se desvía y cómo termina: vuelve al curso típico o termina el caso.',
] as const;

/** Ficha de ejemplo, completa, para mostrar cómo queda. */
export const USE_CASE_SHEET_EXAMPLE: { name: string; context: UseCaseContext; references: string[]; spec: UseCaseSpec } = {
  name: 'Registrar mascota',
  context: { actors: ['Recepcionista'], includes: ['Buscar cliente'], extendedBy: [], extends: [] },
  references: ['RF-1'],
  spec: {
    code: 'CU01',
    purpose: 'Registrar los datos de una nueva mascota asociada a un cliente.',
    importance: 'primario',
    level: 'esencial',
    summary: 'El recepcionista ingresa los datos de una mascota nueva y el sistema la deja registrada a nombre de su cliente.',
    preconditions: ['El recepcionista inició sesión.', 'El cliente ya está registrado.'],
    postconditions: ['La mascota queda guardada y asociada a su cliente.'],
    typicalCourse: [
      { by: 'actor', text: 'Selecciona «Registrar mascota».' },
      { by: 'system', text: 'Muestra el formulario de la mascota.' },
      { by: 'actor', text: 'Busca al cliente e ingresa nombre, especie, raza y fecha de nacimiento.' },
      { by: 'system', text: 'Valida los datos obligatorios.' },
      { by: 'system', text: 'Guarda la mascota y confirma el registro.' },
    ],
    alternateCourses: [
      { step: 4, text: 'Si falta un dato obligatorio, muestra «Campo requerido» y vuelve al paso 3.' },
      { step: 3, text: 'Si el cliente no existe, ofrece registrarlo antes de seguir.' },
    ],
  },
};
