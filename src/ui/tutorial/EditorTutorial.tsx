import { useEffect, useRef, useState } from 'react';
import { validateDiagram } from '@/core/model';
import { useActiveModule } from '@/canvas/useActiveModule';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useUiStore } from '@/ui/uiStore';
import { TUTORIAL_STEPS, tutorialStepDone, type TutorialSnapshot } from './tutorial';

function snapshotOf(nodeCount: number, edgeCount: number, labelSignature: string, issueCount: number, inspectorTab: string | null, exportOnStep: number | null): TutorialSnapshot {
  return { nodeCount, edgeCount, labelSignature, issueCount, inspectorTab, exportOnStep };
}

/** Recorrido corto sobre el diagrama abierto. Se puede saltar y volver a empezar. */
export function EditorTutorial() {
  const status = useUiStore((state) => state.tutorialStatus);
  const step = useUiStore((state) => state.tutorialStep);
  const exportOnStep = useUiStore((state) => state.tutorialExportOnStep);
  const inspectorTab = useUiStore((state) => state.inspectorTab);
  const galleryOpen = useUiStore((state) => state.galleryOpen);
  const diagram = useDiagramStore((state) => state.diagram);
  const module = useActiveModule();
  const [start, setStart] = useState<(TutorialSnapshot & { step: number }) | null>(null);
  const seenLabels = useRef<Map<string, string>>(new Map());

  const labelSignature = diagram?.nodes.map((node) => `${node.id}:${node.label}`).join('|') ?? '';
  const issueCount = diagram && module ? validateDiagram(diagram, module.rules).length : 0;

  useEffect(() => {
    seenLabels.current = new Map();
  }, [status, step]);

  useEffect(() => {
    if (status !== 'active' || step !== 1 || !diagram) return;
    let renamed = false;
    for (const node of diagram.nodes) {
      const previous = seenLabels.current.get(node.id);
      if (previous !== undefined && previous !== node.label) renamed = true;
      seenLabels.current.set(node.id, node.label);
    }
    if (renamed) useUiStore.getState().setTutorialStep(step + 1);
  }, [diagram, status, step]);

  useEffect(() => {
    if (status !== 'active' || !diagram) return;
    setStart({ ...snapshotOf(diagram.nodes.length, diagram.edges.length, labelSignature, issueCount, inspectorTab, exportOnStep), step });
    // El punto de partida se toma al entrar en el paso, no en cada cambio del diagrama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, step]);

  useEffect(() => {
    if (status !== 'active' || !start || !diagram) return;
    const now = snapshotOf(diagram.nodes.length, diagram.edges.length, labelSignature, issueCount, inspectorTab, exportOnStep);
    if (start.step !== step || !tutorialStepDone(step, start, now)) return;
    if (step >= TUTORIAL_STEPS.length - 1) useUiStore.getState().finishTutorial();
    else useUiStore.getState().setTutorialStep(step + 1);
  }, [diagram, exportOnStep, inspectorTab, issueCount, labelSignature, start, status, step]);

  if (galleryOpen || status === 'dismissed') return null;

  if (status === 'offer') {
    return (
      <aside className="pointer-events-auto absolute bottom-20 left-3 z-30 w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-line bg-surface p-4 shadow-panel">
        <p className="text-sm font-semibold text-ink-900">Recorrido de cinco minutos</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">Aprende lo básico sobre este diagrama: dibujar, nombrar, conectar, corregir, narrar y exportar.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => useUiStore.getState().startTutorial()} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">Empezar</button>
          <button type="button" onClick={() => useUiStore.getState().skipTutorial()} className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-raised">Ahora no</button>
        </div>
      </aside>
    );
  }

  if (status === 'done') {
    return (
      <aside className="pointer-events-auto absolute bottom-20 left-3 z-30 rounded-xl border border-line bg-surface px-4 py-3 shadow-panel">
        <p className="text-sm text-ink-900">Recorrido terminado.</p>
        <button type="button" onClick={() => useUiStore.getState().restartTutorial()} className="mt-1 text-sm font-medium text-accent hover:underline">Reiniciar</button>
      </aside>
    );
  }

  const current = TUTORIAL_STEPS[step];
  if (!current) return null;
  return (
    <aside className="pointer-events-auto absolute bottom-20 left-3 z-30 w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-line bg-surface p-4 shadow-panel" aria-live="polite">
      <p className="text-[11px] font-medium text-ink-400">Paso {step + 1} de {TUTORIAL_STEPS.length}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{current.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{current.body}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => useUiStore.getState().skipTutorial()} className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-raised">Saltar</button>
        <button type="button" onClick={() => useUiStore.getState().restartTutorial()} className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-raised">Reiniciar</button>
      </div>
    </aside>
  );
}
