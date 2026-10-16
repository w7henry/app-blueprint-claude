// HTTP level: event ingestion rules and Stripe signature verification.

import type { AddressInfo } from 'node:net';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { fakeCtx } from './helpers/fakes';

const f = fakeCtx();
let base = '';
let close: () => void;

beforeAll(async () => {
  const server = createApp(f.ctx).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(() => close());

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/events', () => {
  const ev = (over: Record<string, unknown> = {}) => ({
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    event_name: 'landing_viewed',
    session_id: 's1',
    src: 'tiktok',
    properties: { path: '/' },
    ...over,
  });

  it('stores catalog events, drops unknown and server-only names, scrubs personal data', async () => {
    const res = await post('/api/events', {
      events: [
        ev(),
        ev({ event_name: 'made_up_event' }),
        ev({ event_name: 'purchase_completed' }),
        ev({ event_name: 'email_submitted', properties: { email: 'a@b.co', note: 'me@x.io', marketing_consent: true } }),
      ],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stored: 2 });
    const stored = f.db.rows('events');
    expect(stored.map((e) => e.event_name).sort()).toEqual(['email_submitted', 'landing_viewed']);
    expect(stored.find((e) => e.event_name === 'email_submitted')!.properties).toEqual({ marketing_consent: true });
    expect(stored.every((e) => e.creator_slug === 'ayria')).toBe(true);
  });

  it('a retried batch never creates duplicates', async () => {
    const e = ev({ event_name: 'cta_clicked' });
    await post('/api/events', { events: [e] });
    await post('/api/events', { events: [e] });
    expect(f.db.rows('events').filter((x) => x.id === e.id)).toHaveLength(1);
  });

  it('rejects malformed bodies', async () => {
    expect((await post('/api/events', { nope: 1 })).status).toBe(400);
  });
});

describe('POST /api/stripe/webhook', () => {
  const payload = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'ping.test', data: { object: {} } });

  it('rejects a bad signature', async () => {
    const res = await post('/api/stripe/webhook', payload, { 'stripe-signature': 't=1,v1=bad' });
    expect(res.status).toBe(400);
  });

  it('accepts a correctly signed event and records it once', async () => {
    const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    expect((await post('/api/stripe/webhook', payload, { 'stripe-signature': header })).status).toBe(200);
    expect((await post('/api/stripe/webhook', payload, { 'stripe-signature': header })).status).toBe(200);
    expect(f.db.rows('stripe_events').filter((e) => e.id === 'evt_sig')).toHaveLength(1);
  });
});

describe('protected endpoints', () => {
  it('require a valid login', async () => {
    expect((await post('/api/subscription/cancel', {})).status).toBe(401);
    expect((await post('/api/account/delete', { confirm: true }, { Authorization: 'Bearer nope' })).status).toBe(401);
  });

  it('jobs need the cron secret', async () => {
    expect((await post('/api/jobs/daily', {})).status).toBe(401);
  });
});
