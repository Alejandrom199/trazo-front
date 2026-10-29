import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDiagramImageExport, type ImageFormat } from '@/canvas/exportImage';
import { useDiagramStore } from '@/core/store/diagramStore';
import { diagramFromJson, diagramToJson, downloadText, downloadUrl, toFileName } from '@/ui/files/fileTransfer';
import { useUiStore } from '@/ui/uiStore';

/** Menú "Archivo": exportar JSON/PNG/SVG e importar JSON. */
export function FileMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportImage = useDiagramImageExport();
  const showNotice = useUiStore((state) => state.showNotice);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function currentDiagram() {
    return useDiagramStore.getState().diagram;
  }

  function exportJson() {
    const diagram = currentDiagram();
    if (!diagram) return;
    downloadText(diagramToJson(diagram), `${toFileName(diagram.name)}.json`, 'application/json');
    setOpen(false);
  }

  async function exportAs(format: ImageFormat) {
    const diagram = currentDiagram();
    if (!diagram) return;
    setOpen(false);
    setBusy(true);
    try {
      const url = await exportImage(format);
      downloadUrl(url, `${toFileName(diagram.name)}.${format}`);
    } catch (error) {
      showNotice(error instanceof Error && error.message ? `No se pudo exportar: ${error.message}` : 'No se pudo exportar la imagen.');
    } finally {
      setBusy(false);
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    setOpen(false);
    const result = diagramFromJson(await file.text());
    if (!result.ok) return showNotice(`No se pudo importar «${file.name}»: ${result.error}`);
    useDiagramStore.getState().openDiagram(result.diagram);
    showNotice(`Se importó «${result.diagram.name}» como un diagrama nuevo.`);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-canvas hover:text-ink-900 disabled:opacity-50"
      >
        {busy ? 'Exportando…' : 'Archivo'}
        <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-panel">
          <MenuItem onClick={exportJson} label="Exportar JSON" hint="Para respaldar o moverlo de equipo" />
          <MenuItem onClick={() => void exportAs('png')} label="Exportar PNG" hint="Imagen para documentos" />
          <MenuItem onClick={() => void exportAs('svg')} label="Exportar SVG" hint="Imagen escalable" />
          <div className="my-1 h-px bg-line" />
          <MenuItem onClick={() => fileInputRef.current?.click()} label="Importar JSON…" hint="Abre un diagrama exportado" />
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
    </div>
  );
}

function MenuItem({ onClick, label, hint }: { onClick: () => void; label: string; hint: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-canvas">
      <span className="block text-sm text-ink-900">{label}</span>
      <span className="block text-[11px] text-ink-400">{hint}</span>
    </button>
  );
}
