import { faArrowTurnUp, faBackwardStep, faChevronRight, faForwardFast, faForwardStep, faRightToBracket, faRotateLeft, faRoute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef } from 'react';
import { nodeName, type Diagram, type WalkEntry, type WalkState, type WalkthroughEngine } from '@/core/model';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useHighlightStore } from '@/canvas/highlightStore';
import { createFromLinkedTemplate, findTemplate } from '@/ui/projects/diagramLinkActions';
import { openSavedDiagram } from '@/ui/projects/projectActions';
import { useWalkthroughStore, type WalkFrame } from './walkthroughStore';

export const WALK_PREFIX = 'walk:';

/** Tope de pasos de «Hasta decidir», por si un bucle no tiene decisión. */
const MAX_AUTO_STEPS = 200;

const TONE_STYLE: Record<WalkEntry['tone'], string> = {
  step: 'border-line bg-surface text-ink-600',
  choice: 'border-warning/40 bg-warning-soft text-warning',
  parallel: 'border-accent/40 bg-accent-soft text-accent',
  wait: 'border-line bg-raised text-ink-600',
  end: 'border-success/40 bg-success-soft text-success',
  warning: 'border-danger/40 bg-danger-soft text-danger',
};

const STATUS_TEXT: Record<WalkState['status'], string> = {
  running: 'En curso',
  choice: 'Elige un camino',
  call: 'Subproceso: ¿entrar?',
  finished: 'Recorrido terminado',
  stuck: 'Recorrido trabado',
};

const store = () => useWalkthroughStore.getState();
const engineFor = (diagram: Diagram) => (diagramRegistry.has(diagram.diagramType) ? diagramRegistry.get(diagram.diagramType).walkthrough : undefined);

/**
 * Recorrido paso a paso: el diagrama se ejecuta como lo haría UML, token a token.
 * El lienzo resalta dónde están los tokens; en cada decisión el usuario elige.
 * En un subproceso enlazado (⋔) decide si entra a recorrer su diagrama —que se
 * abre— o sigue sin entrar; al terminar el subproceso vuelve al proceso que lo
 * invocó y continúa después del ⋔. Si el diagrama se edita, el recorrido queda
 * desactualizado hasta reiniciarlo.
 */
