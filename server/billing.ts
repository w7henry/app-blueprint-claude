// Stripe ↔ Supabase. Every function here is idempotent: it may run twice for
// the same Stripe object (webhook retry + success-page fulfilment) safely.

import type Stripe from 'stripe';
import { resolvePlan } from '../src/shared/quiz';
import { formatLongDate, formatMoney } from '../src/shared/format';
import { lifecycleEvents, mapSubscription, unpackAnswers, type SubscriptionRecord } from './billing-logic';
import type { Ctx } from './context';
import { sendEmail } from './emails';
import { logEvent } from './events';
import { ensureUser, loginUrl } from './users';

// ---------------------------------------------------------------- prices

const priceCache = new Map<string, { price: Stripe.Price; at: number }>();

export async function priceForLookupKey(ctx: Ctx, key: string): Promise<Stripe.Price> {
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.price;
  const { data } = await ctx.stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (!data[0]) throw new Error(`No active Stripe price with lookup key "${key}". Run: npm run stripe:setup`);
  priceCache.set(key, { price: data[0], at: Date.now() });
  return data[0];
}

// ---------------------------------------------------------------- subscription rows

export async function upsertSubscription(
  ctx: Ctx,
  userId: string,
  sub: Stripe.Subscription,
  extra: { src?: string | null; checkoutSessionId?: string | null } = {},
) {
  const next = mapSubscription(ctx.creator, sub);
  const { data: prev } = await ctx.db.from('subscriptions').select('status,plan_id,cancel_at_period_end').eq('stripe_subscription_id', sub.id).maybeSingle();
  const row = {
    ...next,
    user_id: userId,
    creator_slug: ctx.creator.identity.slug,
    ...(extra.src !== undefined ? { src: extra.src } : {}),
    ...(extra.checkoutSessionId ? { stripe_checkout_session_id: extra.checkoutSessionId } : {}),
  };
  const { error } = await ctx.db.from('subscriptions').upsert(row, { onConflict: 'stripe_subscription_id' });
  if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
  for (const ev of lifecycleEvents(prev as SubscriptionRecord | null, next)) {
    await logEvent(ctx, {
      name: ev.name,
      userId,
      props: ev.props,
      dedupeKey: `${sub.id}:${ev.name}:${next.status}:${next.cancel_at_period_end}:${next.plan_id}`,
    });
  }
  return next;
}

async function userIdForSubscription(ctx: Ctx, sub: Stripe.Subscription): Promise<string | null> {
  const { data } = await ctx.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', sub.id).maybeSingle();
  if (data?.user_id) return data.user_id as string;
  return sub.metadata?.user_id || null;
}

// ---------------------------------------------------------------- fulfilment

export interface Fulfilled {
  userId: string;
  email: string;
  created: boolean;
}

