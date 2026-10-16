// Turns a program into the ordered list of workouts a member works through.
// The plan is a sequence, not a calendar: a missed day never "fails" a workout,
// the next one simply waits ("Pick up where you left off").

import type { Phase, Program, Workout } from '../../creators/schema';
import { weekdays, type Weekday } from './weekdays';

export interface PlanOptions {
  schedule: Weekday[];
  shortSessions: boolean;
}

export interface Slot {
  /** Stable id within the program, e.g. "learn.w2.glutes-hams". */
  key: string;
  index: number;
  /** 1-based week across the whole program. */
  programWeek: number;
  weekInPhase: number;
  phase: Pick<Phase, 'id' | 'name' | 'summary'>;
  workout: Workout;
}

export function programWeeks(program: Program): number {
  return program.phases.reduce((sum, p) => sum + p.weeks, 0);
}

function trimForShortSessions(w: Workout): Workout {
  const kept = w.exercises.filter((e) => !e.finisher);
  return kept.length ? { ...w, exercises: kept, minutes: Math.max(10, w.minutes - 5 * (w.exercises.length - kept.length)) } : w;
}

export function buildSlots(program: Program, opts: PlanOptions): Slot[] {
  const slots: Slot[] = [];
  let programWeek = 0;
  for (const phase of program.phases) {
    for (let week = 1; week <= phase.weeks; week++) {
      programWeek++;
      const template = phase.weekOverrides[String(week)] ?? phase.workouts;
      const core = template.filter((w) => !w.optional);
      // Optional workouts only when the member trains more days than there are core workouts.
      const workouts = opts.schedule.length > core.length ? template : core;
      for (const w of workouts) {
        slots.push({
          key: `${phase.id}.w${week}.${w.id}`,
          index: slots.length,
          programWeek,
          weekInPhase: week,
          phase: { id: phase.id, name: phase.name, summary: phase.summary },
          workout: opts.shortSessions ? trimForShortSessions(w) : w,
        });
      }
    }
  }
  return slots;
}

/** First slot not yet completed, or null when the program is done. */
export function nextSlot(slots: Slot[], completedKeys: ReadonlySet<string>): Slot | null {
  return slots.find((s) => !completedKeys.has(s.key)) ?? null;
}

export function progressFraction(slots: Slot[], completedKeys: ReadonlySet<string>): number {
  if (!slots.length) return 0;
  return slots.filter((s) => completedKeys.has(s.key)).length / slots.length;
}

/** Calendar weeks the plan takes at the member's frequency (honest duration). */
export function calendarWeeks(slots: Slot[], schedule: Weekday[]): number {
  return Math.ceil(slots.length / Math.max(1, schedule.length));
}

// ---------------------------------------------------------------------------
// Calendar helpers (local time)
// ---------------------------------------------------------------------------

const JS_DAY_TO_WEEKDAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function weekdayOf(d: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[d.getDay()];
}

export function isTrainingDay(d: Date, schedule: Weekday[]): boolean {
  return schedule.includes(weekdayOf(d));
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - offset);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function nextTrainingDate(from: Date, schedule: Weekday[], includeToday = false): Date {
  const start = startOfDay(from);
  for (let i = includeToday ? 0 : 1; i <= 7; i++) {
    const d = addDays(start, i);
    if (isTrainingDay(d, schedule)) return d;
  }
  return addDays(start, 1);
}

const SHORT: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const LONG: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export function sortSchedule(schedule: Weekday[]): Weekday[] {
  return [...schedule].sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
}

/** "Mon · Wed · Fri" */
export function scheduleShort(schedule: Weekday[]): string {
  return sortSchedule(schedule)
    .map((d) => SHORT[d])
    .join(' · ');
}

/** "Mon, Wed and Fri" */
export function scheduleSentence(schedule: Weekday[]): string {
  const names = sortSchedule(schedule).map((d) => SHORT[d]);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function dayName(d: Weekday, long = false): string {
  return long ? LONG[d] : SHORT[d];
}
