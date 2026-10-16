// Scheduled jobs (Railway cron → POST /api/jobs/:job or `npm run job:daily`).
//  hourly: training-day reminders, 24 h no-workout email
//  daily:  day-3 tip, 5-day inactivity nudge
//  weekly: weekly summary (run Monday morning)
// Every send is deduplicated in message_log, so re-running a job is safe.

import webpush from 'web-push';
import { resolveAccess, type SubscriptionRow } from '../../src/shared/access';
import { scheduleSentence } from '../../src/shared/plan';
import type { Ctx } from '../context';
import { sendEmail } from '../emails';
import { logEvent } from '../events';
import { loginUrl } from '../users';
import { dueDay3Tip, dueInactiveNudge, dueNoWorkoutReminder, dueTrainingReminder, isoWeek, localParts } from './rules';

interface Member {
  user_id: string;
  email: string | null;
  program_id: string;
  schedule: string[];
  reminder_push: boolean;
  reminder_email: boolean;
  reminder_hour: number;
  timezone: string;
  created_at: string;
}

async function members(ctx: Ctx): Promise<{ m: Member; subs: SubscriptionRow[] }[]> {
  const { data: profiles } = await ctx.db
    .from('profiles')
    .select('user_id,email,program_id,schedule,reminder_push,reminder_email,reminder_hour,timezone,created_at')
    .eq('creator_slug', ctx.creator.identity.slug)
    .limit(5000);
  const ids = (profiles ?? []).map((p) => p.user_id);
  if (!ids.length) return [];
  const { data: subs } = await ctx.db
    .from('subscriptions')
    .select('user_id,kind,status,plan_id,program_id,current_period_end,cancel_at_period_end,trial_end,paused_until')
    .in('user_id', ids);
  return (profiles as Member[]).map((m) => ({ m, subs: (subs ?? []).filter((s) => s.user_id === m.user_id) as SubscriptionRow[] }));
}

async function workoutTimes(ctx: Ctx, userId: string): Promise<Date[]> {
  const { data } = await ctx.db.from('workout_sessions').select('completed_at').eq('user_id', userId).eq('status', 'completed').order('completed_at');
  return (data ?? []).map((r) => new Date(r.completed_at as string));
}

async function purchasedAt(ctx: Ctx, userId: string, fallback: string): Promise<Date> {
  const { data } = await ctx.db.from('subscriptions').select('created_at').eq('user_id', userId).order('created_at').limit(1).maybeSingle();
  return new Date((data?.created_at as string) ?? fallback);
}

function nextWorkoutName(ctx: Ctx, programId: string, done: number): { name: string; minutes: number } {
  const p = ctx.creator.programs.find((x) => x.id === programId) ?? ctx.creator.programs[0];
  const all = p.phases.flatMap((ph) => Array.from({ length: ph.weeks }, () => ph.workouts.filter((w) => !w.optional)).flat());
  const w = all[Math.min(done, all.length - 1)];
  return { name: w.name, minutes: w.minutes };
}

async function sendPush(ctx: Ctx, userId: string, payload: { title: string; body: string; url: string }): Promise<boolean> {
  if (!ctx.env.vapidPublicKey || !ctx.env.vapidPrivateKey) return false;
  webpush.setVapidDetails(`mailto:${ctx.creator.identity.supportEmail}`, ctx.env.vapidPublicKey, ctx.env.vapidPrivateKey);
  const { data: subs } = await ctx.db.from('push_subscriptions').select('endpoint,keys').eq('user_id', userId);
  let ok = false;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
      ok = true;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await ctx.db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
  return ok;
}

async function claim(ctx: Ctx, userId: string, kind: string, key: string, channel: 'push' | 'email'): Promise<boolean> {
  const { error } = await ctx.db.from('message_log').insert({ user_id: userId, kind, dedupe_key: key, channel });
  return !error;
}

