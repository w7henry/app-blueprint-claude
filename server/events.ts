// Server-side analytics. Purchases and subscription changes are written here
// from Stripe webhooks — they are the truth, not the browser.

import { scrubProps, type EventName, type EventProps } from '../src/shared/events';
import { stableUuid } from './billing-logic';
import type { Ctx } from './context';

export async function logEvent(
  ctx: Ctx,
  e: { name: EventName; userId?: string | null; sessionId?: string | null; src?: string | null; props?: EventProps; dedupeKey?: string },
): Promise<void> {
  const row = {
    id: e.dedupeKey ? stableUuid(`${e.name}:${e.dedupeKey}`) : stableUuid(`${e.name}:${Date.now()}:${Math.random()}`),
    event_name: e.name,
    user_id: e.userId ?? null,
    session_id: e.sessionId || `server:${e.userId ?? 'anon'}`,
    creator_slug: ctx.creator.identity.slug,
    src: e.src ?? null,
    properties: scrubProps(e.props),
  };
  const { error } = await ctx.db.from('events').upsert(row, { onConflict: 'id', ignoreDuplicates: true });
  if (error) console.error('[events] insert failed', e.name, error.message);
}
