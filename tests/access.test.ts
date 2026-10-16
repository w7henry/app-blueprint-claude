import { describe, expect, it } from 'vitest';
import { canUseProgram, resolveAccess, type SubscriptionRow } from '../src/shared/access';

const now = new Date('2026-10-16T12:00:00Z');
const inDays = (d: number) => new Date(now.getTime() + d * 864e5).toISOString();
const sub = (p: Partial<SubscriptionRow>): SubscriptionRow => ({
  kind: 'subscription',
  status: 'active',
  plan_id: 'annual',
  program_id: null,
  current_period_end: inDays(20),
  cancel_at_period_end: false,
  trial_end: null,
  ...p,
});

describe('resolveAccess', () => {
  it('no rows → no access', () => {
    expect(resolveAccess([], now)).toMatchObject({ hasAccess: false, reason: 'none' });
  });

  it('trialing → access until trial end', () => {
    const a = resolveAccess([sub({ status: 'trialing', trial_end: inDays(5) })], now);
    expect(a).toMatchObject({ hasAccess: true, reason: 'trial' });
    expect(a.until?.toISOString()).toBe(inDays(5));
  });

  it('active → access to all programs', () => {
    const a = resolveAccess([sub({})], now);
    expect(a.hasAccess).toBe(true);
    expect(canUseProgram(a, 'anything')).toBe(true);
  });

  it('cancel at period end → keeps access until the period ends', () => {
    expect(resolveAccess([sub({ cancel_at_period_end: true })], now)).toMatchObject({ hasAccess: true, reason: 'canceling' });
  });

  it('cancel at period end → access ends exactly at the period end (no grace)', () => {
    expect(resolveAccess([sub({ cancel_at_period_end: true, current_period_end: inDays(-0.01) })], now, 3).hasAccess).toBe(false);
  });

  it('canceled but paid period not over → still has access', () => {
    expect(resolveAccess([sub({ status: 'canceled', current_period_end: inDays(3) })], now)).toMatchObject({ hasAccess: true, reason: 'canceling' });
  });

  it('canceled and period over → no access', () => {
    expect(resolveAccess([sub({ status: 'canceled', current_period_end: inDays(-1) })], now)).toMatchObject({ hasAccess: false, reason: 'ended' });
  });

  it('past_due → access during the grace period only', () => {
    expect(resolveAccess([sub({ status: 'past_due', current_period_end: inDays(-1) })], now, 3)).toMatchObject({ hasAccess: true, reason: 'grace' });
    expect(resolveAccess([sub({ status: 'past_due', current_period_end: inDays(-4) })], now, 3)).toMatchObject({ hasAccess: false, reason: 'payment_failed' });
  });

  it('unpaid / incomplete → no access', () => {
    expect(resolveAccess([sub({ status: 'unpaid' })], now).hasAccess).toBe(false);
    expect(resolveAccess([sub({ status: 'incomplete' })], now).hasAccess).toBe(false);
  });

  it('paused → no access, until = resume date', () => {
    const a = resolveAccess([sub({ status: 'paused', paused_until: inDays(30) })], now);
    expect(a).toMatchObject({ hasAccess: false, reason: 'paused' });
  });

  it('stale "active" row long past its period (missed webhook) → no access', () => {
    expect(resolveAccess([sub({ current_period_end: inDays(-10) })], now, 3).hasAccess).toBe(false);
  });

  it('one-time purchase → lifetime access to that program only', () => {
    const a = resolveAccess([sub({ kind: 'one_time', status: 'paid', program_id: 'foundations', current_period_end: null })], now);
    expect(a).toMatchObject({ hasAccess: true, reason: 'one_time' });
    expect(canUseProgram(a, 'foundations')).toBe(true);
    expect(canUseProgram(a, 'growth')).toBe(false);
  });

  it('refunded one-time purchase → no access', () => {
    expect(resolveAccess([sub({ kind: 'one_time', status: 'refunded', program_id: 'foundations' })], now).hasAccess).toBe(false);
  });

  it('an old canceled row never hides a newer active subscription', () => {
    const a = resolveAccess([sub({ status: 'canceled', current_period_end: inDays(-40) }), sub({ status: 'active' })], now);
    expect(a).toMatchObject({ hasAccess: true, reason: 'active' });
  });
});
