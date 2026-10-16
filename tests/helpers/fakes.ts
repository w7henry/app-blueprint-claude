// In-memory stand-ins for Supabase (query builder + auth admin), Stripe and Resend,
// just enough to exercise the server's billing and analytics paths end to end.

import Stripe from 'stripe';
import { loadCreator } from '../../creators';
import type { Ctx } from '../../server/context';
import type { Env } from '../../server/env';

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const UNIQUE: Record<string, string[][]> = {
  events: [['id']],
  subscriptions: [['stripe_subscription_id'], ['stripe_checkout_session_id']],
  payments: [['id']],
  stripe_events: [['id']],
  message_log: [['kind', 'dedupe_key']],
  profiles: [['user_id']],
  leads: [['creator_slug', 'email']],
  checkout_logins: [['checkout_session_id']],
  push_subscriptions: [['endpoint']],
};

let seq = 0;
const uid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null; count?: number }> {
  private filters: Filter[] = [];
  private op: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: Row[] = [];
  private patch: Row = {};
  private opts: { onConflict?: string; ignoreDuplicates?: boolean; count?: string; head?: boolean } = {};
  private singleMode: 'one' | 'maybe' | null = null;
  private limitN: number | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  private returning = false;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_cols?: string, opts: { count?: string; head?: boolean } = {}) {
    if (this.op === 'select') this.opts = { ...this.opts, ...opts };
    else this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.opts = opts;
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  is(c: string, v: unknown) {
    this.filters.push((r) => (r[c] ?? null) === v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  not(c: string, _op: 'is', v: unknown) {
    this.filters.push((r) => (r[c] ?? null) !== v);
    return this;
  }
  match(m: Row) {
    for (const [k, v] of Object.entries(m)) this.eq(k, v);
    return this;
  }
  order(col: string, o: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: o.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }
  single() {
    this.singleMode = 'one';
    return this;
  }

  private conflict(row: Row, cols: string[][]): Row | undefined {
    return this.db.rows(this.table).find((r) => cols.some((set) => set.every((c) => r[c] !== undefined && r[c] !== null && r[c] === row[c])));
  }

  private exec() {
    const rows = this.db.rows(this.table);
    const matches = () => rows.filter((r) => this.filters.every((f) => f(r)));
    let data: Row[] = [];
    if (this.op === 'select') {
      data = matches();
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        data = [...data].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (this.limitN !== null) data = data.slice(0, this.limitN);
      if (this.opts.head) return { data: null, error: null, count: data.length };
    } else if (this.op === 'insert' || this.op === 'upsert') {
      const uniq = UNIQUE[this.table] ?? [['id']];
      for (const p of this.payload) {
        const keys = this.op === 'upsert' && this.opts.onConflict ? [this.opts.onConflict.split(',')] : uniq;
        const existing = this.conflict(p, this.op === 'insert' ? uniq : keys);
        if (existing) {
          if (this.op === 'insert') return { data: null, error: { message: 'duplicate key', code: '23505' } };
          if (!this.opts.ignoreDuplicates) Object.assign(existing, p);
          data.push(existing);
        } else {
          const row = { id: uid(), created_at: new Date().toISOString(), confirm_token: uid(), ...p };
          rows.push(row);
          data.push(row);
        }
      }
    } else if (this.op === 'update') {
      data = matches();
      for (const r of data) Object.assign(r, this.patch);
    } else {
      const del = new Set(matches());
      this.db.tables[this.table] = rows.filter((r) => !del.has(r));
    }
    // Like the real client: callers get copies, never live rows.
    data = data.map((r) => structuredClone(r));
    if (this.singleMode) {
      if (this.singleMode === 'one' && data.length !== 1) return { data: null, error: { message: `expected 1 row, got ${data.length}` } };
      return { data: data[0] ?? null, error: null };
    }
    return { data: this.op === 'select' || this.returning ? data : null, error: null };
  }

  then<A, B>(ok?: ((v: ReturnType<Query['exec']>) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.exec())
      .then(ok, fail);
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};
  users: { id: string; email: string }[] = [];
  rows(t: string): Row[] {
    return (this.tables[t] ??= []);
  }
  from(t: string) {
    return new Query(this, t);
  }
  auth = {
    getUser: async (token: string) => {
      const u = this.users.find((x) => `token-${x.id}` === token);
      return u ? { data: { user: u }, error: null } : { data: { user: null }, error: { message: 'bad token' } };
    },
    admin: {
      createUser: async ({ email }: { email: string }) => {
        if (this.users.some((u) => u.email === email)) return { data: { user: null }, error: { message: 'already registered' } };
        const u = { id: uid(), email };
        this.users.push(u);
        return { data: { user: u }, error: null };
      },
      generateLink: async ({ email }: { email: string }) => {
        const u = this.users.find((x) => x.email === email);
        return u
          ? { data: { user: u, properties: { hashed_token: `hash-${u.id}` } }, error: null }
          : { data: { user: null, properties: null }, error: { message: 'no user' } };
      },
      getUserById: async (id: string) => ({ data: { user: this.users.find((u) => u.id === id) ?? null }, error: null }),
      deleteUser: async (id: string) => {
        this.users = this.users.filter((u) => u.id !== id);
        for (const t of ['profiles', 'subscriptions', 'workout_sessions', 'set_logs']) this.tables[t] = this.rows(t).filter((r) => r.user_id !== id);
        return { error: null };
      },
    },
  };
}

export interface FakeStripeState {
  sessions: Record<string, Partial<Stripe.Checkout.Session>>;
  subscriptions: Record<string, Partial<Stripe.Subscription>>;
}

export function fakeStripe(state: FakeStripeState) {
  const real = new Stripe('sk_test_fake');
  return {
    webhooks: real.webhooks,
    checkout: {
      sessions: {
        retrieve: async (id: string) => {
          const s = state.sessions[id];
          if (!s) throw new Error('No such session');
          const sub = typeof s.subscription === 'string' ? state.subscriptions[s.subscription] : s.subscription;
          return { ...s, subscription: sub ?? null };
        },
        list: async () => ({ data: [] }),
        create: async (p: Record<string, unknown>) => ({ id: 'cs_test_new', url: 'https://checkout.stripe.test/x', ...p }),
      },
    },
    subscriptions: {
      retrieve: async (id: string) => state.subscriptions[id],
      update: async (id: string, patch: Record<string, unknown>) => {
        state.subscriptions[id] = { ...state.subscriptions[id], ...patch } as Partial<Stripe.Subscription>;
        return state.subscriptions[id];
      },
      cancel: async (id: string) => {
        state.subscriptions[id] = { ...state.subscriptions[id], status: 'canceled' };
        return state.subscriptions[id];
      },
    },
    prices: { list: async ({ lookup_keys }: { lookup_keys: string[] }) => ({ data: [{ id: `price_${lookup_keys[0]}`, lookup_key: lookup_keys[0] }] }) },
    coupons: { retrieve: async () => ({}), create: async () => ({}) },
    billingPortal: { sessions: { create: async () => ({ url: 'https://billing.stripe.test' }) } },
  };
}

export function fakeCtx(stripeState: FakeStripeState = { sessions: {}, subscriptions: {} }) {
  const db = new FakeDb();
  const sent: { to: string; subject: string }[] = [];
  const env: Env = {
    port: 0,
    creatorSlug: 'ayria',
    appUrl: 'https://app.test',
    supabaseUrl: 'https://db.test',
    supabaseServiceKey: 'x',
    stripeSecretKey: 'sk_test_fake',
    stripeWebhookSecret: 'whsec_test',
    stripeTax: false,
    resendApiKey: 're_x',
    emailFrom: 'Ayria <hi@app.test>',
    vapidPublicKey: '',
    vapidPrivateKey: '',
    cronSecret: 'cron',
    allowedOrigins: ['https://app.test'],
    serveStatic: false,
  };
  const ctx = {
    ...loadCreator('ayria'),
    env,
    db,
    stripe: fakeStripe(stripeState),
    resend: {
      emails: {
        send: async (m: { to: string; subject: string }) => {
          sent.push({ to: m.to, subject: m.subject });
          return { data: { id: 'em' }, error: null };
        },
      },
    },
  } as unknown as Ctx;
  return { ctx, db, sent, stripeState };
}
