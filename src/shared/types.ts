// Records the app stores locally (offline-first) and syncs to Supabase.
// Ids are client-generated UUIDs, so retries and re-syncs can never duplicate rows.

import type { Unit } from './units';

export interface SetLog {
  id: string;
  sessionId: string;
  /** Exercise actually performed (after a swap). */
  exerciseId: string;
  /** Exercise the plan prescribed in this slot. */
  slotExerciseId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
  /** Unit the member used when logging (for display and edge cases). */
  unit: Unit;
  /** Prescription at the time of logging, so progression survives phase changes. */
  range: [number, number];
  prescribedSets: number;
  loggedAt: string;
}

export interface SessionLog {
  id: string;
  programId: string;
  slotKey: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  completedAt: string | null;
  status: 'active' | 'completed' | 'abandoned';
  durationSec: number | null;
}
