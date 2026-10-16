// Offline sync: pushes dirty sessions/sets/profile to Supabase with upserts on
// client-generated ids (no duplicates, safe to retry), pulls on a new device.

import creator from '../creator';
import { DEMO } from '../lib/env';
import type { SessionLog, SetLog } from '../shared/types';
import { getAuth } from './auth';
import { getData, hydrateProfile, markSynced, mergeRemote, type Profile } from './store';
import { supabase } from './supabase';

let running = false;

const sessionRow = (s: SessionLog, userId: string) => ({
  id: s.id,
  user_id: userId,
  creator_slug: creator.identity.slug,
  program_id: s.programId,
  slot_key: s.slotKey,
  workout_id: s.workoutId,
  workout_name: s.workoutName,
  started_at: s.startedAt,
  completed_at: s.completedAt,
  status: s.status,
  duration_sec: s.durationSec,
});

const setRow = (s: SetLog, userId: string) => ({
  id: s.id,
  user_id: userId,
  session_id: s.sessionId,
  exercise_id: s.exerciseId,
  slot_exercise_id: s.slotExerciseId,
  set_index: s.setIndex,
  weight_kg: s.weightKg,
  reps: s.reps,
  completed: s.completed,
  unit: s.unit,
  range_min: s.range[0],
  range_max: s.range[1],
  prescribed_sets: s.prescribedSets,
  logged_at: s.loggedAt,
});

const profileRow = (p: Profile, userId: string) => ({
  user_id: userId,
  creator_slug: creator.identity.slug,
  program_id: p.programId,
  days_key: p.daysKey,
  schedule: p.schedule,
  short_sessions: p.shortSessions,
  quiz: p.answers,
  unit: p.unit,
  program_started_at: p.programStartedAt,
  reminder_push: p.reminders.push,
  reminder_email: p.reminders.email,
  reminder_hour: p.reminders.hour,
  completed_programs: p.completedPrograms,
  timezone: p.timezone,
  updated_at: p.updatedAt,
});

export async function syncNow(): Promise<void> {
  const auth = getAuth();
  if (DEMO || running || auth.status !== 'signed-in' || !navigator.onLine) return;
  const d = getData();
  if (!d.dirty.sessions.length && !d.dirty.sets.length && !d.dirty.profile) return;
  running = true;
  try {
    const sb = supabase();
    const sessions = d.sessions.filter((s) => d.dirty.sessions.includes(s.id));
    const sets = d.sets.filter((s) => d.dirty.sets.includes(s.id));
    // Sessions first: set_logs reference them.
    if (sessions.length) {
      const { error } = await sb.from('workout_sessions').upsert(
        sessions.map((s) => sessionRow(s, auth.userId)),
        { onConflict: 'id' },
      );
      if (error) throw error;
    }
    // Sets of a still-running workout reference a session row that doesn't exist yet → hold them back.
    const known = new Set(d.sessions.map((s) => s.id));
    const ready = sets.filter((s) => known.has(s.sessionId));
    if (ready.length) {
      const { error } = await sb.from('set_logs').upsert(
        ready.map((s) => setRow(s, auth.userId)),
        { onConflict: 'id' },
      );
      if (error) throw error;
    }
    if (d.dirty.profile && d.profile) {
      const { error } = await sb.from('profiles').upsert(profileRow(d.profile, auth.userId), { onConflict: 'user_id' });
      if (error) throw error;
    }
    markSynced(
      sessions.map((s) => s.id),
      ready.map((s) => s.id),
      !!d.dirty.profile,
    );
  } catch {
    /* stays dirty, retried on the next trigger */
  } finally {
    running = false;
  }
}

/** First load on a device: pull history and profile from the server. */
export async function pullAll(): Promise<void> {
  const auth = getAuth();
  if (DEMO || auth.status !== 'signed-in') return;
  try {
    const sb = supabase();
    const [p, s, st] = await Promise.all([
      sb.from('profiles').select('*').eq('user_id', auth.userId).maybeSingle(),
      sb.from('workout_sessions').select('*').eq('user_id', auth.userId),
      sb.from('set_logs').select('*').eq('user_id', auth.userId),
    ]);
    if (p.data) {
      const r = p.data;
      hydrateProfile({
        programId: r.program_id,
        daysKey: r.days_key,
        schedule: r.schedule,
        shortSessions: r.short_sessions,
        answers: r.quiz ?? {},
        unit: r.unit,
        programStartedAt: r.program_started_at,
        reminders: { push: r.reminder_push, email: r.reminder_email, hour: r.reminder_hour },
        remindersAsked: true,
        installShown: true,
        firstWorkoutScheduledFor: null,
        completedPrograms: r.completed_programs ?? [],
        timezone: r.timezone ?? 'UTC',
        updatedAt: r.updated_at,
      });
    }
    mergeRemote(
      (s.data ?? []).map((r) => ({
        id: r.id,
        programId: r.program_id,
        slotKey: r.slot_key,
        workoutId: r.workout_id,
        workoutName: r.workout_name,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        status: r.status,
        durationSec: r.duration_sec,
      })),
      (st.data ?? []).map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        exerciseId: r.exercise_id,
        slotExerciseId: r.slot_exercise_id,
        setIndex: r.set_index,
        weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
        reps: r.reps,
        completed: r.completed,
        unit: r.unit,
        range: [r.range_min, r.range_max],
        prescribedSets: r.prescribed_sets,
        loggedAt: r.logged_at,
      })),
    );
  } catch {
    /* offline: local data is used */
  }
}

let wired = false;
export function wireSync(): void {
  if (wired || DEMO) return;
  wired = true;
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncNow();
  });
  setInterval(() => void syncNow(), 60_000);
}
