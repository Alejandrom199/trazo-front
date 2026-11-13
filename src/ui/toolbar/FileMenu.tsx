import { faChevronDown, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDiagramImageExport, type ImageExportOptions } from '@/canvas/exportImage';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { projectFromJson, projectToJson } from '@/core/persistence/projectFormat';
import { diagramRegistry } from '@/core/registry';
import { createId } from '@/core/utils/id';
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
  const projectInputRef = useRef<HTMLInputElement>(null);
  const exportImage = useDiagramImageExport();
  const showNotice = useUiStore((state) => state.showNotice);
  const setGalleryOpen = useUiStore((state) => state.setGalleryOpen);
  const setProjectOpen = useUiStore((state) => state.setProjectOpen);
  const project = useProjectStore((state) => state.project);
  const savedProjects = useProjectStore((state) => state.projects.length);

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
    useUiStore.getState().noteExport();
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
    setOpen(false);
    const result = diagramFromJson(await file.text());
    if (!result.ok) return showNotice(`No se pudo importar «${file.name}»: ${result.error}`);
    useDiagramStore.getState().openDiagram(result.diagram);
    showNotice(`Se importó «${result.diagram.name}» como un diagrama nuevo.`);
  }

  function exportProject() {
    const active = useProjectStore.getState().project;
    if (!active) return showNotice('Primero crea o importa un proyecto.');
    const current = currentDiagram();
    const { repository, refresh } = usePersistenceStore.getState();
    if (current && repository) repository.save(current);
    refresh();
    const diagrams = active.diagramIds
      .map((id) => (current?.id === id ? current : repository?.load(id)))
      .filter((diagram) => diagram !== null && diagram !== undefined);
    if (diagrams.length === 0) return showNotice('El proyecto todavía no tiene diagramas guardados.');
    downloadText(projectToJson(active, diagrams), `${toFileName(active.name)}.trazo-project`, 'application/json');
    setOpen(false);
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setOpen(false);
    const parsed = projectFromJson(await file.text());
    if (!parsed.ok) return showNotice(`No se pudo importar «${file.name}»: ${parsed.error}`);
    const unsupported = parsed.project.diagrams.find((diagram) => !diagramRegistry.has(diagram.diagramType));
    if (unsupported) return showNotice(`Trazo no conoce el tipo de diagrama «${unsupported.diagramType}».`);
    const persistence = usePersistenceStore.getState();
    if (!persistence.repository) return showNotice('Este navegador no permite guardar un proyecto con varios diagramas.');
    const now = new Date().toISOString();
    const diagramIds = new Map(parsed.project.diagrams.map((diagram) => [diagram.id, createId()]));
    const diagrams = parsed.project.diagrams.map((diagram) => ({ ...diagram, id: diagramIds.get(diagram.id)!, updatedAt: now }));
    const traceLinks = parsed.project.traceLinks.map((link) => ({
      ...link,
      id: createId(),
      source: { ...link.source, diagramId: diagramIds.get(link.source.diagramId)! },
      target: { ...link.target, diagramId: diagramIds.get(link.target.diagramId)! },
    }));
    for (const diagram of diagrams) persistence.repository.save(diagram);
    persistence.refresh();
    useProjectStore.getState().openProject({ id: createId(), name: parsed.project.name, diagramIds: diagrams.map((diagram) => diagram.id), traceLinks, createdAt: now, updatedAt: now });
    useDiagramStore.getState().openDiagram(diagrams[0]!);
    showNotice(`Se importó el proyecto «${parsed.project.name}» con ${diagrams.length} diagramas.`);
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
          <MenuItem onClick={() => { setOpen(false); setProjectOpen(true); }} label={project ? `Proyecto: ${project.name}` : savedProjects > 0 ? 'Proyectos…' : 'Nuevo proyecto…'} hint={project ? `${project.diagramIds.length} diagramas; administrar y cambiar entre ellos` : savedProjects > 0 ? `${savedProjects} guardados; abre uno o crea otro` : 'Agrupa varios diagramas en un solo trabajo'} />
          <div className="my-1 h-px bg-line" />
          <MenuItem onClick={exportJson} label="Exportar JSON" hint="Para respaldar o moverlo de equipo" />
          <MenuItem onClick={exportProject} label="Exportar proyecto…" hint="Un archivo .trazo-project con todos sus diagramas" />
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
          <MenuItem onClick={() => projectInputRef.current?.click()} label="Importar proyecto…" hint="Abre todos los diagramas de un archivo de Trazo" />
        </div>
      )}
      {exporting && (
        <ExportDialog title={currentDiagram()?.name ?? ''} onCancel={() => setExporting(false)} onExport={(options) => void exportAs(options)} />
      )}
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
      <input ref={projectInputRef} type="file" accept="application/json,.trazo-project" className="hidden" onChange={importProject} />
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
