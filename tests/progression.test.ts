import { describe, expect, it } from 'vitest';
import { findPRs, lastPerformance, suggestNext } from '../src/shared/progression';
import type { SetLog } from '../src/shared/types';
import { toKg } from '../src/shared/units';

const barbell = { load: 'weighted' as const, measure: 'reps' as const, increment: { kg: 2.5, lbs: 5 }, startWeight: { kg: 20, lbs: 45 } };
const bodyweight = { load: 'bodyweight' as const, measure: 'reps' as const, increment: { kg: 0.5, lbs: 1 } };
const rx = { sets: 3, reps: [8, 10] as [number, number] };

let n = 0;
function set(partial: Partial<SetLog> & { reps: number | null }): SetLog {
  n++;
  return {
    id: `s${n}`,
    sessionId: 'sess1',
    exerciseId: 'hip-thrust',
    slotExerciseId: 'hip-thrust',
    setIndex: 0,
    weightKg: 40,
    completed: true,
    unit: 'kg',
    range: [8, 10],
    prescribedSets: 3,
    loggedAt: '2026-10-01T10:00:00Z',
    ...partial,
  };
}
const session = (reps: (number | null)[], extra: Partial<SetLog> = {}) => ({
  sets: reps.map((r, i) => set({ reps: r, setIndex: i, ...extra })),
});

describe('suggestNext — double progression', () => {
  it('first time: start weight, top of range, explains how to pick', () => {
    const s = suggestNext(barbell, rx, null, 'kg');
    expect(s.action).toBe('start');
    expect(s.weight).toBe(20);
    expect(s.reps).toEqual([10, 10, 10]);
    expect(s.reason).toMatch(/First time/);
  });

  it('all sets at the top of the range → add one increment, with visible reasoning', () => {
    const s = suggestNext(barbell, rx, session([10, 10, 10]), 'kg');
    expect(s.action).toBe('increase');
    expect(s.weight).toBe(42.5);
    expect(s.reps).toEqual([8, 8, 8]);
    expect(s.reason).toBe('Last time: 40 kg × 10, 10, 10 → try 42.5 kg today.');
  });

  it('not all sets at the top → same weight, prefill last reps', () => {
    const s = suggestNext(barbell, rx, session([10, 9, 8]), 'kg');
    expect(s.action).toBe('repeat');
    expect(s.weight).toBe(40);
    expect(s.reps).toEqual([10, 9, 8]);
    expect(s.reason).toMatch(/stay at 40 kg/);
  });

  it('a skipped set never triggers an increase, even if the done sets hit the top', () => {
    const last = { sets: [set({ reps: 10, setIndex: 0 }), set({ reps: 10, setIndex: 1 }), set({ reps: null, setIndex: 2, completed: false })] };
    const s = suggestNext(barbell, rx, last, 'kg');
    expect(s.action).toBe('repeat');
    expect(s.weight).toBe(40);
    expect(s.reason).toMatch(/skipped a set/);
  });

  it('sets ticked without values → no-data, no crash, asks to log', () => {
    const s = suggestNext(barbell, rx, session([null, null, null], { weightKg: null }), 'kg');
    expect(s.action).toBe('no-data');
    expect(s.weight).toBe(20);
    expect(s.reason).toMatch(/No weight logged/);
  });

  it('reps logged but no weight on a weighted lift → no-data', () => {
    const s = suggestNext(barbell, rx, session([10, 10, 10], { weightKg: null }), 'kg');
    expect(s.action).toBe('no-data');
  });

  it('unit switched kg → lbs: snaps onto the lbs grid, then adds one lbs increment', () => {
    // 40 kg = 88.18 lbs → snapped to 90 → +5 = 95
    const s = suggestNext(barbell, rx, session([10, 10, 10]), 'lbs');
    expect(s.weight).toBe(95);
    expect(s.reason).toBe('Last time: 40 kg × 10, 10, 10 → try 95 lbs today.');
  });

  it('same unit in lbs keeps the exact logged value (no float drift)', () => {
    const last = session([10, 9, 9], { weightKg: toKg(95, 'lbs'), unit: 'lbs' });
    const s = suggestNext(barbell, rx, last, 'lbs');
    expect(s.weight).toBe(95);
  });

  it('phase change to a heavier, lower-rep range → increase even without hitting the old top', () => {
    const s = suggestNext(barbell, { sets: 4, reps: [5, 7] }, session([12, 11, 10], { range: [10, 12] }), 'kg');
    expect(s.action).toBe('increase');
    expect(s.weight).toBe(42.5);
    expect(s.reps).toEqual([5, 5, 5, 5]);
    expect(s.reason).toMatch(/New phase, fewer reps/);
  });

  it('phase change to a lighter, higher-rep range → keep the weight', () => {
    const s = suggestNext(barbell, { sets: 3, reps: [12, 15] }, session([8, 8, 8], { range: [6, 8] }), 'kg');
    expect(s.action).toBe('repeat');
    expect(s.weight).toBe(40);
    expect(s.reps).toEqual([12, 12, 12]);
  });

  it('more sets prescribed than last time → prefills every set', () => {
    const s = suggestNext(barbell, { sets: 4, reps: [8, 10] }, session([10, 9, 8]), 'kg');
    expect(s.reps).toHaveLength(4);
    expect(s.reps[3]).toBe(8);
  });

  it('bodyweight: hit the top → make it harder, never suggests a weight', () => {
    const s = suggestNext(bodyweight, rx, session([10, 10, 10], { weightKg: null }), 'kg');
    expect(s.action).toBe('harder');
    expect(s.weight).toBeNull();
  });

  it('bodyweight: below the top → beat the reps', () => {
    const s = suggestNext(bodyweight, rx, session([9, 8, 8], { weightKg: null }), 'kg');
    expect(s.action).toBe('more-reps');
    expect(s.reps).toEqual([9, 8, 8]);
  });
});

