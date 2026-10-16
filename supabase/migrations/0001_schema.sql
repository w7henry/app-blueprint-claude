-- Creator fitness app — core schema.
-- One Supabase project can host several creators (creator_slug on every row),
-- while each creator gets her own deploy of the app (CREATOR_SLUG).
--
-- Rules:
--  * `subscriptions` is the single source of truth for access. Only the backend
--    (service role, from Stripe webhooks) writes it.
--  * `events` holds no personal data. Only the backend writes it.
--  * Members can read/write only their own training data (RLS).

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------- analytics

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),   -- client-generated → retries never duplicate
  created_at    timestamptz not null default now(),
  event_name    text not null check (event_name ~ '^[a-z]+(_[a-z0-9]+)+$'),
  user_id       uuid null references auth.users(id) on delete set null,
  anon_id       text null,                                     -- unused until consent for a persistent id exists (legal.md)
  session_id    text not null,
  creator_slug  text not null,
  src           text null,
  properties    jsonb not null default '{}'::jsonb check (pg_column_size(properties) < 4096)
);
create index if not exists events_creator_name_time on public.events (creator_slug, event_name, created_at);
create index if not exists events_session on public.events (session_id);
create index if not exists events_user on public.events (user_id) where user_id is not null;
alter table public.events enable row level security; -- no policies: backend only

-- ---------------------------------------------------------------- leads (email before the reveal)

create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  creator_slug        text not null,
  email               citext not null,
  answers             jsonb not null default '{}'::jsonb,
  program_id          text,
  days_key            text,
  src                 text,
  marketing_consent   boolean not null default false,       -- ticked the separate, optional box
  consent_text        text,
  consent_at          timestamptz,
  confirm_token       uuid not null default gen_random_uuid(),
  confirmed_at        timestamptz,                           -- double opt-in completed
  unsubscribed_at     timestamptz,
  converted_user_id   uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (creator_slug, email)
);
alter table public.leads enable row level security; -- backend only

-- ---------------------------------------------------------------- members

create table if not exists public.profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  creator_slug        text not null,
  email               citext,
  program_id          text not null,
  days_key            text not null default '3',
  schedule            text[] not null default array['mon','wed','fri'],
  short_sessions      boolean not null default false,
  quiz                jsonb not null default '{}'::jsonb,
  unit                text not null default 'kg' check (unit in ('kg','lbs')),
  program_started_at  timestamptz not null default now(),
  completed_programs  text[] not null default '{}',
  reminder_push       boolean not null default false,
  reminder_email      boolean not null default true,
  reminder_hour       int not null default 17 check (reminder_hour between 0 and 23),
  timezone            text not null default 'UTC',
  marketing_consent   boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists profiles_email on public.profiles (creator_slug, email);
alter table public.profiles enable row level security;
create policy "own profile: read"   on public.profiles for select using (user_id = auth.uid());
create policy "own profile: insert" on public.profiles for insert with check (user_id = auth.uid());
create policy "own profile: update" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- billing (written by Stripe webhooks only)

create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  creator_slug                text not null,
  kind                        text not null check (kind in ('subscription','one_time')),
  status                      text not null,
  plan_id                     text,            -- 'annual' | 'monthly' (config offer.plans)
  program_id                  text,            -- one-time purchases
  stripe_customer_id          text,
  stripe_subscription_id      text unique,
  stripe_checkout_session_id  text unique,
  stripe_price_id             text,
  current_period_end          timestamptz,
  trial_end                   timestamptz,
  cancel_at_period_end        boolean not null default false,
  canceled_at                 timestamptz,
  cancel_reasons              text[],
  paused_until                timestamptz,
  src                         text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists subscriptions_user on public.subscriptions (user_id);
alter table public.subscriptions enable row level security;
create policy "own subscriptions: read" on public.subscriptions for select using (user_id = auth.uid());

-- Every money movement (for revenue per source and the creator report).
create table if not exists public.payments (
  id              text primary key,             -- Stripe invoice / payment_intent / refund id → idempotent
  user_id         uuid references auth.users(id) on delete set null,
  creator_slug    text not null,
  kind            text not null check (kind in ('payment','refund')),
  amount_cents    int not null,                 -- incl. tax; refunds are positive amounts with kind = 'refund'
  tax_cents       int not null default 0,
  currency        text not null,
  plan_id         text,
  src             text,
  is_first        boolean not null default false,   -- first payment of a purchase
  created_at      timestamptz not null default now()
);
create index if not exists payments_creator_time on public.payments (creator_slug, created_at);
alter table public.payments enable row level security; -- backend only

-- Processed Stripe events (webhook idempotency).
create table if not exists public.stripe_events (
  id           text primary key,
  type         text not null,
  received_at  timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- One-time login after checkout (the success URL can be used once).
create table if not exists public.checkout_logins (
  checkout_session_id  text primary key,
  user_id              uuid not null references auth.users(id) on delete cascade,
  used_at              timestamptz
);
alter table public.checkout_logins enable row level security;

-- Revenue share per creator (contract), used by the monthly report.
create table if not exists public.creator_settings (
  creator_slug       text primary key,
  rev_share_percent  numeric(5,2) not null check (rev_share_percent between 0 and 100),
  updated_at         timestamptz not null default now()
);
alter table public.creator_settings enable row level security;

-- ---------------------------------------------------------------- training data (offline-first, client ids)

create table if not exists public.workout_sessions (
  id             uuid primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  creator_slug   text not null,
  program_id     text not null,
  slot_key       text not null,
  workout_id     text not null,
  workout_name   text not null,
  started_at     timestamptz not null,
  completed_at   timestamptz,
  status         text not null check (status in ('active','completed','abandoned')),
  duration_sec   int,
  synced_at      timestamptz not null default now()
);
create index if not exists workout_sessions_user_time on public.workout_sessions (user_id, completed_at);
alter table public.workout_sessions enable row level security;
create policy "own sessions" on public.workout_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.set_logs (
  id                uuid primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_id        uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id       text not null,
  slot_exercise_id  text not null,
  set_index         int not null,
  weight_kg         numeric(7,3),
  reps              int,
  completed         boolean not null,
  unit              text not null check (unit in ('kg','lbs')),
  range_min         int not null,
  range_max         int not null,
  prescribed_sets   int not null,
  logged_at         timestamptz not null
);
create index if not exists set_logs_user_ex on public.set_logs (user_id, exercise_id, logged_at);
alter table public.set_logs enable row level security;
create policy "own sets" on public.set_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- messaging

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security; -- backend only

-- Every automated email/push, so each one goes out at most once (per key).
create table if not exists public.message_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  email       citext,
  kind        text not null,      -- welcome, noWorkout24h, day3Tip, weeklySummary, reminder, inactive5d, trialEnding, …
  dedupe_key  text not null,      -- e.g. checkout id, ISO week, date
  channel     text not null check (channel in ('email','push')),
  sent_at     timestamptz not null default now(),
  unique (kind, dedupe_key)
);
alter table public.message_log enable row level security;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();
