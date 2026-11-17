import {
  faBookOpen,
  faBullseye,
  faChevronDown,
  faFileArrowDown,
  faFileImport,
  faFolderOpen,
  faFolderPlus,
  faFileLines,
  faLink,
  faMap,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef, type ChangeEvent } from 'react';
import { coverageSummary, requirementCoverage } from '@/core/model';
import { useProjectStore } from '@/core/store/projectStore';
import { DropdownMenu, MenuItem, MenuSection } from '@/ui/toolbar/menu';
import { useUiStore } from '@/ui/uiStore';
import { openSampleProject } from './projectActions';
import { exportActiveProject, importProjectText } from './projectTransfer';
import { useProjectDiagrams } from './useProjectDiagrams';

const ui = () => useUiStore.getState();

/**
 * Menú «Proyecto» de la barra superior: el único lugar de las acciones del
 * proyecto (mapa, requisitos, vínculos, su archivo .trazo-project y la
 * gestión). La barra lateral solo navega carpetas y diagramas. Sin proyecto,
 * ofrece crear, abrir, importar o probar el de ejemplo.
 */
export function ProjectMenu() {
  const project = useProjectStore((state) => state.project);
  const saved = useProjectStore((state) => state.projects.length);
  const diagrams = useProjectDiagrams();
  const inputRef = useRef<HTMLInputElement>(null);
  const coverage = project ? coverageSummary(requirementCoverage(project.requirements, project.requirementLinks, diagrams)) : null;

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    ui().showNotice(importProjectText(await file.text(), file.name));
    ui().setProjectSidebarOpen(true);
  }
  function exportFile() {
    const problem = exportActiveProject();
    if (problem) ui().showNotice(problem);
  }

  return (
    <>
      <DropdownMenu
        label="Proyecto"
        width="w-80"
        triggerClassName={(open) =>
          project
            ? `flex h-8 max-w-56 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${open ? 'bg-accent text-white' : 'bg-accent-soft text-accent hover:bg-accent/15'}`
            : `flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium ${open ? 'bg-accent-soft text-accent' : 'text-ink-600 hover:bg-raised hover:text-ink-900'}`}
        trigger={() =>
          project ? (
            <>
              <FontAwesomeIcon icon={faFolderOpen} className="text-[11px]" />
              <span className="hidden truncate md:inline">{project.name}</span>
              <span className="rounded-full bg-surface px-1.5 text-[10px] text-accent">{project.diagramIds.length}</span>
              <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
            </>
          ) : (
            <>
              {/* El icono de FontAwesome trae su propio display: se oculta su contenedor. */}
              <span className="sm:hidden"><FontAwesomeIcon icon={faFolderOpen} className="text-xs" /></span>
              <span className="hidden items-center gap-1.5 sm:flex">
                Proyecto
                <FontAwesomeIcon icon={faChevronDown} className="text-[9px]" />
              </span>
            </>
          )}
      >
        {(close) => (project ? (
          <>
            <div className="px-2.5 pt-1.5 pb-2">
              <p className="truncate text-sm font-semibold text-ink-900">{project.name}</p>
              <p className="text-[11px] text-ink-400">
                {project.diagramIds.length} diagramas · {project.folders.length} carpetas · {project.requirements.length} requisitos
              </p>
            </div>
            <MenuSection title="Ver">
              <MenuItem icon={faMap} label="Mapa del proyecto" hint="Los diagramas por fase y cómo se relacionan" onClick={() => { close(); ui().setProjectMapOpen(true); }} />
              <MenuItem
                icon={faBullseye}
                label="Requisitos"
                hint="Qué se pidió, qué lo cumple y la matriz"
                aside={coverage && coverage.total > 0 ? `${coverage.covered}/${coverage.total}` : undefined}
                onClick={() => { close(); ui().setRequirementsOpen(true); }}
              />
              <MenuItem icon={faFileLines} label="Documento ERS" hint="Requisitos, casos de uso, modelos y pruebas en un documento" onClick={() => { close(); ui().setErsOpen(true); }} />
              <MenuItem icon={faLink} label="Vínculos del diagrama" hint="Vínculos, relaciones y requisitos del diagrama abierto" onClick={() => { close(); ui().setInspectorOpen(true); ui().setInspectorTab('traceability'); }} />
            </MenuSection>
            <MenuSection title="Archivo del proyecto">
              <MenuItem icon={faFileArrowDown} label="Exportar proyecto (.trazo-project)" hint="Todo: diagramas, carpetas, vínculos y requisitos" onClick={() => { close(); exportFile(); }} />
              <MenuItem icon={faFileImport} label="Importar proyecto…" hint="Se abre como un proyecto nuevo" onClick={() => { close(); inputRef.current?.click(); }} />
            </MenuSection>
            <MenuSection title="Gestionar">
              <MenuItem icon={faSliders} label="Proyectos…" hint="Cambiar, crear, renombrar o eliminar" aside={saved > 1 ? `${saved}` : undefined} onClick={() => { close(); ui().setProjectOpen(true); }} />
            </MenuSection>
          </>
        ) : (
          <>
            <MenuSection title="Proyecto">
              <MenuItem icon={faFolderPlus} label="Nuevo proyecto…" hint="Agrupa varios diagramas de un mismo sistema" onClick={() => { close(); ui().setProjectOpen(true); }} />
              <MenuItem icon={faFolderOpen} label="Abrir un proyecto…" hint={saved > 0 ? `${saved} guardados en este navegador` : 'Todavía no tienes proyectos guardados'} disabled={saved === 0} onClick={() => { close(); ui().setProjectOpen(true); }} />
              <MenuItem icon={faFileImport} label="Importar proyecto…" hint="Un archivo .trazo-project" onClick={() => { close(); inputRef.current?.click(); }} />
            </MenuSection>
            <MenuSection title="Aprender">
              <MenuItem icon={faBookOpen} label="Proyecto de ejemplo" hint="«Biblioteca Digital», completo, para explorar" onClick={() => { close(); openSampleProject(); }} />
            </MenuSection>
          </>
        ))}
      </DropdownMenu>
      <input ref={inputRef} type="file" accept="application/json,.trazo-project" className="hidden" onChange={importFile} />
    </>
  );
}
