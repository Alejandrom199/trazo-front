/**
 * Respuesta de un módulo cuando el usuario intenta unir dos nodos.
 * Es una "discriminated union": el campo `allowed` decide qué otros campos existen,
 * así el compilador impide leer `edgeType` de una conexión rechazada.
 */
export type ConnectionResult =
  | { allowed: true; edgeType: string }
  | { allowed: false; reason: string };
