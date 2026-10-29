import type { DiagramType } from '@/core/model';
import type { DiagramModule } from './diagramModule';

export interface DiagramRegistry {
  register: (module: DiagramModule) => void;
  /** Lanza si el tipo no está registrado: es un error de programación, no de usuario. */
  get: (diagramType: DiagramType) => DiagramModule;
  has: (diagramType: DiagramType) => boolean;
  list: () => DiagramModule[];
}

/**
 * Crea un registro independiente. La app usa la instancia `diagramRegistry`;
 * las pruebas crean el suyo para no compartir estado entre casos.
 */
export function createRegistry(): DiagramRegistry {
  const modules = new Map<DiagramType, DiagramModule>();

  return {
    register(module) {
      if (modules.has(module.diagramType)) {
        throw new Error(`El módulo "${module.diagramType}" ya está registrado.`);
      }
      assertModuleIsConsistent(module);
      modules.set(module.diagramType, module);
    },
    get(diagramType) {
      const module = modules.get(diagramType);
      if (!module) {
        throw new Error(`No hay módulo registrado para "${diagramType}".`);
      }
      return module;
    },
    has: (diagramType) => modules.has(diagramType),
    list: () => [...modules.values()],
  };
}

/** Falla al arrancar si el módulo trae datos incoherentes, en vez de fallar luego en la UI. */
function assertModuleIsConsistent(module: DiagramModule): void {
  const seenTypes = new Set<string>();

  for (const artifact of module.artifacts) {
    if (artifact.diagramType !== module.diagramType) {
      throw new Error(
        `El artefacto "${artifact.type}" declara diagramType "${artifact.diagramType}" ` +
          `pero pertenece al módulo "${module.diagramType}".`,
      );
    }
    if (seenTypes.has(artifact.type)) {
      throw new Error(`Artefacto duplicado "${artifact.type}" en el módulo "${module.diagramType}".`);
    }
    seenTypes.add(artifact.type);
  }

  const visualTypes = [...Object.keys(module.nodeKinds), ...Object.keys(module.edgeKinds)];
  for (const artifactType of visualTypes) {
    if (!seenTypes.has(artifactType)) {
      throw new Error(
        `Hay un componente visual para "${artifactType}" pero no existe en el catálogo de "${module.diagramType}".`,
      );
    }
  }

  for (const artifact of module.artifacts) {
    for (const related of artifact.relatedArtifacts) {
      if (!seenTypes.has(related)) {
        throw new Error(`El artefacto "${artifact.type}" se relaciona con "${related}", que no existe.`);
      }
    }
  }
}

/** Registro único que usa la aplicación. */
export const diagramRegistry = createRegistry();
