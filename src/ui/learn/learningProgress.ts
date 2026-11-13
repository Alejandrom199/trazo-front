import { useMemo } from 'react';
import { create } from 'zustand';
import type { LearningWorkshop } from '@/core/registry';

/** Una clave por tipo de diagrama (la misma de siempre: el progreso ya guardado se conserva). */
const keyOf = (diagramType: string) => `trazo.learning.${diagramType}`;

/** Lo completado en un tipo de diagrama. Sin almacenamiento o con datos ilegibles, nada. */
function readProgress(diagramType: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyOf(diagramType)) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeProgress(diagramType: string, completed: string[]): void {
  try {
    localStorage.setItem(keyOf(diagramType), JSON.stringify(completed));
  } catch {
    // Modo privado o almacenamiento lleno: el progreso dura solo esta sesión.
  }
}

interface LearningProgressState {
  /** Progreso ya leído o cambiado en esta sesión, por tipo de diagrama. */
  completed: Record<string, string[]>;
  /** Marca un ejercicio como completado. Devuelve true si no lo estaba. */
  complete: (diagramType: string, exerciseId: string) => boolean;
}

/**
 * Progreso de los talleres de Aprender. Es compartido porque se completa desde dos
 * sitios: el propio taller (preguntas) y el editor (un reto corregido).
 */
export const useLearningProgressStore = create<LearningProgressState>()((set, get) => ({
  completed: {},
  complete: (diagramType, exerciseId) => {
    const current = get().completed[diagramType] ?? readProgress(diagramType);
    if (current.includes(exerciseId)) return false;
    const next = [...current, exerciseId];
    writeProgress(diagramType, next);
    set((state) => ({ completed: { ...state.completed, [diagramType]: next } }));
    return true;
  },
}));

/** Ejercicios que tiene un taller: retos, preguntas de cada enunciado y comparaciones. */
export function workshopTotal(workshop: LearningWorkshop): number {
  return workshop.correctionChallenges.length
    + workshop.briefExercises.reduce((sum, exercise) => sum + exercise.questions.length, 0)
    + workshop.comparisons.length;
}

/** Cuántos de los completados son del taller (los ids del taller empiezan por «workshop:»). */
export const workshopDone = (completed: string[]) => completed.filter((id) => id.startsWith('workshop:')).length;

export interface QuizScore {
  right: number;
  total: number;
}

const quizKey = (diagramType: string) => `trazo.quiz.${diagramType}`;

/** Aciertos acumulados del quiz de un tipo de diagrama (se conservan entre visitas). */
export function readQuizScore(diagramType: string): QuizScore {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(quizKey(diagramType)) ?? 'null');
    if (value && typeof value === 'object' && 'right' in value && 'total' in value) {
      const { right, total } = value as { right: unknown; total: unknown };
      if (typeof right === 'number' && typeof total === 'number') return { right, total };
    }
  } catch {
    // Sin almacenamiento: se empieza de cero.
  }
  return { right: 0, total: 0 };
}

export function writeQuizScore(diagramType: string, score: QuizScore): void {
  try {
    localStorage.setItem(quizKey(diagramType), JSON.stringify(score));
  } catch {
    // Sin almacenamiento los aciertos duran solo esta visita.
  }
}

/** Ejercicios completados de un tipo de diagrama; se actualiza al completar uno. */
export function useLearningProgress(diagramType: string): string[] {
  const cached = useLearningProgressStore((state) => state.completed[diagramType]);
  return useMemo(() => cached ?? readProgress(diagramType), [cached, diagramType]);
}
