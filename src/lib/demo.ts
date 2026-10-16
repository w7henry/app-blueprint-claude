// Demo mode (no backend configured): a simulated purchase stored on this device,
// so the whole flow — paywall, onboarding, workouts, cancel — can be clicked through.
// Never used when VITE_API_URL / Supabase are configured.

import creator from '../creator';
import type { SubscriptionRow } from '../shared/access';
import { readJSON, remove, writeJSON } from './storage';

const KEY = `demo:subscription:${creator.identity.slug}`;
const DAY = 864e5;

export function demoPurchase(planId: string, programId: string): SubscriptionRow {
  const now = Date.now();
  const one = planId === 'one_time';
  const plan = creator.offer.plans.find((p) => p.id === planId);
  const trial = plan?.trialDays ? new Date(now + plan.trialDays * DAY).toISOString() : null;
  const period = plan?.interval === 'year' ? 365 : 30;
  const row: SubscriptionRow = {
    kind: one ? 'one_time' : 'subscription',
    status: one ? 'paid' : trial ? 'trialing' : 'active',
    plan_id: one ? null : planId,
    program_id: one ? programId : null,
    current_period_end: one ? null : (trial ?? new Date(now + period * DAY).toISOString()),
    cancel_at_period_end: false,
    trial_end: trial,
  };
  writeJSON(KEY, row, 'local');
  return row;
}

export function demoSubscription(): SubscriptionRow | null {
  return readJSON<SubscriptionRow | null>(KEY, null, 'local');
}

export function updateDemoSubscription(patch: Partial<SubscriptionRow>): void {
  const row = demoSubscription();
  if (row) writeJSON(KEY, { ...row, ...patch }, 'local');
}

export function clearDemo(): void {
  remove(KEY, 'local');
}
