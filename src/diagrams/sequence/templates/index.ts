import type { Template } from '@/core/model';
import { checkoutSequenceTemplate } from './checkoutTemplate';
import { loginSequenceTemplate } from './loginTemplate';
import { logoutSequenceTemplate } from './logoutTemplate';
import { resilientPaymentTemplate } from './resilientPaymentTemplate';

/** Ordenadas de menor a mayor dificultad: así aparecen en la galería. */
export const sequenceTemplates: Template[] = [loginSequenceTemplate, logoutSequenceTemplate, checkoutSequenceTemplate, resilientPaymentTemplate];