describe('lastPerformance', () => {
  const a = [
    set({ reps: 10, sessionId: 'A', loggedAt: '2026-10-01T10:00:00Z' }),
    set({ reps: 10, sessionId: 'A', setIndex: 1, loggedAt: '2026-10-01T10:05:00Z' }),
  ];
  const b = [set({ reps: 8, sessionId: 'B', loggedAt: '2026-10-03T10:00:00Z' })];
  const swapped = [set({ reps: 12, sessionId: 'C', exerciseId: 'smith-hip-thrust', loggedAt: '2026-10-05T10:00:00Z' })];

  it('returns the most recent session for the exercise', () => {
    expect(lastPerformance([...a, ...b], 'hip-thrust')?.sets.map((s) => s.reps)).toEqual([8]);
  });

  it('a swapped exercise does not pollute the original exercise history', () => {
    expect(lastPerformance([...a, ...b, ...swapped], 'hip-thrust')?.sets[0].sessionId).toBe('B');
    expect(lastPerformance([...a, ...b, ...swapped], 'smith-hip-thrust')?.sets[0].sessionId).toBe('C');
  });

  it('ignores the current session and sessions without any completed set', () => {
    const empty = [set({ reps: null, completed: false, sessionId: 'D', loggedAt: '2026-10-09T10:00:00Z' })];
    expect(lastPerformance([...a, ...empty], 'hip-thrust')).toBeNull();
    expect(lastPerformance([...a, ...b], 'hip-thrust', 'B')?.sets[0].sessionId).toBe('A');
  });
});

describe('findPRs', () => {
  const weighted = () => true;
  it('first ever session is a starting point, not a PR', () => {
    expect(findPRs([set({ reps: 10 })], [], weighted)).toEqual([]);
  });
  it('heavier weight at the same reps is a PR', () => {
    const prs = findPRs([set({ reps: 10, weightKg: 45, sessionId: 'new' })], [set({ reps: 10, weightKg: 40 })], weighted);
    expect(prs).toHaveLength(1);
    expect(prs[0].weightKg).toBe(45);
  });
  it('same performance is not a PR', () => {
    expect(findPRs([set({ reps: 10, sessionId: 'new' })], [set({ reps: 10 })], weighted)).toEqual([]);
  });
});
