import { describe, expect, it } from 'vitest';
import { weekStreak, weeklyStats } from '../src/shared/streak';

// 2026-10-14 is a Wednesday.
const d = (s: string) => new Date(`${s}T18:00:00`);
const now = d('2026-10-14');

describe('weekStreak', () => {
  it('no workouts → 0', () => expect(weekStreak([], 3, now)).toBe(0));

  it('current week in progress does not break the streak', () => {
    const done = [d('2026-10-05'), d('2026-10-07'), d('2026-10-09'), d('2026-10-12')];
    expect(weekStreak(done, 3, now)).toBe(1);
  });

  it('counts consecutive weeks where the goal was met, a missed day changes nothing', () => {
    const done = [
      d('2026-09-28'),
      d('2026-09-30'),
      d('2026-10-03'), // goal met (3) — Sat instead of Fri is fine
      d('2026-10-05'),
      d('2026-10-06'),
      d('2026-10-09'), // goal met
      d('2026-10-12'),
      d('2026-10-13'),
      d('2026-10-14'), // this week met already
    ];
    expect(weekStreak(done, 3, now)).toBe(3);
  });

  it('a week below the goal ends the streak there', () => {
    const done = [d('2026-09-28'), d('2026-09-30'), d('2026-10-02'), d('2026-10-06'), d('2026-10-08'), d('2026-10-09')];
    const broken = [d('2026-09-28'), d('2026-10-06'), d('2026-10-08'), d('2026-10-09')];
    expect(weekStreak(done, 3, now)).toBe(2);
    expect(weekStreak(broken, 3, now)).toBe(1);
  });
});

describe('weeklyStats', () => {
  it('buckets workouts by Monday-based weeks', () => {
    const stats = weeklyStats([d('2026-10-12'), d('2026-10-14'), d('2026-10-09')], 2, now, 2);
    expect(stats.map((s) => s.done)).toEqual([1, 2]);
    expect(stats[1].met).toBe(true);
  });
});
