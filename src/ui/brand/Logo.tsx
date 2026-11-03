/**
 * Logo de Trazo Diagram: un nodo de inicio y un trazo ortogonal que termina en
 * flecha (el «trazo» de un flujo). Es el mismo dibujo que public/favicon.svg;
 * aquí el fondo usa el color de marca del tema.
 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Trazo Diagram">
      <rect width="32" height="32" rx="8" style={{ fill: 'var(--color-brand)' }} />
      <circle cx="10" cy="10" r="3.4" fill="#fff" />
      <path d="M14 10h5a3 3 0 0 1 3 3v9" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M17.5 18.5 22 23l4.5-4.5" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
