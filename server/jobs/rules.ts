// When does an automated message go out? Pure functions, unit-tested.

const H = 3600_000;
const D = 24 * H;

/** 24 h after purchase without a single completed workout (activation.md). Window: 24–48 h. */
export function dueNoWorkoutReminder(purchasedAt: Date, firstWorkoutAt: Date | null, now: Date): boolean {
  const age = now.getTime() - purchasedAt.getTime();
  return !firstWorkoutAt && age >= 24 * H && age < 48 * H;
}

/** Day-3 tip: once, between 72 and 96 h after purchase. */
export function dueDay3Tip(purchasedAt: Date, now: Date): boolean {
  const age = now.getTime() - purchasedAt.getTime();
  return age >= 3 * D && age < 4 * D;
}

/** About 5 days without a workout (retention.md), only after she has trained at least once. */
export function dueInactiveNudge(lastWorkoutAt: Date | null, now: Date): boolean {
  if (!lastWorkoutAt) return false;
  const idle = now.getTime() - lastWorkoutAt.getTime();
  return idle >= 5 * D && idle < 6 * D;
}

/** Local weekday, hour and date of `now` in the member's time zone. */
export function localParts(now: Date, timeZone: string): { weekday: string; hour: number; date: string } {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { weekday: String(parts.weekday).slice(0, 3).toLowerCase(), hour: Number(parts.hour) % 24, date: `${parts.year}-${parts.month}-${parts.day}` };
}

/** Training-day reminder at the chosen hour, at most once a day, not if she already trained today. */
export function dueTrainingReminder(
  p: { schedule: string[]; reminderHour: number; timezone: string },
  trainedTodayLocal: boolean,
  now: Date,
): { due: boolean; localDate: string } {
  const l = localParts(now, p.timezone);
  return { due: !trainedTodayLocal && p.schedule.includes(l.weekday) && l.hour === p.reminderHour, localDate: l.date };
}

export function isoWeek(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const year = x.getUTCFullYear();
  const week = Math.ceil(((x.getTime() - Date.UTC(year, 0, 1)) / D + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
