import { useSyncExternalStore } from 'react';
import { isSpecLessonId, type DiagramType, type SpecLessonId } from '@/core/model';

/**
 * Navegación mínima por la parte "#" de la URL, sin librería de rutas:
 *   #/                     → editor
 *   #/aprender             → página Aprender (tarjetas de diagramas)
 *   #/aprender/activity    → guía de un tipo de diagrama
 *   #/aprender/flow-uml    → recorrido UML en ingeniería de software
 *   #/aprender/especificar[/parte] → lección de requisitos y casos de uso (en una parte)
 * Al vivir en la URL, los botones Atrás/Adelante del navegador funcionan solos.
 */
export type Route =
  | { page: 'editor' }
  | { page: 'learn' }
  | { page: 'learn-flow' }
  | { page: 'learn-spec'; section: SpecLessonId | null }
  | { page: 'learn-diagram'; diagramType: DiagramType };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'aprender') return { page: 'editor' };
  if (parts[1] === 'flow-uml') return { page: 'learn-flow' };
  if (parts[1] === 'especificar') return { page: 'learn-spec', section: isSpecLessonId(parts[2]) ? parts[2] : null };
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
    case 'learn-spec':
      return route.section ? `#/aprender/especificar/${route.section}` : '#/aprender/especificar';
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
