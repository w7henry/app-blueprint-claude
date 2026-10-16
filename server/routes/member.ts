// Endpoints for logged-in members: membership changes, billing portal, push, account deletion.
// Changes go to Stripe; the resulting webhooks update `subscriptions`.

import { Router, type Response } from 'express';
import type Stripe from 'stripe';
import { mapSubscription } from '../billing-logic';
import { priceForLookupKey, upsertSubscription } from '../billing';
import type { Ctx } from '../context';
import { logEvent } from '../events';
import { requireUser, wrap, type AuthedRequest } from '../http';
import { sendCancelConfirmation } from './public';

export function memberRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use(requireUser(ctx));

  async function currentSub(userId: string): Promise<Stripe.Subscription | null> {
    const { data } = await ctx.db
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('kind', 'subscription')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.stripe_subscription_id ? ctx.stripe.subscriptions.retrieve(data.stripe_subscription_id) : null;
  }

  async function sync(userId: string, sub: Stripe.Subscription, res: Response) {
    // Write the new state right away (the webhook will confirm it), so the app reflects it instantly.
    const rec = await upsertSubscription(ctx, userId, sub);
    res.json({ ok: true, periodEnd: rec.current_period_end, status: rec.status });
  }

  r.post(
    '/subscription/cancel',
    wrap(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const sub = await currentSub(user.id);
      if (!sub) return res.status(404).json({ error: 'No active membership' });
      const reasons = Array.isArray(req.body?.reasons) ? req.body.reasons.map(String).slice(0, 10) : [];
      const updated = await ctx.stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true,
        pause_collection: null,
        metadata: { ...sub.metadata, cancel_reasons: reasons.join(',') },
      });
      await ctx.db.from('subscriptions').update({ cancel_reasons: reasons }).eq('stripe_subscription_id', sub.id);
      if (user.email) await sendCancelConfirmation(ctx, user.email, mapSubscription(ctx.creator, updated).current_period_end);
      await sync(user.id, updated, res);
    }),
  );

  r.post(
    '/subscription/resume',
    wrap(async (req: AuthedRequest, res) => {
      const sub = await currentSub(req.user!.id);
      if (!sub) return res.status(404).json({ error: 'No membership' });
      const updated = await ctx.stripe.subscriptions.update(sub.id, { cancel_at_period_end: false, pause_collection: null });
      await sync(req.user!.id, updated, res);
    }),
  );

  r.post(
    '/subscription/pause',
    wrap(async (req: AuthedRequest, res) => {
      const sub = await currentSub(req.user!.id);
      if (!sub) return res.status(404).json({ error: 'No membership' });
      const months = ctx.creator.offer.cancel.pauseMonths;
      const resumesAt = Math.floor(Date.now() / 1000) + months * 30 * 86400;
      const updated = await ctx.stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: false,
        pause_collection: { behavior: 'void', resumes_at: resumesAt },
      });
      await logEvent(ctx, {
        name: 'save_offer_accepted',
        userId: req.user!.id,
        props: { offer: 'pause', months, channel: 'server' },
        dedupeKey: `pause:${sub.id}:${resumesAt}`,
      });
      await sync(req.user!.id, updated, res);
    }),
  );

  r.post(
    '/subscription/discount',
    wrap(async (req: AuthedRequest, res) => {
      const sub = await currentSub(req.user!.id);
      if (!sub) return res.status(404).json({ error: 'No membership' });
      const { percent, months } = ctx.creator.offer.cancel.discount;
      const couponId = `${ctx.creator.identity.slug}-save-${percent}-${months}m`;
      // Coupon is created once per config value and reused.
      await ctx.stripe.coupons
        .retrieve(couponId)
        .catch(() =>
          ctx.stripe.coupons.create({
            id: couponId,
            percent_off: percent,
            duration: 'repeating',
            duration_in_months: months,
            name: `${percent}% off for ${months} months`,
          }),
        );
      const updated = await ctx.stripe.subscriptions.update(sub.id, { cancel_at_period_end: false, discounts: [{ coupon: couponId }] });
      await sync(req.user!.id, updated, res);
    }),
  );

  r.post(
    '/subscription/upgrade',
    wrap(async (req: AuthedRequest, res) => {
      const sub = await currentSub(req.user!.id);
      const annual = ctx.creator.offer.plans.find((p) => p.id === 'annual');
      if (!sub || !annual) return res.status(404).json({ error: 'Not available' });
      const price = await priceForLookupKey(ctx, annual.stripeLookupKey);
      const item = sub.items.data[0];
      const updated = await ctx.stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: price.id }],
        proration_behavior: 'always_invoice',
        cancel_at_period_end: false,
      });
      await sync(req.user!.id, updated, res); // emits subscription_upgraded via lifecycleEvents
    }),
  );

  r.post(
    '/billing/portal',
    wrap(async (req: AuthedRequest, res) => {
      const { data } = await ctx.db
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', req.user!.id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .maybeSingle();
      if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No billing account' });
      const portal = await ctx.stripe.billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${ctx.env.appUrl}/app/settings` });
      res.json({ url: portal.url });
    }),
  );

  r.post(
    '/push/subscribe',
    wrap(async (req: AuthedRequest, res) => {
      const s = req.body?.subscription;
      if (typeof s?.endpoint !== 'string' || !s.keys?.p256dh || !s.keys?.auth) return res.status(400).json({ error: 'Invalid subscription' });
      await ctx.db.from('push_subscriptions').upsert({ endpoint: s.endpoint, user_id: req.user!.id, keys: s.keys }, { onConflict: 'endpoint' });
      await ctx.db.from('profiles').update({ reminder_push: true }).eq('user_id', req.user!.id);
      res.json({ ok: true });
    }),
  );

  // Account deletion (legal.md, App Store rule): cancels billing immediately and removes all data.
  r.post(
    '/account/delete',
    wrap(async (req: AuthedRequest, res) => {
      if (req.body?.confirm !== true) return res.status(400).json({ error: 'Confirmation required' });
      const userId = req.user!.id;
      const { data: subs } = await ctx.db.from('subscriptions').select('stripe_subscription_id,status').eq('user_id', userId).eq('kind', 'subscription');
      for (const s of subs ?? []) {
        if (s.stripe_subscription_id && !['canceled', 'incomplete_expired'].includes(s.status)) {
          await ctx.stripe.subscriptions.cancel(s.stripe_subscription_id).catch((e: Error) => console.error('[delete] cancel failed', e.message));
        }
      }
      await logEvent(ctx, { name: 'account_deleted', userId: null, props: {}, dedupeKey: `delete:${userId}` });
      await ctx.db
        .from('leads')
        .delete()
        .match({ creator_slug: ctx.creator.identity.slug, email: req.user!.email ?? '' });
      // FK cascades remove profile, sessions, sets, subscriptions, push subs; events keep no user link.
      const { error } = await ctx.db.auth.admin.deleteUser(userId);
      if (error) return res.status(500).json({ error: 'Deletion failed, please contact support.' });
      res.json({ ok: true });
    }),
  );

  return r;
}
