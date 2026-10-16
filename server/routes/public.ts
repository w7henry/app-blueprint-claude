// Public endpoints used before the purchase: events, leads, checkout, login links, cancellation.

import { Router } from 'express';
import { encodeAnswersServer } from '../util';
import { isEventName, SERVER_ONLY_EVENTS, scrubProps } from '../../src/shared/events';
import { resolvePlan, sanitizeAnswers } from '../../src/shared/quiz';
import { formatLongDate } from '../../src/shared/format';
import { scheduleSentence } from '../../src/shared/plan';
import { packAnswers } from '../billing-logic';
import { fulfillCheckout, priceForLookupKey } from '../billing';
import type { Ctx } from '../context';
import { sendEmail } from '../emails';
import { logEvent } from '../events';
import { isEmail, rateLimit, wrap } from '../http';
import { loginToken, loginUrl, userFromToken } from '../users';

export function publicRoutes(ctx: Ctx): Router {
  const r = Router();
  const slug = ctx.creator.identity.slug;

  // ---------------------------------------------------------------- analytics
  r.post(
    '/events',
    rateLimit(120, 60_000),
    wrap(async (req, res) => {
      const list = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : null;
      if (!list) return res.status(400).json({ error: 'events[] required' });
      const user = await userFromToken(ctx, req.headers.authorization);
      const uuidRe = /^[0-9a-f-]{36}$/i;
      const rows = list
        .filter(
          (e: Record<string, unknown>) =>
            typeof e?.event_name === 'string' && isEventName(e.event_name) && !SERVER_ONLY_EVENTS.has(e.event_name) && uuidRe.test(String(e.id)),
        )
        .map((e: Record<string, unknown>) => ({
          id: e.id,
          created_at: typeof e.created_at === 'string' && !Number.isNaN(Date.parse(e.created_at)) ? e.created_at : new Date().toISOString(),
          event_name: e.event_name,
          user_id: user?.id ?? null,
          session_id: String(e.session_id ?? '').slice(0, 64) || 'unknown',
          creator_slug: slug,
          src: typeof e.src === 'string' ? e.src.slice(0, 80) : null,
          properties: scrubProps(e.properties as never),
        }));
      if (rows.length) {
        const { error } = await ctx.db.from('events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
        if (error) return res.status(500).json({ error: 'insert failed' });
        // After login: link this visit's anonymous events to the member.
        if (user) await ctx.db.from('events').update({ user_id: user.id }).eq('session_id', rows[0].session_id).is('user_id', null);
      }
      res.json({ ok: true, stored: rows.length });
    }),
  );

  // ---------------------------------------------------------------- email before the reveal
  r.post(
    '/leads',
    rateLimit(10, 60_000),
    wrap(async (req, res) => {
      const b = req.body ?? {};
      if (!isEmail(b.email)) return res.status(400).json({ error: 'Valid email required' });
      const email = b.email.toLowerCase();
      const answers = sanitizeAnswers(ctx.creator, b.answers ?? {});
      const plan = resolvePlan(ctx.creator, answers);
      const consent = b.marketingConsent === true;
      const { data, error } = await ctx.db
        .from('leads')
        .upsert(
          {
            creator_slug: slug,
            email,
            answers,
            program_id: plan.programId,
            days_key: plan.daysKey,
            src: typeof b.attribution?.src === 'string' ? b.attribution.src.slice(0, 80) : null,
            ...(consent ? { marketing_consent: true, consent_text: String(b.consentText ?? '').slice(0, 500), consent_at: new Date().toISOString() } : {}),
          },
          { onConflict: 'creator_slug,email' },
        )
        .select('id,confirm_token,confirmed_at')
        .single();
      if (error) return res.status(500).json({ error: 'Could not save' });

      const program = ctx.creator.programs.find((p) => p.id === plan.programId)!;
      const resume = encodeAnswersServer(answers);
      // Transactional: the plan she asked for.
      await sendEmail(ctx, {
        to: email,
        kind: 'planReady',
        dedupeKey: `plan:${data.id}:${resume}`,
        vars: { program: program.name, days: scheduleSentence(plan.schedule) },
        ctaUrl: `${ctx.env.appUrl}/plan?a=${resume}&src=email`,
      });
      // Marketing only after double opt-in (legal.md).
      if (consent && !data.confirmed_at) {
        await sendEmail(ctx, {
          to: email,
          kind: 'confirmMarketing',
          dedupeKey: `doi:${data.id}`,
          ctaUrl: `${ctx.env.appUrl}/api/leads/confirm?token=${data.confirm_token}`,
        });
      }
      res.json({ ok: true });
    }),
  );

  r.get(
    '/leads/confirm',
    wrap(async (req, res) => {
      const token = String(req.query.token ?? '');
      if (/^[0-9a-f-]{36}$/i.test(token)) {
        await ctx.db
          .from('leads')
          .update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null })
          .eq('confirm_token', token)
          .is('confirmed_at', null);
      }
      res.redirect(302, `${ctx.env.appUrl}/?confirmed=1`);
    }),
  );

  r.get(
    '/unsubscribe',
    wrap(async (req, res) => {
      const token = String(req.query.token ?? '');
      if (/^[0-9a-f-]{36}$/i.test(token)) await ctx.db.from('leads').update({ unsubscribed_at: new Date().toISOString() }).eq('confirm_token', token);
      res
        .type('html')
        .send(
          '<!doctype html><meta name="viewport" content="width=device-width"><p style="font-family:sans-serif;padding:24px">You are unsubscribed. You will not get marketing emails anymore.</p>',
        );
    }),
  );

  // ---------------------------------------------------------------- checkout
  r.post(
    '/checkout',
    rateLimit(20, 60_000),
    wrap(async (req, res) => {
      const b = req.body ?? {};
      if (b.consents?.age !== true || b.consents?.withdrawal !== true) return res.status(400).json({ error: 'Consents missing' });
      const answers = sanitizeAnswers(ctx.creator, b.answers ?? {});
      const plan = resolvePlan(ctx.creator, answers);
      const oneTime = b.plan === 'one_time';
      const offerPlan = ctx.creator.offer.plans.find((p) => p.id === b.plan);
      if (oneTime && !ctx.creator.offer.oneTime?.enabled) return res.status(400).json({ error: 'Not available' });
      if (!oneTime && !offerPlan) return res.status(400).json({ error: 'Unknown plan' });
      const lookupKey = oneTime ? ctx.creator.offer.oneTime!.stripeLookupKey : offerPlan!.stripeLookupKey;
      const price = await priceForLookupKey(ctx, lookupKey);
      const attribution = b.attribution ?? {};
      const metadata: Record<string, string> = {
        creator: slug,
        plan: String(b.plan),
        program: oneTime ? ctx.creator.offer.oneTime!.programId : plan.programId,
        days: plan.daysKey,
        answers: packAnswers(answers),
        src: String(attribution.src ?? '').slice(0, 80),
        kw: String(attribution.kw ?? '').slice(0, 80),
        analytics_session: String(b.analyticsSession ?? '').slice(0, 64),
        consent_age: 'true',
        consent_withdrawal_at: String(b.consents.at ?? new Date().toISOString()).slice(0, 40),
      };
      const trialDays = !oneTime && offerPlan!.trialDays > 0 ? offerPlan!.trialDays : 0;
      const session = await ctx.stripe.checkout.sessions.create({
        mode: oneTime ? 'payment' : 'subscription',
        line_items: [{ price: price.id, quantity: 1 }],
        customer_email: isEmail(b.email) ? b.email : undefined,
        ...(oneTime ? { customer_creation: 'always' as const } : {}),
        metadata,
        ...(oneTime
          ? { payment_intent_data: { metadata } }
          : {
              subscription_data: {
                metadata,
                ...(trialDays ? { trial_period_days: trialDays, trial_settings: { end_behavior: { missing_payment_method: 'cancel' as const } } } : {}),
              },
            }),
        payment_method_collection: 'always',
        automatic_tax: { enabled: ctx.env.stripeTax },
        billing_address_collection: ctx.env.stripeTax ? 'required' : 'auto',
        locale: 'en',
        success_url: `${ctx.env.appUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${ctx.env.appUrl}/join?canceled=1`,
        ...(trialDays
          ? {
              custom_text: {
                submit: { message: `You won’t be charged today. Your ${trialDays}-day free trial starts now, and we remind you before it ends.` },
              },
            }
          : {}),
      });
      res.json({ url: session.url });
    }),
  );

  // ---------------------------------------------------------------- login
  // After checkout: exchange the (secret, single-use) checkout session id for a login token.
  r.post(
    '/auth/checkout-login',
    rateLimit(20, 60_000),
    wrap(async (req, res) => {
      const sessionId = String(req.body?.sessionId ?? '');
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid session' });
      const session = await ctx.stripe.checkout.sessions.retrieve(sessionId);
      if (Date.now() / 1000 - session.created > 24 * 3600) return res.status(410).json({ error: 'Expired — use the login link in your email.' });
      const { userId, email } = await fulfillCheckout(ctx, sessionId); // idempotent; also covers a late webhook
      const { data: claim } = await ctx.db.from('checkout_logins').select('used_at').eq('checkout_session_id', sessionId).maybeSingle();
      if (claim?.used_at) return res.status(410).json({ error: 'Already used — use the login link in your email.' });
      await ctx.db.from('checkout_logins').upsert({ checkout_session_id: sessionId, user_id: userId, used_at: new Date().toISOString() });
      res.json({ tokenHash: await loginToken(ctx, email) });
    }),
  );

  r.post(
    '/auth/link',
    rateLimit(5, 60_000),
    wrap(async (req, res) => {
      const email = String(req.body?.email ?? '').toLowerCase();
      if (!isEmail(email)) return res.status(400).json({ error: 'Valid email required' });
      // Only existing members get a link; the response is the same either way (no account probing).
      const { data } = await ctx.db.from('profiles').select('user_id').match({ creator_slug: slug, email }).maybeSingle();
      if (data) {
        await sendEmail(ctx, {
          to: email,
          kind: 'welcome',
          userId: data.user_id,
          vars: { program: ctx.creator.identity.appName, minutes: 45 },
          ctaUrl: await loginUrl(ctx, email, 'login_email'),
        });
      }
      res.json({ ok: true });
    }),
  );

  // ---------------------------------------------------------------- cancellation without login (§ 312k BGB)
  r.post(
    '/cancel-request',
    rateLimit(5, 60_000),
    wrap(async (req, res) => {
      const email = String(req.body?.email ?? '').toLowerCase();
      if (!isEmail(email)) return res.status(400).json({ error: 'Valid email required' });
      const { data: profile } = await ctx.db.from('profiles').select('user_id').match({ creator_slug: slug, email }).maybeSingle();
      if (profile) {
        const { data: subs } = await ctx.db
          .from('subscriptions')
          .select('stripe_subscription_id,status,current_period_end')
          .eq('user_id', profile.user_id)
          .eq('kind', 'subscription')
          .in('status', ['trialing', 'active', 'past_due', 'paused']);
        for (const s of subs ?? []) {
          if (s.stripe_subscription_id) await ctx.stripe.subscriptions.update(s.stripe_subscription_id, { cancel_at_period_end: true, pause_collection: null });
        }
        await logEvent(ctx, { name: 'cancel_flow_started', userId: profile.user_id, props: { channel: 'public_form' } });
        await sendCancelConfirmation(ctx, email, subs?.[0]?.current_period_end ?? null);
      }
      res.json({ ok: true });
    }),
  );

  return r;
}

export async function sendCancelConfirmation(ctx: Ctx, email: string, periodEnd: string | null) {
  const date = periodEnd ? formatLongDate(periodEnd) : 'the end of your current period';
  const op = ctx.creator.legal.operator;
  const { error } = await ctx.resend.emails.send({
    from: ctx.env.emailFrom,
    to: email,
    subject: `Your ${ctx.creator.identity.appName} membership is cancelled`,
    text: `We received your cancellation on ${new Date().toUTCString()}.\n\nYour membership ends on ${date}. You keep full access until then and won't be charged again.\n\nChanged your mind? Resume anytime in the app under Settings.\n\n${op.name}, ${op.address.join(', ')}`,
  });
  if (error) console.error('[cancel] confirmation failed', error.message);
}
