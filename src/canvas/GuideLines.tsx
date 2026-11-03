import { ViewportPortal } from '@xyflow/react';
import { create } from 'zustand';
import type { Guide } from './alignmentGuides';

/** Guías visibles mientras se arrastra un nodo (vacío el resto del tiempo). */
export const useGuidesStore = create<{ guides: Guide[]; setGuides: (guides: Guide[]) => void }>()((set) => ({
  guides: [],
  setGuides: (guides) => set((state) => (state.guides.length === 0 && guides.length === 0 ? state : { guides })),
}));

/** Dibuja las guías de alineación en coordenadas del lienzo. No salen al exportar. */
export function GuideLines() {
  const guides = useGuidesStore((state) => state.guides);
  if (guides.length === 0) return null;
  return (
    <ViewportPortal>
      <div data-export-ignore className="pointer-events-none">
        {guides.map((guide, index) => (
          <div
            key={index}
            className="absolute"
            style={
              guide.orientation === 'vertical'
                ? { left: guide.at, top: guide.from, height: guide.to - guide.from, borderLeft: '1px dashed var(--color-accent)', zIndex: 1001 }
                : { top: guide.at, left: guide.from, width: guide.to - guide.from, borderTop: '1px dashed var(--color-accent)', zIndex: 1001 }
            }
          />
        ))}
      </div>
    </ViewportPortal>
  );
}
