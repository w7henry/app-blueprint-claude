// Derived plan state for the signed-in member: program, ordered slots, what's
// done and what's next. Pure derivation from the local store.

import { useMemo } from 'react';
import exercises from 'virtual:exercises';
import type { Exercise, Program } from '../../creators/schema';
import { getProgram } from '../creator';
import { buildSlots, nextSlot, type Slot } from '../shared/plan';
import type { SessionLog } from '../shared/types';
import { useAppData, type AppData, type Profile } from './store';

export interface PlanState {
  profile: Profile;
  program: Program;
  slots: Slot[];
  /** Completed sessions of the current program run (after programStartedAt). */
  runSessions: SessionLog[];
  completedKeys: Set<string>;
  next: Slot | null;
  allCompleted: SessionLog[];
  data: AppData;
}

export function exercise(id: string): Exercise {
  return exercises[id];
}

export function derivePlan(data: AppData): PlanState | null {
  const profile = data.profile;
  if (!profile) return null;
  const program = getProgram(profile.programId);
  if (!program) return null;
  const slots = buildSlots(program, { schedule: profile.schedule, shortSessions: profile.shortSessions });
  const allCompleted = data.sessions.filter((s) => s.status === 'completed').sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  const runSessions = allCompleted.filter((s) => s.programId === program.id && s.startedAt >= profile.programStartedAt);
  const completedKeys = new Set(runSessions.map((s) => s.slotKey));
  return { profile, program, slots, runSessions, completedKeys, next: nextSlot(slots, completedKeys), allCompleted, data };
}

export function usePlan(): PlanState | null {
  const data = useAppData();
  return useMemo(() => derivePlan(data), [data]);
}
