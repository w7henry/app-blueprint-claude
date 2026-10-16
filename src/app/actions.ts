// User actions that touch several modules (store + analytics + sync).

import { track } from '../lib/analytics';
import { findPRs } from '../shared/progression';
import type { SessionLog } from '../shared/types';
import { syncNow } from './sync';
import { finishActive, getData, startWorkout } from './store';
import { derivePlan, exercise } from './usePlan';

export function beginWorkout(): boolean {
  const plan = derivePlan(getData());
  if (!plan) return false;
  if (getData().active) return true; // resume
  if (!plan.next) return false;
  const first = plan.allCompleted.length === 0;
  startWorkout(plan.next.key, plan.program.id);
  const props = { program: plan.program.id, workout: plan.next.workout.id, week: plan.next.programWeek };
  track('workout_started', props);
  if (first) track('first_workout_started', props, { once: 'first_workout_started' });
  return true;
}

export interface FinishResult {
  session: SessionLog;
  first: boolean;
  prs: { exerciseId: string; weightKg: number | null; reps: number }[];
  setsDone: number;
}

export function completeWorkout(): FinishResult | null {
  const before = getData();
  const plan = derivePlan(before);
  const active = before.active;
  if (!plan || !active) return null;
  const slot = plan.slots.find((s) => s.key === active.slotKey);
  const first = plan.allCompleted.length === 0;
  const session = finishActive('completed', slot?.workout.id ?? 'unknown', slot?.workout.name ?? 'Workout');
  if (!session) return null;
  const after = getData();
  const sessionSets = after.sets.filter((s) => s.sessionId === session.id && s.completed);
  const earlier = after.sets.filter((s) => s.sessionId !== session.id && s.completed);
  const prs = findPRs(sessionSets, earlier, (id) => exercise(id)?.load === 'weighted');

  const minutes = Math.round((session.durationSec ?? 0) / 60);
  track('workout_completed', { program: session.programId, workout: session.workoutId, duration_min: minutes, sets: sessionSets.length });
  if (first) track('first_workout_completed', { program: session.programId, duration_min: minutes }, { once: 'first_workout_completed' });
  for (const pr of prs) track('pr_achieved', { exercise: pr.exerciseId });
  void syncNow();
  return { session, first, prs, setsDone: sessionSets.length };
}

export function abandonWorkout(exerciseIndex: number, exerciseId: string): void {
  const plan = derivePlan(getData());
  const active = getData().active;
  if (!plan || !active) return;
  const slot = plan.slots.find((s) => s.key === active.slotKey);
  finishActive('abandoned', slot?.workout.id ?? 'unknown', slot?.workout.name ?? 'Workout');
  track('workout_abandoned', { program: plan.program.id, workout: slot?.workout.id ?? null, exercise_index: exerciseIndex, exercise: exerciseId });
  void syncNow();
}
