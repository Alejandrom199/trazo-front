import { useSyncExternalStore } from 'react';

/** Pantallas angostas (móvil): menos de 768 px, el punto `md` de Tailwind. */
export const NARROW_QUERY = '(max-width: 767px)';

/** Si la consulta de medios se cumple ahora; se actualiza al girar o redimensionar. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
