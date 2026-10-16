// Pure billing logic (no I/O), unit-tested in tests/billing.test.ts.
// Maps Stripe objects to our `subscriptions` rows and decides which
// lifecycle events a webhook represents.

import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import type { CreatorConfig } from '../creators/schema';

export interface SubscriptionRecord {
  kind: 'subscription' | 'one_time';
  status: string;
  plan_id: string | null;
  program_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  paused_until: string | null;
}

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/** Deterministic UUID from any string, so server events written twice collapse into one row. */
export function stableUuid(input: string): string {
  const h = createHash('sha256').update(input).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function planIdForLookupKey(creator: Pick<CreatorConfig, 'offer'>, lookupKey: string | null | undefined): string | null {
  if (!lookupKey) return null;
  return creator.offer.plans.find((p) => p.stripeLookupKey === lookupKey)?.id ?? null;
}

export function mapSubscription(creator: Pick<CreatorConfig, 'offer'>, sub: Stripe.Subscription): SubscriptionRecord {
  const item = sub.items?.data?.[0];
  // Newer Stripe API versions moved the period to the subscription item.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  const pausedUntil = sub.pause_collection?.resumes_at ?? null;
  const paused = !!sub.pause_collection && (!pausedUntil || pausedUntil * 1000 > Date.now());
  return {
    kind: 'subscription',
    status: paused ? 'paused' : sub.status,
    plan_id: planIdForLookupKey(creator, item?.price?.lookup_key) ?? (sub.metadata?.plan || null),
    program_id: null,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    current_period_end: iso(periodEnd),
    trial_end: iso(sub.trial_end),
    cancel_at_period_end: !!sub.cancel_at_period_end || !!sub.cancel_at,
    canceled_at: iso(sub.canceled_at),
    paused_until: paused ? iso(pausedUntil) : null,
  };
}

export type LifecycleEvent =
  | { name: 'subscription_canceled'; props: { plan: string | null; at_period_end: boolean } }
  | { name: 'subscription_upgraded'; props: { from: string | null; to: string | null } }
  | { name: 'trial_converted'; props: { plan: string | null } };

/** Which analytics events does a subscription change represent? prev = our stored row (or null). */
export function lifecycleEvents(
  prev: Pick<SubscriptionRecord, 'status' | 'plan_id' | 'cancel_at_period_end'> | null,
  next: SubscriptionRecord,
): LifecycleEvent[] {
  const out: LifecycleEvent[] = [];
  if (!prev) return out;
  if (!prev.cancel_at_period_end && next.cancel_at_period_end && next.status !== 'canceled') {
    out.push({ name: 'subscription_canceled', props: { plan: next.plan_id, at_period_end: true } });
  }
  if (prev.status !== 'canceled' && next.status === 'canceled' && !prev.cancel_at_period_end) {
    out.push({ name: 'subscription_canceled', props: { plan: next.plan_id, at_period_end: false } });
  }
  if (prev.plan_id === 'monthly' && next.plan_id === 'annual') {
    out.push({ name: 'subscription_upgraded', props: { from: prev.plan_id, to: next.plan_id } });
  }
  if (prev.status === 'trialing' && next.status === 'active') {
    out.push({ name: 'trial_converted', props: { plan: next.plan_id } });
  }
  return out;
}

/** Quiz answers travel in Stripe metadata (max 500 chars per value). */
export function packAnswers(answers: Record<string, string>): string {
  const s = JSON.stringify(answers);
  return s.length <= 500 ? s : '{}';
}

export function unpackAnswers(s: string | undefined | null): Record<string, string> {
  try {
    const v = JSON.parse(s ?? '{}') as unknown;
    if (!v || typeof v !== 'object') return {};
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === 'string')) as Record<string, string>;
  } catch {
    return {};
  }
}
