import { describe, expect, it } from 'vitest';
import { dueDay3Tip, dueInactiveNudge, dueNoWorkoutReminder, dueTrainingReminder, isoWeek, localParts } from '../server/jobs/rules';

const h = (n: number) => n * 3600_000;
const t0 = new Date('2026-10-12T10:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

describe('activation & retention message rules', () => {
  it('24 h reminder only without a workout, only in its window', () => {
    expect(dueNoWorkoutReminder(t0, null, at(h(23)))).toBe(false);
    expect(dueNoWorkoutReminder(t0, null, at(h(25)))).toBe(true);
    expect(dueNoWorkoutReminder(t0, at(h(2)), at(h(25)))).toBe(false);
    expect(dueNoWorkoutReminder(t0, null, at(h(49)))).toBe(false);
  });
  it('day-3 tip window', () => {
    expect(dueDay3Tip(t0, at(h(73)))).toBe(true);
    expect(dueDay3Tip(t0, at(h(97)))).toBe(false);
  });
  it('5-day nudge only after a first workout', () => {
    expect(dueInactiveNudge(null, at(h(200)))).toBe(false);
    expect(dueInactiveNudge(t0, at(h(121)))).toBe(true);
    expect(dueInactiveNudge(t0, at(h(150)))).toBe(false);
  });
});

describe('training-day reminders', () => {
  const p = { schedule: ['mon', 'wed', 'fri'], reminderHour: 18, timezone: 'America/New_York' };
  it('fires at the local hour on a training day', () => {
    // Monday 2026-10-12 18:30 in New York = 22:30 UTC
    expect(dueTrainingReminder(p, false, new Date('2026-10-12T22:30:00Z')).due).toBe(true);
    expect(dueTrainingReminder(p, false, new Date('2026-10-12T21:30:00Z')).due).toBe(false);
  });
  it('not when she already trained, not on rest days', () => {
    expect(dueTrainingReminder(p, true, new Date('2026-10-12T22:30:00Z')).due).toBe(false);
    expect(dueTrainingReminder(p, false, new Date('2026-10-13T22:30:00Z')).due).toBe(false);
  });
  it('bad time zones fall back to UTC', () => {
    expect(localParts(new Date('2026-10-12T18:00:00Z'), 'Not/AZone').hour).toBe(18);
  });
  it('iso week', () => {
    expect(isoWeek(new Date('2026-10-12T12:00:00Z'))).toBe('2026-W42');
  });
});
