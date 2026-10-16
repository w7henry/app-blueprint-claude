// Membership / access for the signed-in member. Reads `subscriptions` (RLS: own
// rows only), caches them on the device so the app also works offline, and
// interprets them with the shared, unit-tested resolveAccess().

import { useEffect, useState } from 'react';
import creator from '../creator';
import { demoSubscription } from '../lib/demo';
import { DEMO } from '../lib/env';
import { readJSON, writeJSON } from '../lib/storage';
import { resolveAccess, type Access, type SubscriptionRow } from '../shared/access';
import { supabase } from './supabase';

const cacheKey = (userId: string) => `subs:${creator.identity.slug}:${userId}`;

export async function fetchSubscriptions(userId: string): Promise<SubscriptionRow[]> {
  if (DEMO) {
    const row = demoSubscription();
    return row ? [row] : [];
  }
  try {
    const { data, error } = await supabase()
      .from('subscriptions')
      .select('kind,status,plan_id,program_id,current_period_end,cancel_at_period_end,trial_end,paused_until')
      .eq('user_id', userId);
    if (error) throw error;
    writeJSON(cacheKey(userId), data, 'local');
    return data as SubscriptionRow[];
  } catch {
    // Offline or Supabase down: use the last known rows (access still expires by date).
    return readJSON<SubscriptionRow[]>(cacheKey(userId), [], 'local');
  }
}

export function useMembership(userId: string | null): { loading: boolean; access: Access | null; rows: SubscriptionRow[]; reload: () => void } {
  const [rows, setRows] = useState<SubscriptionRow[] | null>(() =>
    userId && !DEMO ? readJSON<SubscriptionRow[] | null>(cacheKey(userId), null, 'local') : null,
  );
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void fetchSubscriptions(userId).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [userId, tick]);
  return {
    loading: rows === null,
    rows: rows ?? [],
    access: rows ? resolveAccess(rows, new Date(), creator.offer.pastDueGraceDays) : null,
    reload: () => setTick((t) => t + 1),
  };
}