export function WalkthroughView({ engine, diagram }: { engine: WalkthroughEngine; diagram: Diagram }) {
  const frames = useWalkthroughStore((state) => state.frames);
  const setHighlight = useHighlightStore((state) => state.setHighlight);
  const logEnd = useRef<HTMLLIElement>(null);
  const top = frames.at(-1);
  const current = top?.history.at(-1);
  const elsewhere = top !== undefined && top.diagramId !== diagram.id;
  const stale = top !== undefined && !elsewhere && top.startedOn.updatedAt !== diagram.updatedAt;
  const live = current !== undefined && !elsewhere && !stale;

  // El lienzo muestra dónde están los tokens ahora y por dónde acaban de pasar.
  useEffect(() => {
    if (!current || !live) return;
    const last = current.log.at(-1);
    const nodeIds = [...new Set([...current.tokens.map((token) => token.nodeId), ...Object.keys(current.waiting), ...(last?.nodeIds ?? [])])];
    setHighlight({ sourceKey: `${WALK_PREFIX}current`, tone: current.status === 'stuck' ? 'error' : 'focus', nodeIds, edgeIds: last?.edgeIds ?? [] });
    logEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [current, live, setHighlight]);

  // Al salir del recorrido, se quita su resaltado (no el de otros paneles).
  useEffect(() => () => {
    const { highlight, setHighlight: clear } = useHighlightStore.getState();
    if (highlight?.sourceKey.startsWith(WALK_PREFIX)) clear(null);
  }, []);

  const restart = () => store().start(diagram, engine.start(diagram));
  const next = (edgeId?: string) => {
    if (!current) return;
    const following = engine.step(diagram, current, edgeId);
    if (following !== current) store().push(following);
  };
  function untilDecision() {
    if (!current) return;
    let state = current;
    for (let count = 0; count < MAX_AUTO_STEPS && state.status === 'running'; count += 1) state = engine.step(diagram, state);
    if (state !== current) store().push(state);
  }
  function skipCall() {
    if (current && engine.resumeCall) store().push(engine.resumeCall(diagram, current, 'skipped'));
  }
  /**
   * Entra al subproceso: abre su diagrama y empieza a recorrerlo encima del
   * actual. Si todavía no existe pero tiene un ejemplo que lo detalla, primero
   * lo crea desde ese ejemplo y lo enlaza (el recorrido de este nivel sigue vigente).
   */
  function enterCall() {
    const call = current?.call;
    if (!call) return;
    let targetId = call.diagramId && usePersistenceStore.getState().summaries.some((summary) => summary.id === call.diagramId) ? call.diagramId : null;
    if (!targetId && call.templateId) {
      targetId = createFromLinkedTemplate(call.nodeId)?.id ?? null;
      const updated = useDiagramStore.getState().diagram;
      if (updated) store().refreshTop(updated);
    }
    if (!targetId) return;
    openSavedDiagram(targetId);
    const child = useDiagramStore.getState().diagram;
    const childEngine = child && child.id === targetId ? engineFor(child) : undefined;
    if (child && childEngine) store().enter(child, childEngine.start(child));
  }
  /** Vuelve al proceso que invocó este subproceso y continúa después del ⋔. */
  function returnToParent() {
    const parent = frames.at(-2);
    if (!parent) return;
    openSavedDiagram(parent.diagramId);
    const reopened = useDiagramStore.getState().diagram;
    const parentEngine = reopened && reopened.id === parent.diagramId ? engineFor(reopened) : undefined;
    const pending = parent.history.at(-1);
    if (reopened && parentEngine?.resumeCall && pending) store().returnTo(reopened, parentEngine.resumeCall(reopened, pending, 'returned'));
  }
  const focusEntry = (item: WalkEntry, index: number) =>
    setHighlight({ sourceKey: `${WALK_PREFIX}${index}`, tone: item.tone === 'warning' ? 'warning' : 'focus', nodeIds: item.nodeIds, edgeIds: item.edgeIds });

  if (!current) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent"><FontAwesomeIcon icon={faRoute} /></span>
        <p className="max-w-64 text-sm leading-relaxed text-ink-600">
          Ejecuta el proceso como lo haría UML: paso a paso, eligiendo en cada decisión y entrando, si quieres, en sus subprocesos. Descubre caminos sin salida, esperas que nunca se cumplen y ramas que no se usan.
        </p>
        <button type="button" onClick={restart} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Empezar recorrido</button>
      </div>
    );
  }

  const running = live && current.status === 'running';
  const inSubprocess = frames.length > 1;
  const button = 'flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium disabled:opacity-40';
  const callNode = current.call ? diagram.nodes.find((node) => node.id === current.call!.nodeId) : undefined;
  const callSaved = current.call?.diagramId ? usePersistenceStore.getState().summaries.find((summary) => summary.id === current.call!.diagramId) : undefined;
  const callTemplate = !callSaved ? findTemplate(current.call?.templateId ?? null) : undefined;
  const canEnter = callSaved !== undefined || callTemplate !== undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line px-3 py-2">
        <button type="button" onClick={() => store().back()} disabled={!live || top!.history.length < 2} className={`${button} text-ink-600 hover:bg-canvas`} title="Paso anterior">
          <FontAwesomeIcon icon={faBackwardStep} /> Atrás
        </button>
        <button type="button" onClick={() => next()} disabled={!running} className={`${button} bg-brand text-white hover:opacity-90`}>
          <FontAwesomeIcon icon={faForwardStep} /> Siguiente
        </button>
        <button type="button" onClick={untilDecision} disabled={!running} className={`${button} text-ink-600 hover:bg-canvas`} title="Avanza solo hasta la próxima decisión, subproceso o final">
          <FontAwesomeIcon icon={faForwardFast} /> Hasta decidir
        </button>
        <button type="button" onClick={restart} className={`${button} ml-auto text-ink-600 hover:bg-canvas`} title="Volver a empezar en este diagrama">
          <FontAwesomeIcon icon={faRotateLeft} /> Reiniciar
        </button>
      </div>

      {inSubprocess && <Breadcrumb frames={frames} />}

      {elsewhere ? (
        <div className="shrink-0 space-y-2 border-b border-line bg-accent-soft/40 px-4 py-3 text-xs text-ink-900">
          <p>El recorrido va por «{top!.diagramName}».</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => openSavedDiagram(top!.diagramId)} className="rounded-md bg-brand px-2.5 py-1.5 font-medium text-white">Ir a «{top!.diagramName}»</button>
            <button type="button" onClick={restart} className="rounded-md px-2.5 py-1.5 text-ink-600 hover:bg-raised">Empezar aquí</button>
          </div>
        </div>
      ) : stale ? (
        <p className="shrink-0 border-b border-line bg-warning-soft px-4 py-2 text-xs text-warning">El diagrama cambió: reinicia el recorrido para seguir con la versión actual.</p>
      ) : (
        <p className="shrink-0 border-b border-line px-4 py-2 text-[11px] text-ink-400">
          <span className="font-medium text-ink-900">{STATUS_TEXT[current.status]}</span> · paso {top!.history.length} · {current.visitedNodeIds.length} nodos recorridos
        </p>
      )}

      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {current.log.map((item, index) => (
          <li key={index} ref={index === current.log.length - 1 ? logEnd : undefined}>
            <button type="button" onClick={() => focusEntry(item, index)} className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left hover:bg-canvas">
              <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold ${TONE_STYLE[item.tone]}`}>{index + 1}</span>
              <span className={`text-sm leading-snug ${item.tone === 'warning' ? 'text-danger' : 'text-ink-900'}`}>{item.text}</span>
            </button>
          </li>
        ))}

        {live && current.choice && (
          <li className="rounded-lg border border-warning/40 bg-warning-soft/40 p-2">
            <p className="mb-1.5 px-1 text-[11px] font-semibold text-warning">¿Por dónde sigue?</p>
            <div className="flex flex-col gap-1">
              {current.choice.options.map((option) => (
                <button key={option.edgeId} type="button" onClick={() => next(option.edgeId)} className="rounded-md bg-surface px-2.5 py-1.5 text-left text-sm text-ink-900 hover:bg-accent-soft hover:text-accent">
                  {option.label}
                </button>
              ))}
            </div>
          </li>
        )}

        {live && current.call && (
          <li className="rounded-lg border border-accent/40 bg-accent-soft/40 p-2.5">
            <p className="px-1 text-[11px] font-semibold text-accent">Subproceso «{nodeName(callNode)}» ⋔</p>
            <p className="mt-0.5 px-1 text-xs text-ink-600">
              {callSaved
                ? `Su detalle está en «${callSaved.name}».`
                : callTemplate
                  ? `Su detalle es el ejemplo «${callTemplate.name}»: al entrar se crea como diagrama y queda enlazado.`
                  : 'Su diagrama ya no está guardado: solo puedes seguir sin entrar.'}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {canEnter && (
                <button type="button" onClick={enterCall} className="flex items-center gap-2 rounded-md bg-brand px-2.5 py-1.5 text-left text-sm font-medium text-white hover:opacity-90">
                  <FontAwesomeIcon icon={faRightToBracket} className="text-xs" /> Entrar al subproceso
                </button>
              )}
              <button type="button" onClick={skipCall} className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-1.5 text-left text-sm text-ink-900 hover:bg-raised">
                <FontAwesomeIcon icon={faForwardStep} className="text-xs" /> Seguir sin entrar
              </button>
            </div>
          </li>
        )}

        {live && inSubprocess && (current.status === 'finished' || current.status === 'stuck') && (
          <li className="rounded-lg border border-success/40 bg-success-soft/40 p-2.5">
            <p className="px-1 text-xs text-ink-900">{current.status === 'finished' ? 'Terminó el subproceso.' : 'El subproceso se trabó; puedes volver igual.'}</p>
            <button type="button" onClick={returnToParent} className="mt-2 flex w-full items-center gap-2 rounded-md bg-brand px-2.5 py-1.5 text-sm font-medium text-white hover:opacity-90">
              <FontAwesomeIcon icon={faArrowTurnUp} className="-scale-x-100 text-xs" /> Volver a «{frames.at(-2)!.diagramName}»
            </button>
          </li>
        )}
      </ol>
    </div>
  );
}

/** Ruta del recorrido cuando se entró a subprocesos: «Pedido en línea › Procesar pago». */
function Breadcrumb({ frames }: { frames: WalkFrame[] }) {
  return (
    <nav aria-label="Ruta del recorrido" className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-canvas px-4 py-1.5 text-[11px]">
      {frames.map((frame, index) => (
        <span key={`${frame.diagramId}-${index}`} className="flex items-center gap-1">
          {index > 0 && <FontAwesomeIcon icon={faChevronRight} className="text-[8px] text-ink-400" />}
          <span className={index === frames.length - 1 ? 'font-semibold text-accent' : 'text-ink-600'}>{frame.diagramName}</span>
        </span>
      ))}
    </nav>
  );
}
