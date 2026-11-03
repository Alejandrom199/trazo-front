import type { Template } from '@/core/model';
import { accessTemplate } from './accessTemplate';
import { administrationTemplate } from './administrationTemplate';
import { corporateAccessTemplate } from './corporateAccessTemplate';
import { insuranceClaimTemplate } from './insuranceClaimTemplate';
import { libraryTemplate } from './libraryTemplate';
import { purchaseTemplate } from './purchaseTemplate';

export const useCaseTemplates: Template[] = [
  accessTemplate,
  libraryTemplate,
  purchaseTemplate,
  administrationTemplate,
  corporateAccessTemplate,
  insuranceClaimTemplate,
];
