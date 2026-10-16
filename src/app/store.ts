// Local-first app data. Everything a workout needs lives on the device, so a
// session runs with zero signal (gyms!). Changes are marked dirty and synced
// to Supabase later (sync.ts); client UUIDs make re-syncs idempotent.

import { useSyncExternalStore } from 'react';
import creator from '../creator';
import { uuid } from '../lib/ids';
import { readJSON, writeJSON } from '../lib/storage';
import type { Weekday } from '../../creators/schema';
import type { QuizAnswers } from '../shared/quiz';
import type { SessionLog, SetLog } from '../shared/types';
import type { Unit } from '../shared/units';

export interface Profile {
  programId: string;
  daysKey: string;
  schedule: Weekday[];
  shortSessions: boolean;
  answers: QuizAnswers;
  unit: Unit;
  programStartedAt: string;
  reminders: { push: boolean; email: boolean; hour: number };
  remindersAsked: boolean;
  installShown: boolean;
  firstWorkoutScheduledFor: string | null;
  completedPrograms: string[];
  timezone: string;
  updatedAt: string;
}

export interface DraftSet {
  weight: number | null;
  reps: number | null;
  done: boolean;
  logId: string | null;
}

export interface ActiveWorkout {
  sessionId: string;
  slotKey: string;
  programId: string;
  startedAt: string;
  exerciseIndex: number;
  /** slot exercise index → exercise actually performed */
  swaps: Record<number, string>;
  drafts: Record<number, DraftSet[]>;
  /** Timestamp (ms). The countdown is derived from it, so it survives a locked screen. */
  restEndsAt: number | null;
  restTotalSec: number;
}

export interface AppData {
  profile: Profile | null;
  sessions: SessionLog[];
  sets: SetLog[];
  active: ActiveWorkout | null;
  dirty: { sessions: string[]; sets: string[]; profile: boolean };
  lastSyncAt: string | null;
}

const empty = (): AppData => ({ profile: null, sessions: [], sets: [], active: null, dirty: { sessions: [], sets: [], profile: false }, lastSyncAt: null });

let key = '';
let data: AppData = empty();
const listeners = new Set<() => void>();

function emit() {
  writeJSON(key, data, 'local');
  listeners.forEach((l) => l());
}

/** Load the store for one account (or "demo"). */
export function openStore(userKey: string): void {
  const k = `app:${creator.identity.slug}:${userKey}`;
  if (k === key) return;
  key = k;
  data = { ...empty(), ...readJSON<AppData>(key, empty(), 'local') };
  listeners.forEach((l) => l());
}

export function getData(): AppData {
  return data;
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
    () => data,
  );
}

function update(fn: (d: AppData) => AppData) {
  data = fn(data);
  emit();
}

const addUnique = (list: string[], ...ids: string[]) => [...new Set([...list, ...ids])];

// ---------------------------------------------------------------- profile

export function setProfile(patch: Partial<Profile>): void {
  update((d) => {
    if (!d.profile && !patch.programId) return d;
    const base = d.profile ?? defaultProfile(patch);
    return { ...d, profile: { ...base, ...patch, updatedAt: new Date().toISOString() }, dirty: { ...d.dirty, profile: true } };
  });
}

function defaultProfile(p: Partial<Profile>): Profile {
  return {
    programId: p.programId ?? creator.quiz.defaultProgram,
    daysKey: p.daysKey ?? '3',
    schedule: p.schedule ?? ['mon', 'wed', 'fri'],
    shortSessions: false,
    answers: {},
    unit: 'kg',
    programStartedAt: new Date().toISOString(),
    reminders: { push: false, email: true, hour: 17 },
    remindersAsked: false,
    installShown: false,
    firstWorkoutScheduledFor: null,
    completedPrograms: [],
    timezone: localTimezone(),
    updatedAt: new Date().toISOString(),
  };
}

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Replace the profile from the server without marking it dirty. */
export function hydrateProfile(profile: Profile): void {
  update((d) => (d.dirty.profile && d.profile ? d : { ...d, profile }));
}

// ---------------------------------------------------------------- workouts

export function startWorkout(slotKey: string, programId: string): ActiveWorkout {
  const now = new Date().toISOString();
  const active: ActiveWorkout = {
    sessionId: uuid(),
    slotKey,
    programId,
    startedAt: now,
    exerciseIndex: 0,
    swaps: {},
    drafts: {},
    restEndsAt: null,
    restTotalSec: 0,
  };
  update((d) => ({ ...d, active }));
  return active;
}

export function updateActive(patch: Partial<ActiveWorkout> | ((a: ActiveWorkout) => Partial<ActiveWorkout>)): void {
  update((d) => {
    if (!d.active) return d;
    const p = typeof patch === 'function' ? patch(d.active) : patch;
    return { ...d, active: { ...d.active, ...p } };
  });
}

export function upsertSet(set: SetLog): void {
  update((d) => {
    const exists = d.sets.some((s) => s.id === set.id);
    const sets = exists ? d.sets.map((s) => (s.id === set.id ? set : s)) : [...d.sets, set];
    return { ...d, sets, dirty: { ...d.dirty, sets: addUnique(d.dirty.sets, set.id) } };
  });
}

export function finishActive(status: 'completed' | 'abandoned', workoutId: string, workoutName: string): SessionLog | null {
  const a = data.active;
  if (!a) return null;
  const end = new Date();
  const session: SessionLog = {
    id: a.sessionId,
    programId: a.programId,
    slotKey: a.slotKey,
    workoutId,
    workoutName,
    startedAt: a.startedAt,
    completedAt: status === 'completed' ? end.toISOString() : null,
    status,
    durationSec: Math.round((end.getTime() - new Date(a.startedAt).getTime()) / 1000),
  };
  update((d) => ({
    ...d,
    active: null,
    sessions: [...d.sessions.filter((s) => s.id !== session.id), session],
    dirty: { ...d.dirty, sessions: addUnique(d.dirty.sessions, session.id) },
  }));
  return session;
}

/** Merge rows from the server. Local unsynced rows always win. */
export function mergeRemote(sessions: SessionLog[], sets: SetLog[]): void {
  update((d) => {
    const dirtySessions = new Set(d.dirty.sessions);
    const dirtySets = new Set(d.dirty.sets);
    const s = new Map(d.sessions.map((x) => [x.id, x]));
    for (const r of sessions) if (!dirtySessions.has(r.id)) s.set(r.id, r);
    const st = new Map(d.sets.map((x) => [x.id, x]));
    for (const r of sets) if (!dirtySets.has(r.id)) st.set(r.id, r);
    return { ...d, sessions: [...s.values()], sets: [...st.values()] };
  });
}

export function markSynced(sessionIds: string[], setIds: string[], profile: boolean): void {
  update((d) => ({
    ...d,
    lastSyncAt: new Date().toISOString(),
    dirty: {
      sessions: d.dirty.sessions.filter((id) => !sessionIds.includes(id)),
      sets: d.dirty.sets.filter((id) => !setIds.includes(id)),
      profile: profile ? false : d.dirty.profile,
    },
  }));
}

export function completedSessions(d: AppData = data, programId?: string): SessionLog[] {
  return d.sessions
    .filter((s) => s.status === 'completed' && (!programId || s.programId === programId))
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
}

export function wipeStore(): void {
  data = empty();
  emit();
}
