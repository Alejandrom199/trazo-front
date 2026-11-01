import { useEffect, useRef } from 'react';
import { diagramRegistry } from '@/core/registry';
import type { Route } from '@/ui/navigation/route';
import { DiagramGuidePage } from './DiagramGuidePage';
import { LearnHome } from './LearnHome';

/**
 * Página Aprender. Se superpone al editor (que sigue montado debajo), así al
 * volver se conserva la vista del lienzo tal como estaba.
 */
export function LearnPage({ route }: { route: Exclude<Route, { page: 'editor' }> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const module = route.page === 'learn-diagram' && diagramRegistry.has(route.diagramType) ? diagramRegistry.get(route.diagramType) : null;

  // Cada página empieza arriba.
  const pageKey = route.page === 'learn-diagram' ? route.diagramType : 'inicio';
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pageKey]);

  return (
    <div ref={scrollRef} className="absolute inset-0 z-30 overflow-y-auto bg-canvas">
      {module ? <DiagramGuidePage module={module} scrollRoot={scrollRef} /> : <LearnHome />}
    </div>
  );
}
