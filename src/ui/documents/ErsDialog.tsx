import { faCheck, faCopy, faFileWord, faImages, faPenToSquare, faPrint, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useReactFlow } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { emptyProjectDocument, type DiagramProject } from '@/core/model';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { useDiagramImageExport } from '@/canvas/exportImage';
import { copyTable } from '@/ui/clipboard';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { openSavedDiagram } from '@/ui/projects/projectActions';
import { useProjectDiagrams } from '@/ui/projects/useProjectDiagrams';
import { useUiStore } from '@/ui/uiStore';
import { ErsDataPanel, pendingFields } from './ErsDataPanel';
import { buildErsHtml, toWordDocument } from './ersDocument';

/** Fotogramas que se esperan, como mucho, a que el lienzo dibuje un diagrama recién abierto. */
const MAX_WAIT_FRAMES = 90;
const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

/** Documento ERS del proyecto: vista previa y salidas (copiar, Word, PDF). */
export function ErsDialog() {
  const open = useUiStore((state) => state.ersOpen);
  const project = useProjectStore((state) => state.project);
  if (!open || !project) return null;
  return <ErsScreen project={project} />;
}

function ErsScreen({ project }: { project: DiagramProject }) {
  const close = useCallback(() => useUiStore.getState().setErsOpen(false), []);
  const dialogRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  useDialogBehavior(true, dialogRef, close);
  const diagrams = useProjectDiagrams();
  const [images, setImages] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(true);
  const pending = pendingFields(project.document ?? emptyProjectDocument());
  // Al cambiar un dato, el documento se vuelve a cargar: se queda donde se estaba leyendo.
  const readingAt = useRef(0);
  function keepScroll() {
    const view = frameRef.current?.contentWindow;
    if (!view) return;
    view.scrollTo(0, readingAt.current);
    view.addEventListener('scroll', () => { readingAt.current = view.scrollY; });
  }
  const html = useMemo(() => buildErsHtml({ project, diagrams, images, date: new Date() }), [project, diagrams, images]);
  const exportImage = useDiagramImageExport();
  const { getNodes } = useReactFlow();

  /** Espera a que el lienzo tenga dibujados y medidos los nodos del diagrama abierto. */
  async function canvasReady(count: number): Promise<boolean> {
    for (let frame = 0; frame < MAX_WAIT_FRAMES; frame += 1) {
      await nextFrame();
      const nodes = getNodes();
      if (nodes.length >= count && nodes.every((node) => node.measured?.width)) return true;
    }
    return false;
  }

  /**
   * Las imágenes salen del lienzo: se abre cada diagrama un momento, se captura
   * y al final se vuelve al que estaba abierto. Un diagrama que no se pudo
   * dibujar queda sin imagen (el documento lo cuenta igual con su narración).
   */
  async function captureImages() {
    const originalId = useDiagramStore.getState().diagram?.id ?? null;
    const targets = diagrams.filter((diagram) => diagram.nodes.length > 0);
    const captured: Record<string, string> = {};
    setProgress({ done: 0, total: targets.length });
    try {
      for (const [index, diagram] of targets.entries()) {
        openSavedDiagram(diagram.id);
        if (useDiagramStore.getState().diagram?.id === diagram.id && (await canvasReady(diagram.nodes.length))) {
          try {
            captured[diagram.id] = await exportImage({ format: 'png', background: 'light', frame: 'none', title: diagram.name, borderWidth: 0, borderColor: null, borderRadius: 0, padding: 24 });
          } catch {
            // Sin imagen: el documento sigue con la narración del diagrama.
          }
        }
        setProgress({ done: index + 1, total: targets.length });
      }
    } finally {
      if (originalId) openSavedDiagram(originalId);
      setImages(captured);
      setProgress(null);
    }
  }

  async function copy() {
    const text = frameRef.current?.contentDocument?.body.innerText ?? '';
    if (await copyTable(html, text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  function downloadWord() {
    const url = URL.createObjectURL(new Blob([toWordDocument(html)], { type: 'application/msword' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name} - ERS.doc`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const imageCount = Object.keys(images).length;
  const busy = progress !== null;
  const button = 'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-40';

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="ers-title" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-canvas outline-none">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="mr-auto min-w-0">
          <h2 id="ers-title" className="truncate text-sm font-semibold text-ink-900">Documento ERS · {project.name}</h2>
          <p className="text-[11px] text-ink-400">Se arma con los requisitos, las fichas, los diagramas, los vínculos y los casos de prueba del proyecto</p>
        </div>
        <button type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className={`${button} ${editing ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}>
          <FontAwesomeIcon icon={faPenToSquare} className="text-xs" /> Datos del documento
          {pending > 0 && <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning" title="Campos por completar">{pending}</span>}
        </button>
        <button type="button" onClick={() => void captureImages()} disabled={busy} title="Abre cada diagrama un momento para capturarlo y vuelve al que tenías abierto" className={`${button} text-ink-600 hover:bg-raised hover:text-ink-900`}>
          <FontAwesomeIcon icon={faImages} className="text-xs" />
          {busy ? `Capturando ${progress.done} de ${progress.total}…` : imageCount > 0 ? `Actualizar imágenes (${imageCount})` : 'Agregar imágenes de los diagramas'}
        </button>
        <button type="button" onClick={() => void copy()} disabled={busy} className={`${button} text-ink-600 hover:bg-raised hover:text-ink-900`}>
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-xs" /> {copied ? 'Copiado' : 'Copiar'}
        </button>
        <button type="button" onClick={downloadWord} disabled={busy} className={`${button} text-ink-600 hover:bg-raised hover:text-ink-900`}>
          <FontAwesomeIcon icon={faFileWord} className="text-xs" /> Word (.doc)
        </button>
        <button type="button" onClick={() => frameRef.current?.contentWindow?.print()} disabled={busy} title="Imprime o guarda como PDF desde el diálogo de impresión" className={`${button} bg-brand text-white hover:opacity-90`}>
          <FontAwesomeIcon icon={faPrint} className="text-xs" /> Imprimir / PDF
        </button>
        <button type="button" onClick={close} aria-label="Cerrar el documento" className="flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-raised hover:text-ink-900">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        {editing && (
          <aside aria-label="Datos del documento" className="w-[26rem] shrink-0 overflow-y-auto border-r border-line bg-surface max-lg:h-1/2 max-lg:w-full max-lg:border-r-0 max-lg:border-b">
            <ErsDataPanel document={project.document} />
          </aside>
        )}
        <iframe ref={frameRef} title={`Documento ERS de ${project.name}`} srcDoc={html} onLoad={keepScroll} className="min-h-0 min-w-0 flex-1 bg-white" />
      </div>
    </div>
  );
}
