import { describe, expect, it } from 'vitest';
import { loadCreator } from '../creators';
import { buildSlots, calendarWeeks, nextSlot, nextTrainingDate, scheduleShort, scheduleSentence } from '../src/shared/plan';
import { isComplete, resolvePlan, sanitizeAnswers } from '../src/shared/quiz';
import { fill } from '../src/shared/template';

const { creator } = loadCreator('ayria');
const program = (id: string) => creator.programs.find((p) => p.id === id)!;

describe('resolvePlan (deterministic quiz mapping from config)', () => {
  const base = { goal: 'glutes', experience: 'new', location: 'gym', days: '3', session: 'normal', blocker: 'plan' };

  it('gym beginner → Foundations on Mon/Wed/Fri', () => {
    const p = resolvePlan(creator, base);
    expect(p.programId).toBe('foundations');
    expect(p.schedule).toEqual(['mon', 'wed', 'fri']);
    expect(p.shortSessions).toBe(false);
  });

  it('home always wins → Home program', () => {
    expect(resolvePlan(creator, { ...base, location: 'home', experience: 'year' }).programId).toBe('home');
  });

  it('6+ months experience at the gym → Growth', () => {
    expect(resolvePlan(creator, { ...base, experience: 'six12', days: '4' }).programId).toBe('growth');
  });

  it('beginner asking for 4 days → Foundations on a 3-day schedule, with a note', () => {
    const p = resolvePlan(creator, { ...base, days: '4' });
    expect(p.programId).toBe('foundations');
    expect(p.daysKey).toBe('3');
    expect(p.note).toBeTruthy();
  });

  it('same answers → same plan, every time', () => {
    expect(resolvePlan(creator, base)).toEqual(resolvePlan(creator, { ...base }));
  });

  it('short sessions flag', () => {
    expect(resolvePlan(creator, { ...base, session: 'short' }).shortSessions).toBe(true);
  });

  it('completeness and sanitising', () => {
    expect(isComplete(creator, base)).toBe(true);
    expect(isComplete(creator, { goal: 'glutes' })).toBe(false);
    expect(sanitizeAnswers(creator, { goal: 'nope', experience: 'new' })).toEqual({ experience: 'new' });
  });
});

describe('buildSlots', () => {
  it('Foundations: 8 weeks × 3 workouts', () => {
    const slots = buildSlots(program('foundations'), { schedule: ['mon', 'wed', 'fri'], shortSessions: false });
    expect(slots).toHaveLength(24);
    expect(slots[0].key).toBe('learn.w1.glutes-hams');
    expect(slots[23].programWeek).toBe(8);
    expect(calendarWeeks(slots, ['mon', 'wed', 'fri'])).toBe(8);
  });

  it('Growth: optional 4th workout only for 4-day schedules', () => {
    expect(buildSlots(program('growth'), { schedule: ['mon', 'wed', 'fri'], shortSessions: false })).toHaveLength(24);
    expect(buildSlots(program('growth'), { schedule: ['mon', 'tue', 'thu', 'fri'], shortSessions: false })).toHaveLength(32);
  });

  it('2 days a week: same sequence, honest longer duration', () => {
    const slots = buildSlots(program('foundations'), { schedule: ['mon', 'thu'], shortSessions: false });
    expect(calendarWeeks(slots, ['mon', 'thu'])).toBe(12);
  });

  it('short sessions drop finishers', () => {
    const full = buildSlots(program('foundations'), { schedule: ['mon'], shortSessions: false })[0];
    const short = buildSlots(program('foundations'), { schedule: ['mon'], shortSessions: true })[0];
    expect(short.workout.exercises.length).toBe(full.workout.exercises.length - 1);
    expect(short.workout.exercises.some((e) => e.finisher)).toBe(false);
  });

  it('nextSlot: missed days never skip a workout, duplicates are harmless', () => {
    const slots = buildSlots(program('foundations'), { schedule: ['mon', 'wed', 'fri'], shortSessions: false });
    expect(nextSlot(slots, new Set())?.index).toBe(0);
    expect(nextSlot(slots, new Set([slots[0].key, slots[0].key, slots[1].key]))?.index).toBe(2);
    expect(nextSlot(slots, new Set(slots.map((s) => s.key)))).toBeNull();
  });
});

describe('schedule helpers', () => {
  it('formats days', () => {
    expect(scheduleShort(['fri', 'mon', 'wed'])).toBe('Mon · Wed · Fri');
    expect(scheduleSentence(['mon', 'wed', 'fri'])).toBe('Mon, Wed and Fri');
  });
  it('next training date', () => {
    const tue = new Date('2026-10-13T09:00:00');
    expect(nextTrainingDate(tue, ['mon', 'wed', 'fri']).getDay()).toBe(3);
    expect(nextTrainingDate(new Date('2026-10-14T09:00:00'), ['wed'], true).getDate()).toBe(14);
  });
});

describe('template', () => {
  it('fills placeholders and never leaks raw braces', () => {
    expect(fill('Hi {{name}}, {{missing}}!', { name: 'Ayria' })).toBe('Hi Ayria, !');
  });
});
