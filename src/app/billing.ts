// Membership actions. Real mode: backend → Stripe (webhooks then update the
// `subscriptions` table, the single source of truth). Demo mode: local row.

import creator from '../creator';
import { api } from '../lib/api';
import { demoSubscription, updateDemoSubscription } from '../lib/demo';
import { DEMO } from '../lib/env';
import { currentToken } from './auth';

export type MembershipAction = 'cancel' | 'resume' | 'pause' | 'discount' | 'upgrade';

export async function membershipAction(action: MembershipAction, body: Record<string, unknown> = {}): Promise<{ periodEnd?: string | null }> {
  if (DEMO) {
    const row = demoSubscription();
    const DAY = 864e5;
    if (action === 'cancel') updateDemoSubscription({ cancel_at_period_end: true });
    if (action === 'resume') updateDemoSubscription({ cancel_at_period_end: false, status: row?.trial_end ? 'trialing' : 'active', paused_until: null });
    if (action === 'pause') updateDemoSubscription({ cancel_at_period_end: false });
    if (action === 'discount') updateDemoSubscription({ cancel_at_period_end: false });
    if (action === 'upgrade') updateDemoSubscription({ plan_id: 'annual', current_period_end: new Date(Date.now() + 365 * DAY).toISOString() });
    return { periodEnd: demoSubscription()?.current_period_end ?? null };
  }
  return api(`/api/subscription/${action}`, { body, token: currentToken() });
}

export async function openBillingPortal(): Promise<void> {
  if (DEMO) {
    alert('Demo mode: the Stripe billing portal opens here in production.');
    return;
  }
  const { url } = await api<{ url: string }>('/api/billing/portal', { body: { returnPath: '/app/settings' }, token: currentToken() });
  window.location.assign(url);
}

export async function deleteAccount(): Promise<void> {
  if (DEMO) return;
  await api('/api/account/delete', { body: { confirm: true, creator: creator.identity.slug }, token: currentToken() });
}
