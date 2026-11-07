import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAddArtifactAtCenter } from '@/canvas/placeArtifact';
import { useActiveModule } from '@/canvas/useActiveModule';
import { diagramToJson, downloadText, toFileName } from '@/ui/files/fileTransfer';
import { navigate, useRoute } from '@/ui/navigation/route';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useProjectStore } from '@/core/store/projectStore';
import { useDialogBehavior } from '@/ui/dialogs/useDialogBehavior';
import { useUiStore } from '@/ui/uiStore';
import { filterCommands, type CommandItem } from './commandSearch';

interface Runnable extends CommandItem {
  run: () => void;
}

/** Ctrl+K: artefactos, diagramas, acciones, guías y el proyecto abierto. */
export function CommandPalette() {
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const module = useActiveModule();
  const addAtCenter = useAddArtifactAtCenter();
  const summaries = usePersistenceStore((state) => state.summaries);
  const project = useProjectStore((state) => state.project);
  const route = useRoute();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDialogBehavior(open, dialogRef, close);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const next = !useUiStore.getState().commandPaletteOpen;
        setOpen(next);
        if (next) setQuery('');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const commands = useMemo(() => {
    const items: Runnable[] = [];
    const go = (run: () => void) => () => {
      run();
      setOpen(false);
    };
    if (module) {
      for (const artifact of module.artifacts) {
        if (!module.nodeKinds[artifact.type]) continue;
        items.push({
          id: `artifact:${artifact.type}`,
          group: 'Artefactos',
          label: artifact.name,
          hint: 'Agregar al centro del lienzo',
          keywords: artifact.umlName,
          run: go(() => addAtCenter(artifact.type)),
        });
      }
    }
    for (const summary of summaries) {
      items.push({
        id: `saved:${summary.id}`,
        group: 'Diagramas guardados',
        label: summary.name || 'Sin título',
        hint: diagramRegistry.has(summary.diagramType) ? diagramRegistry.get(summary.diagramType).displayName : summary.diagramType,
        run: go(() => {
          const diagram = usePersistenceStore.getState().repository?.load(summary.id);
          if (diagram) useDiagramStore.getState().openDiagram(diagram);
        }),
      });
    }
    const projectIds = new Set(project?.diagramIds ?? []);
    for (const summary of summaries.filter((item) => projectIds.has(item.id))) {
      items.push({
        id: `project:${summary.id}`,
        group: 'Proyecto',
        label: summary.name || 'Sin título',
        hint: project?.name,
        run: go(() => {
          const diagram = usePersistenceStore.getState().repository?.load(summary.id);
          if (diagram) useDiagramStore.getState().openDiagram(diagram);
        }),
      });
    }
    items.push(
      { id: 'new', group: 'Acciones', label: 'Nuevo diagrama', keywords: 'archivo galeria', run: go(() => useUiStore.getState().setGalleryOpen(true)) },
      { id: 'validate', group: 'Acciones', label: 'Validar', keywords: 'problemas', run: go(() => useUiStore.getState().setInspectorTab('problems')) },
      { id: 'narrate', group: 'Acciones', label: 'Abrir narración', keywords: 'explicar', run: go(() => useUiStore.getState().setInspectorTab('narration')) },
      {
        id: 'export',
        group: 'Acciones',
        label: 'Exportar JSON',
        keywords: 'archivo',
        run: go(() => {
          const diagram = useDiagramStore.getState().diagram;
          if (!diagram) return;
          downloadText(diagramToJson(diagram), `${toFileName(diagram.name)}.json`, 'application/json');
          useUiStore.getState().noteExport();
        }),
      },
      {
        id: 'theme',
        group: 'Acciones',
        label: 'Cambiar tema',
        keywords: 'oscuro claro',
        run: go(() => {
          const theme = useUiStore.getState().theme;
          useUiStore.getState().setTheme(theme === 'dark' ? 'light' : 'dark');
        }),
      },
      { id: 'learn', group: 'Aprender', label: 'Abrir Aprender', run: go(() => navigate({ page: 'learn' })) },
      { id: 'flow', group: 'Aprender', label: 'Biblioteca Digital', keywords: 'flow uml recorrido', run: go(() => navigate({ page: 'learn-flow' })) },
    );
    if (route.page === 'editor') {
      items.push({ id: 'tutorial', group: 'Acciones', label: 'Reiniciar recorrido', keywords: 'tutorial', run: go(() => useUiStore.getState().restartTutorial()) });
    }
    for (const entry of diagramRegistry.list()) {
      items.push({
        id: `guide:${entry.diagramType}`,
        group: 'Aprender',
        label: entry.displayName,
        hint: entry.maturity === 'preview' ? 'Vista previa' : 'Guía',
        run: go(() => navigate({ page: 'learn-diagram', diagramType: entry.diagramType })),
      });
    }
    return items;
  }, [addAtCenter, module, project, route.page, setOpen, summaries]);

  const visible = filterCommands(commands, query);
  const selected = visible[Math.min(cursor, Math.max(visible.length - 1, 0))];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Buscar" tabIndex={-1} className="flex max-h-[min(520px,70dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-panel">
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((value) => Math.min(value + 1, visible.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((value) => Math.max(value - 1, 0));
            } else if (event.key === 'Enter' && selected) {
              event.preventDefault();
              selected.run();
            }
          }}
          placeholder="Buscar artefactos, diagramas, acciones…"
          aria-label="Buscar"
          className="border-b border-line bg-transparent px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
        <ul className="min-h-0 flex-1 overflow-y-auto p-2" role="listbox">
          {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-600">No hay resultados.</li>}
          {visible.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === selected?.id}
                onMouseEnter={() => setCursor(index)}
                onClick={item.run}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ${item.id === selected?.id ? 'bg-accent-soft text-accent' : 'text-ink-900 hover:bg-raised'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-[11px] text-ink-400">{item.group}{item.hint ? ` · ${item.hint}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
