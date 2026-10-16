// track(event, props) — first-party analytics into Supabase `events` via our API.
//
// Guarantees (blueprint/analytics.md):
//  - Never blocks or breaks a user flow: every failure is swallowed.
//  - No duplicates: each event has a client UUID; the server ignores repeats.
//    `once` keys stop re-renders, StrictMode and reloads from firing twice.
//  - No personal data in properties (scrubProps).
//  - Before login: session-scoped id only (no persistent device id without consent).
//  - Batched: flushed every few seconds, on 10 events and when the tab is hidden.

import creator from '../creator';
import { scrubProps, SERVER_ONLY_EVENTS, type EventName, type EventProps } from '../shared/events';
import { getAttribution } from './attribution';
import { API_URL, DEMO } from './env';
import { uuid } from './ids';
import { readJSON, writeJSON } from './storage';

export interface QueuedEvent {
  id: string;
  created_at: string;
  event_name: EventName;
  session_id: string;
  creator_slug: string;
  src: string | null;
  properties: EventProps;
}

const QUEUE_KEY = 'evq';
const ONCE_KEY = 'evonce';
const SESSION_KEY = 'sid';
const MAX_QUEUE = 200;

let queue: QueuedEvent[] = readJSON<QueuedEvent[]>(QUEUE_KEY, []);
const once = new Set<string>(readJSON<string[]>(ONCE_KEY, []));
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let flushing = false;
let accessToken: string | null = null;

/** Visit id, sent with the checkout so the server-side purchase joins the funnel. */
export function sessionId(): string {
  let id = readJSON<string | null>(SESSION_KEY, null);
  if (!id) {
    id = uuid();
    writeJSON(SESSION_KEY, id);
  }
  return id;
}

/** Called by the auth layer; events after login are linked to the user server-side. */
export function setAnalyticsAuth(token: string | null): void {
  accessToken = token;
}

/** Already fired for this once-key in this visit? */
export function hasFired(key: string): boolean {
  return once.has(key);
}

export function track(event: EventName, props?: EventProps, opts: { once?: string } = {}): void {
  try {
    if (SERVER_ONLY_EVENTS.has(event)) return;
    if (opts.once) {
      if (once.has(opts.once)) return;
      once.add(opts.once);
      writeJSON(ONCE_KEY, [...once].slice(-300));
    }
    const ev: QueuedEvent = {
      id: uuid(),
      created_at: new Date().toISOString(),
      event_name: event,
      session_id: sessionId(),
      creator_slug: creator.identity.slug,
      src: getAttribution()?.src ?? null,
      properties: scrubProps(props),
    };
    if (DEMO) {
      // Demo mode: keep a local log so the funnel can be inspected in devtools.
      const w = window as unknown as { __events?: QueuedEvent[] };
      (w.__events ??= []).push(ev);
      if (import.meta.env.DEV) console.debug('[track]', event, ev.properties);
      return;
    }
    queue.push(ev);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    writeJSON(QUEUE_KEY, queue);
    schedule(queue.length >= 10 ? 0 : 2000);
  } catch {
    /* tracking must never break the app */
  }
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), ms);
}

export async function flush(keepalive = false): Promise<void> {
  if (DEMO || flushing || !queue.length) return;
  flushing = true;
  const batch = queue.slice(0, 50);
  try {
    const res = await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      keepalive,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ events: batch }),
    });
    if (!res.ok && res.status !== 400) throw new Error(`events ${res.status}`);
    // 2xx, or 400 (malformed — retrying would never help): drop the batch.
    const sent = new Set(batch.map((e) => e.id));
    queue = queue.filter((e) => !sent.has(e.id));
    writeJSON(QUEUE_KEY, queue);
    failures = 0;
  } catch {
    failures++;
  } finally {
    flushing = false;
  }
  if (queue.length) schedule(Math.min(60000, 2000 * 2 ** failures));
}

if (typeof window !== 'undefined') {
  // Send what's left when the tab is hidden or closed (keepalive survives unload).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush(true);
  });
  window.addEventListener('online', () => void flush());
  if (queue.length) schedule(1000);
}
