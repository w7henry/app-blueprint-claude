// Double progression (workout.md):
//   Hit the top of the rep range on every prescribed set → add one increment next time.
//   Otherwise → same weight, aim for more reps.
// Edge cases handled explicitly: skipped sets, sets logged without values,
// swapped exercises (history is per performed exercise), unit switches and
// phase changes (rep range changed between sessions).

import type { Exercise, Prescription } from '../../creators/schema';
import type { SetLog } from './types';
import { displayWeight, formatWeight, snap, type Unit } from './units';

export type SuggestionAction = 'start' | 'increase' | 'repeat' | 'more-reps' | 'harder' | 'no-data';

export interface Suggestion {
  action: SuggestionAction;
  /** Weight to prefill, in the member's unit. null = no weight (bodyweight/band or unknown). */
  weight: number | null;
  /** Reps (or seconds) to prefill per set. */
  reps: number[];
  /** Short, visible reasoning shown above the sets. */
  reason: string;
}

export interface LastPerformance {
  sets: SetLog[];
}

function unitLabel(ex: Pick<Exercise, 'measure'>): string {
  return ex.measure === 'seconds' ? 's' : '';
}

function listReps(sets: SetLog[], ex: Pick<Exercise, 'measure'>): string {
  return sets.map((s) => (s.reps ?? '–') + unitLabel(ex)).join(', ');
}

/**
 * The most recent completed session's sets for one exercise.
 * `history` may contain sets from many sessions; we pick the latest session that has a completed set.
 */
export function lastPerformance(history: SetLog[], exerciseId: string, excludeSessionId?: string): LastPerformance | null {
  const relevant = history.filter((s) => s.exerciseId === exerciseId && s.sessionId !== excludeSessionId);
  if (!relevant.length) return null;
  const latest = relevant.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
  const sets = relevant.filter((s) => s.sessionId === latest.sessionId).sort((a, b) => a.setIndex - b.setIndex);
  return sets.some((s) => s.completed) ? { sets } : null;
}

