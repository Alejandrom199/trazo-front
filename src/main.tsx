import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { diagramRegistry } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { registerDiagramModules } from '@/diagrams';
import { App } from './App';
import './index.css';

// 1. Los módulos se registran antes de renderizar: la UI puede asumir que existen.
registerDiagramModules(diagramRegistry);

// 2. Mientras no haya galería de plantillas (Fase 3), se abre un diagrama vacío.
useDiagramStore.getState().newDiagram({ diagramType: 'activity', name: 'Diagrama sin título' });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
