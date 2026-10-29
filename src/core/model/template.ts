import type { Diagram, DiagramType } from './diagram';

export type Difficulty = 'básico' | 'intermedio' | 'avanzado';

export interface Template {
  id: string;
  diagramType: DiagramType;
  name: string;
  description: string;
  difficulty: Difficulty;
  /** Qué artefactos enseña la plantilla (claves del catálogo). */
  learningGoals: string[];
  /** Contenido inicial; se copia con ids nuevos al crear un diagrama. */
  diagram: Diagram;
}
