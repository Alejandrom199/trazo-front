import { faChevronDown, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDiagramImageExport, type ImageExportOptions } from '@/canvas/exportImage';
import { useDiagramStore } from '@/core/store/diagramStore';
import { ExportDialog } from '@/ui/files/ExportDialog';
import { diagramFromJson, diagramToJson, downloadText, downloadUrl, toFileName } from '@/ui/files/fileTransfer';
import { useUiStore } from '@/ui/uiStore';

/** Menú "Archivo" de la barra superior: nuevo diagrama, exportar JSON o imagen (con su diálogo) e importar JSON. */
export function FileMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportImage = useDiagramImageExport();
  const showNotice = useUiStore((state) => state.showNotice);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);

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

  async function exportAs(options: ImageExportOptions) {
    const diagram = currentDiagram();
    if (!diagram) return;
    setExporting(false);
    setBusy(true);
    try {
      const url = await exportImage(options);
      downloadUrl(url, `${toFileName(diagram.name)}.${options.format}`);
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
        aria-label="Archivo"
        disabled={busy}
        className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
          open ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'
        }`}
      >
        <span className="sm:hidden">
          <FontAwesomeIcon icon={faFolderOpen} className="text-xs" aria-hidden />
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          {busy ? 'Exportando…' : 'Archivo'}
          <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute top-full left-0 z-50 mt-1.5 w-64 rounded-lg border border-line bg-surface p-1 shadow-panel">
          <MenuItem
            onClick={() => {
              setOpen(false);
              setGalleryOpen(true);
            }}
            label="Nuevo o abrir…"
            hint="En blanco, tus diagramas o un ejemplo"
          />
          <div className="my-1 h-px bg-line" />
          <MenuItem onClick={exportJson} label="Exportar JSON" hint="Para respaldar o moverlo de equipo" />
          <MenuItem
            onClick={() => {
              setOpen(false);
              setExporting(true);
            }}
            label="Exportar imagen…"
            hint="PNG o SVG, con fondo claro, oscuro o transparente"
          />
          <div className="my-1 h-px bg-line" />
          <MenuItem onClick={() => fileInputRef.current?.click()} label="Importar JSON…" hint="Abre un diagrama exportado" />
        </div>
      )}
      {exporting && (
        <ExportDialog title={currentDiagram()?.name ?? ''} onCancel={() => setExporting(false)} onExport={(options) => void exportAs(options)} />
      )}
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
    </div>
  );
}

function MenuItem({ onClick, label, hint }: { onClick: () => void; label: string; hint: string }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="block w-full rounded-md px-3 py-2 text-left hover:bg-raised">
      <span className="block text-sm text-ink-900">{label}</span>
      <span className="block text-[11px] text-ink-400">{hint}</span>
    </button>
  );
}
