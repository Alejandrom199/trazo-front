import { faBullseye, faChevronDown, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { useCanvasViewStore, type CanvasDetailMode, type CanvasViewMode } from '@/canvas/canvasViewStore';
import { useDiagramStore } from '@/core/store/diagramStore';

const VIEW_LABEL: Record<CanvasViewMode, string> = { all: 'General', primary: 'Principal', alternative: 'Alternativas', integration: 'Integraciones' };
const DETAIL_LABEL: Record<CanvasDetailMode, string> = { auto: 'Detalle automático', full: 'Detalle completo', compact: 'Detalle compacto' };

export function CanvasViewControl() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useCanvasViewStore((state) => state.mode);
  const detail = useCanvasViewStore((state) => state.detail);
  const focus = useCanvasViewStore((state) => state.focus);
  const selected = useDiagramStore((state) => state.selection.nodeIds.length + state.selection.edgeIds.length);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  return <div ref={ref} className="relative">
    <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Vista del diagrama" title="Vista del diagrama" onClick={() => setOpen(!open)} className={`flex h-8 items-center gap-2 rounded-md px-2 text-xs ${mode !== 'all' || focus ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}>
      <FontAwesomeIcon icon={faLayerGroup} className="text-[12px]" /><span className="hidden whitespace-nowrap xl:inline">{VIEW_LABEL[mode]}</span><FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
    </button>
    {open && <div role="dialog" aria-label="Vista del diagrama" className="absolute top-full right-0 z-30 mt-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-panel">
      <p className="text-xs font-medium text-ink-900">Qué quieres leer</p>
      <div className="mt-2 grid grid-cols-2 gap-1">{(Object.keys(VIEW_LABEL) as CanvasViewMode[]).map((value) => <button key={value} type="button" onClick={() => useCanvasViewStore.getState().setMode(value)} className={`rounded-md px-2.5 py-2 text-left text-xs ${mode === value ? 'bg-accent-soft font-medium text-accent' : 'text-ink-600 hover:bg-raised'}`}>{VIEW_LABEL[value]}</button>)}</div>
      <div className="mt-3 border-t border-line pt-3">
        <label className="text-xs font-medium text-ink-900" htmlFor="canvas-detail">Nivel de detalle</label>
        <select id="canvas-detail" value={detail} onChange={(event) => useCanvasViewStore.getState().setDetail(event.target.value as CanvasDetailMode)} className="mt-2 w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-xs text-ink-900 outline-none focus:ring-2 focus:ring-accent/25">{(Object.keys(DETAIL_LABEL) as CanvasDetailMode[]).map((value) => <option key={value} value={value}>{DETAIL_LABEL[value]}</option>)}</select>
      </div>
      <button type="button" role="switch" aria-checked={focus} disabled={selected === 0} onClick={() => useCanvasViewStore.getState().setFocus(!focus)} className={`mt-3 flex w-full items-start gap-3 rounded-md border p-3 text-left disabled:opacity-45 ${focus ? 'border-accent/40 bg-accent-soft' : 'border-line hover:bg-raised'}`}>
        <FontAwesomeIcon icon={faBullseye} className={`mt-0.5 ${focus ? 'text-accent' : 'text-ink-400'}`} /><span><span className="block text-xs font-medium text-ink-900">Enfocar selección</span><span className="mt-0.5 block text-[11px] leading-relaxed text-ink-600">Atenúa lo que no participa directamente.</span></span>
      </button>
    </div>}
  </div>;
}
