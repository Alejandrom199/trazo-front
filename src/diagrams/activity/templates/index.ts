import type { Template } from '@/core/model';
import { documentApprovalTemplate } from './documentApprovalTemplate';
import { loginTemplate } from './loginTemplate';
import { onlineOrderTemplate } from './onlineOrderTemplate';
import { parallelOnboardingTemplate } from './parallelOnboardingTemplate';
import { resilientFulfillmentTemplate } from './resilientFulfillmentTemplate';

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const activityTemplates: Template[] = [
  loginTemplate,
  onlineOrderTemplate,
  parallelOnboardingTemplate,
  documentApprovalTemplate,
  resilientFulfillmentTemplate,
];
