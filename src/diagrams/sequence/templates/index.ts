import type { Template } from '@/core/model';
import { balanceSequenceTemplate } from './balanceTemplate';
import { checkoutSequenceTemplate } from './checkoutTemplate';
import { loginSequenceTemplate } from './loginTemplate';
import { libraryLoanSequenceTemplate } from './libraryLoanTemplate';
import { logoutSequenceTemplate } from './logoutTemplate';
import { resilientPaymentTemplate } from './resilientPaymentTemplate';
import { tripBookingTemplate } from './tripBookingTemplate';

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const sequenceTemplates: Template[] = [
  balanceSequenceTemplate,
  libraryLoanSequenceTemplate,
  loginSequenceTemplate,
  logoutSequenceTemplate,
  checkoutSequenceTemplate,
  resilientPaymentTemplate,
  tripBookingTemplate,
];
