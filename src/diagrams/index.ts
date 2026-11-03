import type { DiagramRegistry } from '@/core/registry';
import { activityModule } from './activity';
import { componentModule } from './component';
import { deploymentModule } from './deployment';
import { packageModule } from './package';
import { sequenceModule } from './sequence';
import { stateModule } from './state';
import { useCaseModule } from './usecase';
import { classModule } from './class';
import { objectModule } from './object';
import { profileModule } from './profile';
import { compositeModule } from './composite';
import { communicationModule } from './communication';
import { interactionOverviewModule } from './interactionOverview';
import { timingModule } from './timing';

/** Único punto donde se enumeran los tipos de diagrama disponibles. */
export function registerDiagramModules(registry: DiagramRegistry): void {
  registry.register(activityModule);
  registry.register(sequenceModule);
  registry.register(useCaseModule);
  registry.register(classModule);
  registry.register(componentModule);
  registry.register(deploymentModule);
  registry.register(stateModule);
  registry.register(packageModule);
  registry.register(objectModule);
  registry.register(profileModule);
  registry.register(compositeModule);
  registry.register(communicationModule);
  registry.register(interactionOverviewModule);
  registry.register(timingModule);
}
