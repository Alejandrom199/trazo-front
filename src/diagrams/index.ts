import type { DiagramRegistry } from '@/core/registry';
import { activityModule } from './activity';
import { componentModule } from './component';
import { deploymentModule } from './deployment';
import { sequenceModule } from './sequence';
import { stateModule } from './state';
import { useCaseModule } from './usecase';
import { classModule } from './class';

/** Único punto donde se enumeran los tipos de diagrama disponibles. */
export function registerDiagramModules(registry: DiagramRegistry): void {
  registry.register(activityModule);
  registry.register(sequenceModule);
  registry.register(useCaseModule);
  registry.register(classModule);
  registry.register(componentModule);
  registry.register(deploymentModule);
  registry.register(stateModule);
}
