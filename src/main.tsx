import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startAutosave } from '@/core/persistence/autosave';
import { browserStorage, createDiagramRepository, type DiagramRepository } from '@/core/persistence/diagramRepository';
import { usePersistenceStore } from '@/core/persistence/persistenceStore';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { registerDiagramModules } from '@/diagrams';
import { useUiStore } from '@/ui/uiStore';
import { App } from './App';
import './index.css';

// 1. Los módulos se registran antes de renderizar: la UI puede asumir que existen.
registerDiagramModules(diagramRegistry);

// 2. Persistencia en el navegador (si está disponible).
const storage = browserStorage();
const repository = storage ? createDiagramRepository(storage) : null;
usePersistenceStore.getState().setRepository(repository);

// 3. Se reabre el último diagrama; si no hay, uno vacío detrás de la galería de plantillas.
openInitialDiagram(repository);
startAutosave();

function openInitialDiagram(repo: DiagramRepository | null): void {
  const lastId = repo?.lastOpenedId();
  const last = lastId ? repo?.load(lastId) : null;
  if (last && diagramRegistry.has(last.diagramType)) {
    useDiagramStore.getState().openDiagram(last);
    useUiStore.getState().setGalleryOpen(false);
    return;
  }
  useDiagramStore.getState().newDiagram({ diagramType: 'activity', name: 'Diagrama sin título' });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