export async function runJob(ctx: Ctx, job: 'hourly' | 'daily' | 'weekly', now = new Date()): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
  const t = ctx.creator.copy.templates;

  for (const { m, subs } of await members(ctx)) {
    const access = resolveAccess(subs, now, ctx.creator.offer.pastDueGraceDays);
    if (!access.hasAccess || !m.email) continue;
    const times = await workoutTimes(ctx, m.user_id);
    const last = times[times.length - 1] ?? null;
    const next = nextWorkoutName(ctx, m.program_id, times.length);
    const appLink = (ref: string) => `${ctx.env.appUrl}/app?ref=${ref}`;

    if (job === 'hourly') {
      const bought = await purchasedAt(ctx, m.user_id, m.created_at);
      if (dueNoWorkoutReminder(bought, times[0] ?? null, now)) {
        const sent = await sendEmail(ctx, {
          to: m.email,
          kind: 'noWorkout24h',
          userId: m.user_id,
          dedupeKey: `noWorkout24h:${m.user_id}`,
          vars: { workout: next.name, minutes: next.minutes },
          ctaUrl: await loginUrl(ctx, m.email, 'activation_email'),
        });
        if (sent) {
          inc('activation_email');
          await logEvent(ctx, { name: 'activation_email_sent', userId: m.user_id, props: { kind: 'no_workout_24h' }, dedupeKey: `act:${m.user_id}` });
        }
      }
      const today = localParts(now, m.timezone).date;
      const trainedToday = times.some((d) => localParts(d, m.timezone).date === today);
      const r = dueTrainingReminder({ schedule: m.schedule, reminderHour: m.reminder_hour, timezone: m.timezone }, trainedToday, now);
      if (
        r.due &&
        (m.reminder_push || m.reminder_email) &&
        (await claim(ctx, m.user_id, 'reminder', `${m.user_id}:${r.localDate}`, m.reminder_push ? 'push' : 'email'))
      ) {
        const body = t.reminderPush.replace('{{workout}}', next.name).replace('{{minutes}}', String(next.minutes));
        const pushed = m.reminder_push && (await sendPush(ctx, m.user_id, { title: ctx.creator.identity.appName, body, url: '/app?ref=reminder' }));
        if (!pushed && m.reminder_email) {
          await ctx.resend.emails.send({
            from: ctx.env.emailFrom,
            to: m.email,
            subject: body,
            text: `${body}\n\n${appLink('reminder')}\n\nTurn reminders off anytime in Settings.`,
          });
        }
        if (pushed || m.reminder_email) {
          inc('reminder');
          await logEvent(ctx, {
            name: 'reminder_sent',
            userId: m.user_id,
            props: { channel: pushed ? 'push' : 'email' },
            dedupeKey: `rem:${m.user_id}:${r.localDate}`,
          });
        }
      }
    }

    if (job === 'daily') {
      const bought = await purchasedAt(ctx, m.user_id, m.created_at);
      if (
        dueDay3Tip(bought, now) &&
        (await sendEmail(ctx, { to: m.email, kind: 'day3Tip', userId: m.user_id, dedupeKey: `day3:${m.user_id}`, ctaUrl: appLink('tip_email') }))
      ) {
        inc('day3_tip');
        await logEvent(ctx, { name: 'activation_email_sent', userId: m.user_id, props: { kind: 'day3_tip' }, dedupeKey: `day3:${m.user_id}` });
      }
      if (m.reminder_email && dueInactiveNudge(last, now)) {
        const sent = await sendEmail(ctx, {
          to: m.email,
          kind: 'inactive5d',
          userId: m.user_id,
          dedupeKey: `inactive:${m.user_id}:${last!.toISOString().slice(0, 10)}`,
          vars: { workout: next.name },
          ctaUrl: appLink('reengagement'),
        });
        if (sent) {
          inc('inactive');
          await logEvent(ctx, {
            name: 'reengagement_sent',
            userId: m.user_id,
            props: { days_idle: 5 },
            dedupeKey: `re:${m.user_id}:${last!.toISOString().slice(0, 10)}`,
          });
        }
      }
    }

    if (job === 'weekly' && m.reminder_email && times.length) {
      const weekEnd = new Date(now);
      const weekStart = new Date(now.getTime() - 7 * 864e5);
      const done = times.filter((d) => d >= weekStart && d < weekEnd).length;
      const goal = m.schedule.length;
      const week = isoWeek(weekStart);
      const sent = await sendEmail(ctx, {
        to: m.email,
        kind: 'weeklySummary',
        userId: m.user_id,
        dedupeKey: `weekly:${m.user_id}:${week}`,
        vars: {
          done,
          goal,
          highlight: '',
          nextLine: done >= goal ? 'Goal reached. That’s how it’s done.' : `Next up: ${next.name}. Your days are ${scheduleSentence(m.schedule as never)}.`,
        },
        ctaUrl: `${ctx.env.appUrl}/app/progress?ref=weekly_summary`,
      });
      if (sent) {
        inc('weekly');
        await logEvent(ctx, { name: 'weekly_summary_sent', userId: m.user_id, props: { done, goal }, dedupeKey: `wk:${m.user_id}:${week}` });
      }
    }
  }
  return stats;
}
