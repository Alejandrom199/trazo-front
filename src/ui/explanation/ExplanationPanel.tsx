import { Panel } from '@/ui/layout/Panel';

/** Panel de explicación. En la Fase 2 muestra la ArtifactDefinition del elemento seleccionado. */
export function ExplanationPanel() {
  return (
    <Panel className="flex w-80 flex-col">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Explicación</h2>
      </header>
      <div className="p-4 text-sm leading-relaxed text-ink-600">
        Selecciona un elemento del lienzo para ver qué es, para qué sirve y por qué existe.
      </div>
    </Panel>
  );
}
