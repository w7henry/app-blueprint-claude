// Runs the real migrations on an in-process Postgres (PGlite) with a minimal
// stand-in for Supabase's auth schema, then checks the analytics views.

import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { beforeAll, describe, expect, it } from 'vitest';

let db: PGlite;
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

const SUPABASE_STUB = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
`;

beforeAll(async () => {
  db = new PGlite({ extensions: { citext, pgcrypto } });
  await db.exec(SUPABASE_STUB);
  await db.exec(readFileSync('supabase/migrations/0001_schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/0002_analytics_views.sql', 'utf8'));
  await db.exec(`insert into auth.users (id, email) values ('${U1}', 'a@x.com'), ('${U2}', 'b@x.com');`);
}, 60_000);

const ev = (name: string, session: string, src: string | null, user: string | null = null, at = "now() - interval '10 days'") =>
  `insert into events (event_name, session_id, creator_slug, src, user_id, created_at) values ('${name}', '${session}', 'ayria', ${src ? `'${src}'` : 'null'}, ${user ? `'${user}'` : 'null'}, ${at});`;

describe('migrations', () => {
  it('reject non-snake_case event names', async () => {
    await expect(db.exec(`insert into events (event_name, session_id, creator_slug) values ('LandingViewed', 's', 'ayria')`)).rejects.toThrow();
  });

  it('the same event id twice is stored once (client retries)', async () => {
    const id = '33333333-3333-4333-8333-333333333333';
    const q = `insert into events (id, event_name, session_id, creator_slug) values ('${id}', 'landing_viewed', 'dup', 'ayria') on conflict (id) do nothing`;
    await db.exec(q);
    await db.exec(q);
    const r = await db.query<{ n: number }>(`select count(*)::int as n from events where id = '${id}'`);
    expect(r.rows[0].n).toBe(1);
    await db.exec(`delete from events where id = '${id}'`);
  });
});

describe('analytics views', () => {
  beforeAll(async () => {
    // 3 TikTok visits, 1 Instagram visit; one TikTok visit buys.
    const funnel = ['landing_viewed', 'quiz_started', 'quiz_completed', 'paywall_viewed'];
    for (const s of ['t1', 't2', 't3']) await db.exec(ev('landing_viewed', s, 'tiktok'));
    for (const n of funnel.slice(1)) await db.exec(ev(n, 't1', 'tiktok'));
    await db.exec(ev('quiz_started', 't2', 'tiktok'));
    await db.exec(ev('purchase_completed', 't1', 'tiktok', U1));
    await db.exec(ev('landing_viewed', 'i1', 'instagram'));
    await db.exec(ev('purchase_completed', 'i1', 'instagram', U2));
    // U1 trains twice in week 1 (one within 24 h); U2 once, on day 3.
    await db.exec(`insert into workout_sessions (id, user_id, creator_slug, program_id, slot_key, workout_id, workout_name, started_at, completed_at, status)
      values (gen_random_uuid(), '${U1}', 'ayria', 'foundations', 'a', 'w', 'W', now() - interval '10 days' + interval '2 hours', now() - interval '10 days' + interval '3 hours', 'completed'),
             (gen_random_uuid(), '${U1}', 'ayria', 'foundations', 'b', 'w', 'W', now() - interval '8 days', now() - interval '8 days', 'completed'),
             (gen_random_uuid(), '${U2}', 'ayria', 'foundations', 'a', 'w', 'W', now() - interval '7 days 1 hour', now() - interval '7 days 1 hour', 'completed');`);
    await db.exec(`insert into payments (id, user_id, creator_slug, kind, amount_cents, tax_cents, currency, src, is_first) values
      ('in_1', '${U1}', 'ayria', 'payment', 5999, 0, 'usd', 'tiktok', true),
      ('in_2', '${U2}', 'ayria', 'payment', 1299, 0, 'usd', 'instagram', true),
      ('re_1', '${U2}', 'ayria', 'refund', 1299, 0, 'usd', 'instagram', false);
      insert into creator_settings values ('ayria', 40);`);
  });

  it('funnel shows conversion per step, total and per source', async () => {
    const r = await db.query<Record<string, unknown>>(`select * from analytics_funnel where creator_slug = 'ayria' order by src`);
    const all = r.rows.find((x) => x.src === 'ALL')!;
    const tiktok = r.rows.find((x) => x.src === 'tiktok')!;
    expect(all.landing_viewed).toBe(4);
    expect(all.purchase_completed).toBe(2);
    expect(tiktok.landing_viewed).toBe(3);
    expect(tiktok.quiz_started).toBe(2);
    expect(tiktok.quiz_completed).toBe(1);
    expect(tiktok.paywall_viewed).toBe(1);
    expect(tiktok.purchase_completed).toBe(1);
    expect(Number(tiktok.pct_landing_to_quiz)).toBeCloseTo(66.7, 1);
  });

  it('activation within 24 h', async () => {
    const r = await db.query<{ buyers: number; activated_24h: number }>(
      `select sum(buyers)::int buyers, sum(activated_24h)::int activated_24h from analytics_activation`,
    );
    expect(r.rows[0]).toEqual({ buyers: 2, activated_24h: 1 });
  });

  it('north star: ≥ 2 workouts in week 1', async () => {
    const r = await db.query<{ buyers: number; week1_active: number }>(
      `select sum(buyers)::int buyers, sum(week1_active)::int week1_active from analytics_week1_active`,
    );
    expect(r.rows[0]).toEqual({ buyers: 2, week1_active: 1 });
  });

  it('cohort retention and revenue per source', async () => {
    const c = await db.query<{ week_n: number; active: number }>(
      `select week_n, sum(active)::int active from analytics_cohort_retention group by week_n order by week_n`,
    );
    expect(c.rows[0].week_n).toBe(0);
    const rev = await db.query<{ src: string; net_ex_tax_cents: number }>(`select src, net_ex_tax_cents::int from analytics_revenue_by_src order by src`);
    expect(rev.rows).toEqual([
      { src: 'instagram', net_ex_tax_cents: 0 },
      { src: 'tiktok', net_ex_tax_cents: 5999 },
    ]);
  });

  it('monthly creator report with revenue share', async () => {
    const r = await db.query<{ purchases: number; net_ex_tax_cents: number; rev_share_cents: number }>(
      `select sum(purchases)::int purchases, sum(net_ex_tax_cents)::int net_ex_tax_cents, sum(rev_share_cents)::int rev_share_cents from creator_monthly_report`,
    );
    expect(r.rows[0]).toEqual({ purchases: 2, net_ex_tax_cents: 5999, rev_share_cents: 2400 });
  });
});
