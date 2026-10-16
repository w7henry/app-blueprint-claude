// Weekly streak (retention.md): a week counts when the weekly goal was reached.
// A missed day never breaks anything, and the current week can't break the
// streak until it's over.

import { addDays, startOfWeek } from './plan';

export interface WeekStat {
  weekStart: Date;
  done: number;
  goal: number;
  met: boolean;
}

export function weeklyStats(completedAt: Date[], goal: number, now: Date, weeks = 8): WeekStat[] {
  const thisWeek = startOfWeek(now);
  const out: WeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(thisWeek, -7 * i);
    const we = addDays(ws, 7);
    const done = completedAt.filter((d) => d >= ws && d < we).length;
    out.push({ weekStart: ws, done, goal, met: done >= goal });
  }
  return out;
}

/** Consecutive goal-met weeks, ending with this week (if met) or last week. */
export function weekStreak(completedAt: Date[], goal: number, now: Date): number {
  if (goal <= 0) return 0;
  const thisWeek = startOfWeek(now);
  const countIn = (ws: Date) => {
    const we = addDays(ws, 7);
    return completedAt.filter((d) => d >= ws && d < we).length;
  };
  let streak = countIn(thisWeek) >= goal ? 1 : 0;
  let ws = addDays(thisWeek, -7);
  // Never look back further than the earliest workout.
  const earliest = completedAt.length ? Math.min(...completedAt.map((d) => d.getTime())) : Infinity;
  while (ws.getTime() + 7 * 864e5 > earliest && countIn(ws) >= goal) {
    streak++;
    ws = addDays(ws, -7);
  }
  return streak;
}