export function suggestNext(
  exercise: Pick<Exercise, 'load' | 'measure' | 'increment' | 'startWeight'>,
  prescription: Pick<Prescription, 'sets' | 'reps'>,
  last: LastPerformance | null,
  unit: Unit,
): Suggestion {
  const [min, max] = prescription.reps;
  const weighted = exercise.load === 'weighted';
  const step = exercise.increment[unit];
  const fill = (n: number) => Array.from({ length: prescription.sets }, () => n);

  if (!last) {
    const start = weighted && exercise.startWeight ? exercise.startWeight[unit] : null;
    return {
      action: 'start',
      weight: start,
      reps: fill(max),
      reason: weighted
        ? 'First time: pick a weight you could lift 2–3 more reps with. Clean reps first.'
        : `First time: aim for ${min}–${max}${unitLabel(exercise)} per set with good form.`,
    };
  }

  const completed = last.sets.filter((s) => s.completed);
  const prev = last.sets[0];
  const [prevMin, prevMax] = prev.range;
  const prescribedBefore = prev.prescribedSets;
  const skipped = completed.length < prescribedBefore;
  const withReps = completed.filter((s) => s.reps !== null);
  const allTop = !skipped && withReps.length === completed.length && withReps.every((s) => (s.reps as number) >= prevMax);
  const lastReps = (i: number) => {
    const s = completed[i] ?? completed[completed.length - 1];
    return s?.reps ?? max;
  };
  // Prefill reps per set with last time's numbers, clamped to the current range.
  const repeatReps = Array.from({ length: prescription.sets }, (_, i) => Math.min(max, Math.max(min, lastReps(i))));

  // ---- bodyweight / band / timed: progress reps, then make it harder
  if (!weighted) {
    if (allTop) {
      return {
        action: 'harder',
        weight: null,
        reps: fill(max),
        reason: `Last time: ${listReps(completed, exercise)} → you hit the top. Slow the lowering to 3 seconds or add a pause.`,
      };
    }
    return {
      action: 'more-reps',
      weight: null,
      reps: repeatReps,
      reason: skipped
        ? 'You skipped a set last time. Same goal today: finish every set.'
        : `Last time: ${listReps(completed, exercise)} → beat one of those today.`,
    };
  }

  // ---- weighted
  const weights = completed.map((s) => s.weightKg).filter((w): w is number => w !== null);
  if (!weights.length) {
    return {
      action: 'no-data',
      weight: exercise.startWeight ? exercise.startWeight[unit] : null,
      reps: repeatReps,
      reason: 'No weight logged last time. Log it today so I can plan your next step.',
    };
  }
  const topKg = Math.max(...weights);
  const loggedUnit = completed.find((s) => s.weightKg === topKg)?.unit ?? unit;
  // Same unit → exact value. Unit switched → snap onto the new unit's plate grid.
  const base = loggedUnit === unit ? displayWeight(topKg, unit) : snap(displayWeight(topKg, unit), step);
  const lastStr = `${formatWeight(displayWeight(topKg, loggedUnit), loggedUnit)} × ${listReps(completed, exercise)}`;

  const heavierPhase = max < prevMin; // e.g. 10–12 → 6–8
  const lighterPhase = min > prevMax; // e.g. 6–8 → 12–15

  if (lighterPhase) {
    return { action: 'repeat', weight: base, reps: fill(min), reason: `New phase, more reps. Last time: ${lastStr} → stay at ${formatWeight(base, unit)}.` };
  }
  if (allTop || (heavierPhase && !skipped)) {
    const next = Math.round((base + step) * 100) / 100;
    return {
      action: 'increase',
      weight: next,
      reps: fill(min),
      reason: heavierPhase
        ? `New phase, fewer reps. Last time: ${lastStr} → try ${formatWeight(next, unit)} today.`
        : `Last time: ${lastStr} → try ${formatWeight(next, unit)} today.`,
    };
  }
  if (skipped) {
    return { action: 'repeat', weight: base, reps: repeatReps, reason: `You skipped a set last time (${lastStr}). Same weight, finish all sets today.` };
  }
  return { action: 'repeat', weight: base, reps: repeatReps, reason: `Last time: ${lastStr} → stay at ${formatWeight(base, unit)} and beat those reps.` };
}

/** Epley estimated 1RM, used to detect personal bests. */
export function estimatedMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

export interface PersonalBest {
  exerciseId: string;
  weightKg: number | null;
  reps: number;
  score: number;
}

/** Best set of a list (by e1RM for weighted, reps for bodyweight). */
export function bestSet(sets: SetLog[], weighted: boolean): PersonalBest | null {
  let best: PersonalBest | null = null;
  for (const s of sets) {
    if (!s.completed || s.reps === null) continue;
    if (weighted && s.weightKg === null) continue;
    const score = weighted ? estimatedMax(s.weightKg as number, s.reps) : s.reps;
    if (!best || score > best.score) best = { exerciseId: s.exerciseId, weightKg: s.weightKg, reps: s.reps, score };
  }
  return best;
}

/**
 * Exercises in `session` that beat every earlier session.
 * The very first session of an exercise is a starting point, not a PR.
 */
export function findPRs(sessionSets: SetLog[], earlierSets: SetLog[], isWeighted: (exerciseId: string) => boolean): PersonalBest[] {
  const byExercise = new Map<string, SetLog[]>();
  for (const s of sessionSets) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);
  const prs: PersonalBest[] = [];
  for (const [exerciseId, sets] of byExercise) {
    const weighted = isWeighted(exerciseId);
    const now = bestSet(sets, weighted);
    const before = bestSet(
      earlierSets.filter((s) => s.exerciseId === exerciseId),
      weighted,
    );
    if (now && before && now.score > before.score + 1e-9) prs.push(now);
  }
  return prs;
}
