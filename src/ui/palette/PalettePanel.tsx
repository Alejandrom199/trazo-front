import { Panel } from '@/ui/layout/Panel';

/** Paleta de artefactos. En la Fase 1 se llena desde el catálogo del módulo activo. */
export function PalettePanel() {
  return (
    <Panel className="flex w-60 flex-col">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Artefactos</h2>
      </header>
      <div className="p-4 text-sm leading-relaxed text-ink-600">
        Aquí aparecerán los artefactos del diagrama agrupados por categoría, listos para
        arrastrar al lienzo.
      </div>
    </Panel>
  );
}