/** Turns a completed Checkout Session into an account + access. Safe to call repeatedly. */
export async function fulfillCheckout(ctx: Ctx, sessionId: string): Promise<Fulfilled> {
  const session = await ctx.stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription', 'line_items'] });
  if (session.status !== 'complete' || (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required')) {
    throw new Error(`Checkout ${sessionId} not paid (status ${session.status}/${session.payment_status})`);
  }
  if (session.metadata?.creator && session.metadata.creator !== ctx.creator.identity.slug) throw new Error('Checkout belongs to another creator');
  const email = (session.customer_details?.email ?? session.customer_email ?? '').toLowerCase();
  if (!email) throw new Error('Checkout without email');

  const md = session.metadata ?? {};
  const userId = await ensureUser(ctx, email);
  const src = md.src || null;

  // Access first — this is what the member paid for.
  let planLabel = md.plan;
  if (session.mode === 'subscription' && session.subscription) {
    const sub = typeof session.subscription === 'string' ? await ctx.stripe.subscriptions.retrieve(session.subscription) : session.subscription;
    if (!sub.metadata?.user_id) await ctx.stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, user_id: userId } });
    await upsertSubscription(ctx, userId, sub, { src, checkoutSessionId: session.id });
  } else {
    const { error } = await ctx.db.from('subscriptions').upsert(
      {
        user_id: userId,
        creator_slug: ctx.creator.identity.slug,
        kind: 'one_time',
        status: 'paid',
        plan_id: null,
        program_id: md.program || ctx.creator.offer.oneTime?.programId || null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
        stripe_checkout_session_id: session.id,
        src,
      },
      { onConflict: 'stripe_checkout_session_id' },
    );
    if (error) throw new Error(`one-time upsert failed: ${error.message}`);
    planLabel = 'one_time';
    await recordPayment(ctx, {
      id: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? session.id),
      userId,
      kind: 'payment',
      amount: session.amount_total ?? 0,
      tax: session.total_details?.amount_tax ?? 0,
      currency: session.currency ?? ctx.creator.offer.currency,
      planId: 'one_time',
      src,
      isFirst: true,
    });
  }

  // Profile from the quiz — nothing gets asked twice (activation.md).
  const answers = unpackAnswers(md.answers);
  const plan = resolvePlan(ctx.creator, answers);
  const { data: existing } = await ctx.db.from('profiles').select('user_id').eq('user_id', userId).maybeSingle();
  if (!existing) {
    await ctx.db.from('profiles').insert({
      user_id: userId,
      creator_slug: ctx.creator.identity.slug,
      email,
      program_id: md.program || plan.programId,
      days_key: md.days || plan.daysKey,
      schedule: ctx.creator.quiz.schedules[md.days || plan.daysKey] ?? plan.schedule,
      short_sessions: plan.shortSessions,
      quiz: answers,
    });
  }
  await ctx.db.from('leads').update({ converted_user_id: userId }).match({ creator_slug: ctx.creator.identity.slug, email });

  // Server-side purchase events (deduped per checkout).
  const amount = session.amount_total ?? 0;
  await logEvent(ctx, {
    name: 'purchase_completed',
    userId,
    sessionId: md.analytics_session || null,
    src,
    props: { plan: planLabel ?? null, program: md.program ?? null, price_cents: amount, currency: session.currency ?? null, src, kw: md.kw ?? null },
    dedupeKey: session.id,
  });
  if (session.mode === 'subscription' && typeof session.subscription !== 'string' && session.subscription?.status === 'trialing') {
    await logEvent(ctx, {
      name: 'trial_started',
      userId,
      sessionId: md.analytics_session || null,
      src,
      props: { plan: planLabel ?? null },
      dedupeKey: session.id,
    });
  }
  // Link the anonymous funnel events of this visit to the member.
  if (md.analytics_session) await ctx.db.from('events').update({ user_id: userId }).eq('session_id', md.analytics_session).is('user_id', null);

  // Welcome mail with the login link (backup for other devices).
  const program = ctx.creator.programs.find((p) => p.id === (md.program || plan.programId)) ?? ctx.creator.programs[0];
  const firstMinutes = program.phases[0]?.workouts[0]?.minutes ?? 45;
  await sendEmail(ctx, {
    to: email,
    kind: 'welcome',
    userId,
    dedupeKey: `welcome:${session.id}`,
    vars: { program: program.name, minutes: firstMinutes },
    ctaUrl: await loginUrl(ctx, email, 'welcome_email'),
  });

  return { userId, email, created: !existing };
}

