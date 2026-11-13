import { validateDiagram, type Diagram } from '@/core/model';
import { diagramRegistry, type CorrectionChallenge, type DiagramModule } from '@/core/registry';
import { useDiagramStore } from '@/core/store/diagramStore';
import { useUiStore } from '@/ui/uiStore';
import { useLearningProgressStore } from './learningProgress';

/** Id del reto en el progreso del taller. */
export const challengeProgressId = (challenge: Pick<CorrectionChallenge, 'id'>) => `workshop:${challenge.id}`;

/**
 * Regla «reto resuelto»: el diagrama viene de la plantilla de un reto de corregir
 * de su tipo, el validador no le encuentra ningún problema (de cualquier gravedad,
 * como los que cuenta el reto) y no está vacío (vaciarlo no es corregirlo).
 * Devuelve ese reto, o null.
 */
export function solvedChallenge(diagram: Diagram, module: DiagramModule): CorrectionChallenge | null {
  if (!diagram.templateId || diagram.nodes.length === 0) return null;
  const challenge = module.guide.workshop?.correctionChallenges.find((candidate) => candidate.diagram.id === diagram.templateId);
  if (!challenge) return null;
  return validateDiagram(diagram, module.rules).length === 0 ? challenge : null;
}

/**
 * Vigila el diagrama abierto: cuando un reto abierto desde Aprender queda sin
 * problemas, lo marca en el progreso y lo avisa. Devuelve una función para detenerlo.
 */
export function startChallengeTracking(): () => void {
  return useDiagramStore.subscribe((state, previous) => {
    const { diagram } = state;
    // Solo los diagramas que vienen de una plantilla pueden ser un reto: el resto no se valida aquí.
    if (!diagram?.templateId || diagram === previous.diagram || !diagramRegistry.has(diagram.diagramType)) return;
    const challenge = solvedChallenge(diagram, diagramRegistry.get(diagram.diagramType));
    if (challenge && useLearningProgressStore.getState().complete(diagram.diagramType, challengeProgressId(challenge))) {
      useUiStore.getState().showNotice(`¡Reto resuelto: «${challenge.title}»! Ya cuenta en tu progreso del taller.`);
    }
  });
}
