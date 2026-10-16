// Access rights. The `subscriptions` table (written only by Stripe webhooks) is
// the single source of truth; this function interprets its rows. Shared by the
// server (emails, jobs) and the app (gate, offline cache).

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  // one-time purchases
  | 'paid'
  | 'refunded';

export interface SubscriptionRow {
  kind: 'subscription' | 'one_time';
  status: SubscriptionStatus;
  plan_id: string | null;
  program_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  paused_until?: string | null;
}

export type AccessReason = 'trial' | 'active' | 'canceling' | 'grace' | 'one_time' | 'paused' | 'ended' | 'payment_failed' | 'none';

export interface Access {
  hasAccess: boolean;
  reason: AccessReason;
  /** Access is guaranteed until this moment (null = lifetime / unknown). */
  until: Date | null;
  /** 'all' for subscriptions, otherwise the program ids of one-time purchases. */
  programs: 'all' | string[];
  /** The row that granted access (or best explains the lack of it). */
  row: SubscriptionRow | null;
}

const DAY = 24 * 60 * 60 * 1000;
const date = (s: string | null | undefined) => (s ? new Date(s) : null);

function evaluate(row: SubscriptionRow, now: Date, graceDays: number): Omit<Access, 'programs' | 'row'> {
  const end = date(row.current_period_end);
  const inPeriod = !!end && end.getTime() > now.getTime();

  if (row.kind === 'one_time') {
    return row.status === 'paid' ? { hasAccess: true, reason: 'one_time', until: null } : { hasAccess: false, reason: 'ended', until: null };
  }

  switch (row.status) {
    case 'trialing':
      // Trust the status; fall back to the period end if Stripe is late.
      return { hasAccess: true, reason: 'trial', until: date(row.trial_end) ?? end };
    case 'active':
      // Cancelled for the period end: access ends exactly then, even if the final webhook is late.
      if (row.cancel_at_period_end && end && !inPeriod) return { hasAccess: false, reason: 'ended', until: end };
      if (end && !inPeriod && end.getTime() + graceDays * DAY < now.getTime()) {
        // Stale row (missed webhook): don't grant access forever.
        return { hasAccess: false, reason: 'ended', until: end };
      }
      return { hasAccess: true, reason: row.cancel_at_period_end ? 'canceling' : 'active', until: end };
    case 'canceled':
      // Canceled subscriptions keep access until the end of the paid period.
      return inPeriod ? { hasAccess: true, reason: 'canceling', until: end } : { hasAccess: false, reason: 'ended', until: end };
    case 'past_due': {
      const graceEnd = end ? new Date(end.getTime() + graceDays * DAY) : null;
      return graceEnd && graceEnd.getTime() > now.getTime()
        ? { hasAccess: true, reason: 'grace', until: graceEnd }
        : { hasAccess: false, reason: 'payment_failed', until: graceEnd };
    }
    case 'paused':
      return { hasAccess: false, reason: 'paused', until: date(row.paused_until) };
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return { hasAccess: false, reason: 'payment_failed', until: null };
    default:
      return { hasAccess: false, reason: 'ended', until: end };
  }
}

const RANK: Record<AccessReason, number> = {
  active: 9,
  trial: 8,
  canceling: 7,
  grace: 6,
  one_time: 5,
  paused: 4,
  payment_failed: 3,
  ended: 2,
  none: 1,
};

export function resolveAccess(rows: SubscriptionRow[], now: Date = new Date(), graceDays = 3): Access {
  if (!rows.length) return { hasAccess: false, reason: 'none', until: null, programs: [], row: null };

  const evaluated = rows.map((row) => ({ row, ...evaluate(row, now, graceDays) }));
  const subs = evaluated.filter((e) => e.row.kind === 'subscription' && e.hasAccess);
  const oneTimes = evaluated.filter((e) => e.row.kind === 'one_time' && e.hasAccess);

  if (subs.length) {
    const best = subs.sort((a, b) => RANK[b.reason] - RANK[a.reason] || (b.until?.getTime() ?? 0) - (a.until?.getTime() ?? 0))[0];
    return { hasAccess: true, reason: best.reason, until: best.until, programs: 'all', row: best.row };
  }
  if (oneTimes.length) {
    const programs = [...new Set(oneTimes.map((e) => e.row.program_id).filter((p): p is string => !!p))];
    return { hasAccess: true, reason: 'one_time', until: null, programs, row: oneTimes[0].row };
  }
  const best = evaluated.sort((a, b) => RANK[b.reason] - RANK[a.reason])[0];
  return { hasAccess: false, reason: best.reason, until: best.until, programs: [], row: best.row };
}

export function canUseProgram(access: Access, programId: string): boolean {
  return access.hasAccess && (access.programs === 'all' || access.programs.includes(programId));
}
