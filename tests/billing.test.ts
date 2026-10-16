// Billing end to end with fakes: checkout fulfilment, idempotent webhooks,
// cancellation keeps access until period end, lifecycle events, emails once.

import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { lifecycleEvents, mapSubscription, packAnswers, stableUuid, unpackAnswers } from '../server/billing-logic';
import { fulfillCheckout, handleStripeEvent } from '../server/billing';
import { resolveAccess, type SubscriptionRow } from '../src/shared/access';
import { fakeCtx } from './helpers/fakes';
import { loadCreator } from '../creators';

const { creator } = loadCreator('ayria');
const now = Math.floor(Date.now() / 1000);
const DAY = 86400;

function sub(p: Partial<Stripe.Subscription> & { lookup?: string; periodEnd?: number } = {}): Stripe.Subscription {
  const { lookup = 'ayria_annual_v1', periodEnd = now + 7 * DAY, ...rest } = p;
  return {
    id: 'sub_1',
    object: 'subscription',
    customer: 'cus_1',
    status: 'trialing',
    cancel_at_period_end: false,
    cancel_at: null,
    canceled_at: null,
    trial_end: now + 7 * DAY,
    pause_collection: null,
    metadata: { creator: 'ayria' },
    items: { data: [{ id: 'si_1', current_period_end: periodEnd, price: { id: 'price_x', lookup_key: lookup } }] },
    ...rest,
  } as unknown as Stripe.Subscription;
}

function setup() {
  const answers = { goal: 'glutes', experience: 'new', location: 'gym', days: '3', session: 'short', blocker: 'anxiety' };
  const f = fakeCtx({
    sessions: {
      cs_test_1: {
        id: 'cs_test_1',
        status: 'complete',
        payment_status: 'no_payment_required',
        mode: 'subscription',
        customer: 'cus_1',
        customer_details: { email: 'Member@Example.com' } as Stripe.Checkout.Session.CustomerDetails,
        amount_total: 0,
        currency: 'usd',
        created: now,
        subscription: 'sub_1',
        metadata: {
          creator: 'ayria',
          plan: 'annual',
          program: 'foundations',
          days: '3',
          answers: packAnswers(answers),
          src: 'tiktok',
          kw: 'guide',
          analytics_session: 'sess-1',
        },
      },
    },
    subscriptions: { sub_1: sub() },
  });
  return f;
}

const subRows = (db: ReturnType<typeof setup>['db']) => db.rows('subscriptions') as unknown as SubscriptionRow[];
const eventNames = (db: ReturnType<typeof setup>['db']) => db.rows('events').map((e) => e.event_name);

describe('checkout fulfilment', () => {
  it('creates account, access, profile from the quiz and the purchase event', async () => {
    const { ctx, db, sent } = setup();
    db.rows('events').push({ id: 'e0', event_name: 'landing_viewed', session_id: 'sess-1', user_id: null });
    const r = await fulfillCheckout(ctx, 'cs_test_1');
    expect(r.email).toBe('member@example.com');
    expect(subRows(db)).toHaveLength(1);
    expect(subRows(db)[0]).toMatchObject({ status: 'trialing', plan_id: 'annual', kind: 'subscription' });
    expect(resolveAccess(subRows(db)).hasAccess).toBe(true);
    const profile = db.rows('profiles')[0];
    expect(profile).toMatchObject({ program_id: 'foundations', days_key: '3', short_sessions: true });
    expect(profile.quiz).toMatchObject({ blocker: 'anxiety' });
    expect(eventNames(db)).toEqual(expect.arrayContaining(['purchase_completed', 'trial_started']));
    const purchase = db.rows('events').find((e) => e.event_name === 'purchase_completed')!;
    expect(purchase).toMatchObject({ session_id: 'sess-1', src: 'tiktok', user_id: r.userId });
    // the anonymous funnel events of that visit are now linked to the member
    expect(db.rows('events').find((e) => e.id === 'e0')!.user_id).toBe(r.userId);
    expect(sent.filter((m) => /login link/i.test(m.subject))).toHaveLength(1);
  });

  it('is idempotent: webhook + success page + retry → one row, one event, one email', async () => {
    const { ctx, db, sent } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    await fulfillCheckout(ctx, 'cs_test_1');
    const evt = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'no_payment_required', metadata: { creator: 'ayria' } } },
    } as unknown as Stripe.Event;
    await handleStripeEvent(ctx, evt);
    await handleStripeEvent(ctx, evt);
    expect(subRows(db)).toHaveLength(1);
    expect(db.rows('profiles')).toHaveLength(1);
    expect(eventNames(db).filter((n) => n === 'purchase_completed')).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(db.users).toHaveLength(1);
  });

  it('refuses unpaid sessions', async () => {
    const { ctx, stripeState } = setup();
    stripeState.sessions.cs_test_1.payment_status = 'unpaid';
    await expect(fulfillCheckout(ctx, 'cs_test_1')).rejects.toThrow(/not paid/);
  });
});

