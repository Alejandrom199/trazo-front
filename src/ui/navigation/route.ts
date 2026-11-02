import { useSyncExternalStore } from 'react';
import type { DiagramType } from '@/core/model';

/**
 * Navegación mínima por la parte "#" de la URL, sin librería de rutas:
 *   #/                     → editor
 *   #/aprender             → página Aprender (tarjetas de diagramas)
 *   #/aprender/activity    → guía de un tipo de diagrama
 *   #/aprender/flow-uml    → recorrido UML en ingeniería de software
 * Al vivir en la URL, los botones Atrás/Adelante del navegador funcionan solos.
 */
export type Route =
  | { page: 'editor' }
  | { page: 'learn' }
  | { page: 'learn-flow' }
  | { page: 'learn-diagram'; diagramType: DiagramType };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'aprender') return { page: 'editor' };
  if (parts[1] === 'flow-uml') return { page: 'learn-flow' };
  const diagramType = parts[1];
  return diagramType ? { page: 'learn-diagram', diagramType: diagramType as DiagramType } : { page: 'learn' };
}

export function routeToHash(route: Route): string {
  switch (route.page) {
    case 'editor':
      return '#/';
    case 'learn':
      return '#/aprender';
    case 'learn-flow':
      return '#/aprender/flow-uml';
    case 'learn-diagram':
      return `#/aprender/${route.diagramType}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

/** Ruta actual; el componente se vuelve a pintar cuando cambia el hash. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange);
      return () => window.removeEventListener('hashchange', onChange);
    },
    () => window.location.hash,
    () => '',
  );
  return parseRoute(hash);
}
