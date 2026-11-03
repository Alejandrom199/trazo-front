import type { Template } from '@/core/model';
import { bookLoanTemplate } from './bookLoanTemplate';
import { documentApprovalTemplate } from './documentApprovalTemplate';
import { loginTemplate } from './loginTemplate';
import { onlineOrderTemplate } from './onlineOrderTemplate';
import { parallelOnboardingTemplate } from './parallelOnboardingTemplate';
import { resilientFulfillmentTemplate } from './resilientFulfillmentTemplate';

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const activityTemplates: Template[] = [
  bookLoanTemplate,
  loginTemplate,
  onlineOrderTemplate,
  parallelOnboardingTemplate,
  documentApprovalTemplate,
  resilientFulfillmentTemplate,
];
