import { faChevronDown, faFileArrowDown, faFileImport, faFileImage, faFile, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, useState, type ChangeEvent } from 'react';
import { useDiagramImageExport, type ImageExportOptions } from '@/canvas/exportImage';
import { useDiagramStore } from '@/core/store/diagramStore';
import { ExportDialog } from '@/ui/files/ExportDialog';
import { diagramFromJson, diagramToJson, downloadText, downloadUrl, toFileName } from '@/ui/files/fileTransfer';
import { useUiStore } from '@/ui/uiStore';
import { DropdownMenu, MenuItem, MenuSection } from './menu';

const current = () => useDiagramStore.getState().diagram;

/**
 * Menú «Archivo»: lo del diagrama abierto. Crear o abrir otro, importarlo y
 * exportarlo (imagen o .json). Lo del proyecto vive en su propio menú.
 */
export function FileMenu() {
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportImage = useDiagramImageExport();
  const showNotice = useUiStore((state) => state.showNotice);

  function exportJson() {
    const diagram = current();
    if (!diagram) return;
    downloadText(diagramToJson(diagram), `${toFileName(diagram.name)}.json`, 'application/json');
    useUiStore.getState().noteExport();
  }

  async function exportAs(options: ImageExportOptions) {
    const diagram = current();
    if (!diagram) return;
    setExporting(false);
    setBusy(true);
    try {
      const url = await exportImage(options);
      downloadUrl(url, `${toFileName(diagram.name)}.${options.format}`);
      useUiStore.getState().noteExport();
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
    const result = diagramFromJson(await file.text());
    if (!result.ok) return showNotice(`No se pudo importar «${file.name}»: ${result.error}`);
    useDiagramStore.getState().openDiagram(result.diagram);
    showNotice(`Se importó «${result.diagram.name}» como un diagrama nuevo.`);
  }

  return (
    <>
      <DropdownMenu
        label="Archivo"
        triggerClassName={(open) => `flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${open ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}
        trigger={() => (
          <>
            <span className="sm:hidden"><FontAwesomeIcon icon={faFile} className="text-xs" aria-hidden /></span>
            <span className="hidden items-center gap-1.5 sm:flex">
              {busy ? 'Exportando…' : 'Archivo'}
              <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
            </span>
          </>
        )}
      >
        {(close) => (
          <>
            <MenuSection title="Diagrama">
              <MenuItem icon={faFolderOpen} label="Nuevo o abrir…" hint="En blanco, tus diagramas o un ejemplo" onClick={() => { close(); useUiStore.getState().setGalleryOpen(true); }} />
              <MenuItem icon={faFileImport} label="Importar diagrama…" hint="Un archivo .json exportado de Trazo" onClick={() => { close(); fileInputRef.current?.click(); }} />
            </MenuSection>
            <MenuSection title="Exportar">
              <MenuItem icon={faFileImage} label="Imagen…" hint="PNG o SVG, con fondo claro, oscuro o transparente" disabled={!current()} onClick={() => { close(); setExporting(true); }} />
              <MenuItem icon={faFileArrowDown} label="Diagrama (.json)" hint="Para respaldarlo o abrirlo en otro equipo" disabled={!current()} onClick={() => { close(); exportJson(); }} />
            </MenuSection>
          </>
        )}
      </DropdownMenu>
      {exporting && <ExportDialog title={current()?.name ?? ''} onCancel={() => setExporting(false)} onExport={(options) => void exportAs(options)} />}
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
    </>
  );
}