export async function recordPayment(
  ctx: Ctx,
  p: {
    id: string;
    userId: string | null;
    kind: 'payment' | 'refund';
    amount: number;
    tax: number;
    currency: string;
    planId: string | null;
    src: string | null;
    isFirst: boolean;
  },
) {
  if (p.amount <= 0) return;
  const { error } = await ctx.db.from('payments').upsert(
    {
      id: p.id,
      user_id: p.userId,
      creator_slug: ctx.creator.identity.slug,
      kind: p.kind,
      amount_cents: p.amount,
      tax_cents: p.tax,
      currency: p.currency,
      plan_id: p.planId,
      src: p.src,
      is_first: p.isFirst,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) console.error('[payments] upsert failed', error.message);
}

// ---------------------------------------------------------------- webhooks

export async function handleStripeEvent(ctx: Ctx, event: Stripe.Event): Promise<void> {
  // Idempotency: skip events we already processed; record only after success,
  // so a failure lets Stripe retry. All handlers below are upserts anyway.
  const { data: seen } = await ctx.db.from('stripe_events').select('id').eq('id', event.id).maybeSingle();
  if (seen) return;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.creator && s.metadata.creator !== ctx.creator.identity.slug) break;
      if (s.payment_status === 'paid' || s.payment_status === 'no_payment_required') await fulfillCheckout(ctx, s.id);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed': {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.metadata?.creator && sub.metadata.creator !== ctx.creator.identity.slug) break;
      const userId = await userIdForSubscription(ctx, sub);
      if (userId) await upsertSubscription(ctx, userId, sub);
      // No user yet (created fires before checkout completes) → fulfilment writes the row.
      break;
    }
    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await userIdForSubscription(ctx, sub);
      if (!userId) break;
      const { data: u } = await ctx.db.auth.admin.getUserById(userId);
      const email = u.user?.email;
      const rec = mapSubscription(ctx.creator, sub);
      const plan = ctx.creator.offer.plans.find((p) => p.id === rec.plan_id);
      if (email && rec.trial_end && plan) {
        await sendEmail(ctx, {
          to: email,
          kind: 'trialEnding',
          userId,
          dedupeKey: `trial:${sub.id}`,
          vars: {
            date: formatLongDate(rec.trial_end),
            price: formatMoney(plan.priceCents, ctx.creator.offer.currency),
            plan: `${ctx.creator.identity.appName} ${plan.label}`,
          },
          ctaUrl: `${ctx.env.appUrl}/app/settings#membership`,
        });
      }
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string | null }).subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      const subIdStr = typeof subId === 'string' ? subId : null;
      const { data: row } = subIdStr
        ? await ctx.db.from('subscriptions').select('user_id,plan_id,src').eq('stripe_subscription_id', subIdStr).maybeSingle()
        : { data: null };
      const tax = (inv as unknown as { tax?: number | null }).tax ?? inv.total_taxes?.reduce((s, t) => s + t.amount, 0) ?? 0;
      await recordPayment(ctx, {
        id: inv.id!,
        userId: (row?.user_id as string) ?? null,
        kind: 'payment',
        amount: inv.amount_paid,
        tax,
        currency: inv.currency,
        planId: (row?.plan_id as string) ?? null,
        src: (row?.src as string) ?? null,
        // First money of this purchase: the creation invoice, or the first invoice after a free trial.
        isFirst: inv.billing_reason === 'subscription_create' || (inv.billing_reason === 'subscription_cycle' && !(await hasEarlierPayment(ctx, subIdStr))),
      });
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string | null }).subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      const { data: row } =
        typeof subId === 'string'
          ? await ctx.db.from('subscriptions').select('user_id,plan_id').eq('stripe_subscription_id', subId).maybeSingle()
          : { data: null };
      await logEvent(ctx, {
        name: 'payment_failed',
        userId: (row?.user_id as string) ?? null,
        props: { plan: (row?.plan_id as string) ?? null, attempt: inv.attempt_count ?? null },
        dedupeKey: `${inv.id}:${inv.attempt_count}`,
      });
      break;
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      for (const r of ch.refunds?.data ?? []) {
        await recordPayment(ctx, {
          id: r.id,
          userId: null,
          kind: 'refund',
          amount: r.amount,
          tax: 0,
          currency: r.currency,
          planId: null,
          src: null,
          isFirst: false,
        });
      }
      // A fully refunded one-time purchase ends access.
      if (ch.refunded && typeof ch.payment_intent === 'string') {
        const sessions = await ctx.stripe.checkout.sessions.list({ payment_intent: ch.payment_intent, limit: 1 });
        const s = sessions.data[0];
        if (s?.mode === 'payment') await ctx.db.from('subscriptions').update({ status: 'refunded' }).eq('stripe_checkout_session_id', s.id);
      }
      break;
    }
    default:
      break;
  }

  await ctx.db.from('stripe_events').upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true });
}

async function hasEarlierPayment(ctx: Ctx, subscriptionId: string | null): Promise<boolean> {
  if (!subscriptionId) return true;
  const { data: row } = await ctx.db.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscriptionId).maybeSingle();
  if (!row) return true;
  const { count } = await ctx.db.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', row.user_id).eq('kind', 'payment');
  return (count ?? 0) > 0;
}
