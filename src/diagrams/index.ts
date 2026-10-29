import type { DiagramRegistry } from '@/core/registry';
import { activityModule } from './activity';

/** Único punto donde se enumeran los tipos de diagrama disponibles. */
export function registerDiagramModules(registry: DiagramRegistry): void {
  registry.register(activityModule);
}