describe('subscription webhooks', () => {
  const update = (s: Stripe.Subscription, id: string) => ({ id, type: 'customer.subscription.updated', data: { object: s } }) as unknown as Stripe.Event;

  it('cancel at period end: access stays until the period ends, then it is gone', async () => {
    const { ctx, db } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    await handleStripeEvent(ctx, update(sub({ status: 'active', cancel_at_period_end: true, periodEnd: now + 20 * DAY }), 'evt_c1'));
    expect(eventNames(db)).toContain('subscription_canceled');
    expect(resolveAccess(subRows(db), new Date()).hasAccess).toBe(true);
    expect(resolveAccess(subRows(db), new Date((now + 21 * DAY) * 1000)).hasAccess).toBe(false);
    await handleStripeEvent(ctx, {
      id: 'evt_c2',
      type: 'customer.subscription.deleted',
      data: { object: sub({ status: 'canceled', canceled_at: now, periodEnd: now - 1 }) },
    } as unknown as Stripe.Event);
    expect(resolveAccess(subRows(db)).hasAccess).toBe(false);
    expect(eventNames(db).filter((n) => n === 'subscription_canceled')).toHaveLength(1);
  });

  it('trial converts and monthly → yearly upgrade are recorded once', async () => {
    const { ctx, db } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    const active = update(sub({ status: 'active', trial_end: now - 1 }), 'evt_t1');
    await handleStripeEvent(ctx, active);
    await handleStripeEvent(ctx, active);
    expect(eventNames(db).filter((n) => n === 'trial_converted')).toHaveLength(1);
    await handleStripeEvent(ctx, update(sub({ status: 'active', lookup: 'ayria_monthly_v1' }), 'evt_m'));
    await handleStripeEvent(ctx, update(sub({ status: 'active', lookup: 'ayria_annual_v1' }), 'evt_u'));
    expect(eventNames(db)).toContain('subscription_upgraded');
  });

  it('pause → no access while paused', async () => {
    const { ctx, db } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    await handleStripeEvent(
      ctx,
      update(sub({ status: 'active', pause_collection: { behavior: 'void', resumes_at: now + 30 * DAY } as Stripe.Subscription.PauseCollection }), 'evt_p'),
    );
    expect(subRows(db)[0].status).toBe('paused');
    expect(resolveAccess(subRows(db)).reason).toBe('paused');
  });

  it('invoices: payment stored once, failed payment logged', async () => {
    const { ctx, db } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    const paid = {
      id: 'evt_i',
      type: 'invoice.paid',
      data: { object: { id: 'in_1', amount_paid: 5999, currency: 'usd', billing_reason: 'subscription_cycle', subscription: 'sub_1', total_taxes: [] } },
    } as unknown as Stripe.Event;
    await handleStripeEvent(ctx, paid);
    await handleStripeEvent(ctx, { ...paid, id: 'evt_i_retry' } as Stripe.Event);
    expect(db.rows('payments')).toHaveLength(1);
    expect(db.rows('payments')[0]).toMatchObject({ amount_cents: 5999, src: 'tiktok', is_first: true });
    await handleStripeEvent(ctx, {
      id: 'evt_f',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_2', attempt_count: 1, subscription: 'sub_1' } },
    } as unknown as Stripe.Event);
    expect(eventNames(db)).toContain('payment_failed');
  });

  it('trial ending email goes out once', async () => {
    const { ctx, sent } = setup();
    await fulfillCheckout(ctx, 'cs_test_1');
    const e = { id: 'evt_tw', type: 'customer.subscription.trial_will_end', data: { object: sub() } } as unknown as Stripe.Event;
    await handleStripeEvent(ctx, e);
    await handleStripeEvent(ctx, { ...e, id: 'evt_tw2' } as Stripe.Event);
    expect(sent.filter((m) => /free week ends/i.test(m.subject))).toHaveLength(1);
  });
});

describe('pure billing helpers', () => {
  it('maps a Stripe subscription to our row', () => {
    const r = mapSubscription(creator, sub({ status: 'active', lookup: 'ayria_monthly_v1' }));
    expect(r).toMatchObject({ status: 'active', plan_id: 'monthly', stripe_customer_id: 'cus_1' });
    expect(r.current_period_end).toBeTruthy();
  });

  it('lifecycle events only on real transitions', () => {
    const base = mapSubscription(creator, sub({ status: 'active' }));
    expect(lifecycleEvents(null, base)).toEqual([]);
    expect(lifecycleEvents(base, base)).toEqual([]);
    expect(lifecycleEvents(base, { ...base, cancel_at_period_end: true }).map((e) => e.name)).toEqual(['subscription_canceled']);
  });

  it('stable uuids and answer packing', () => {
    expect(stableUuid('x')).toBe(stableUuid('x'));
    expect(stableUuid('x')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(unpackAnswers(packAnswers({ a: 'b' }))).toEqual({ a: 'b' });
    expect(unpackAnswers('not json')).toEqual({});
  });
});
