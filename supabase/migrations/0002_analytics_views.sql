-- Analytics views (analytics.md): every funnel question is one query.
--   select * from analytics_funnel where creator_slug = 'ayria';
-- Views run with the owner's rights; don't expose them to the anon/authenticated roles.

-- Funnel per visit (session): landing → quiz → paywall → purchase, total and per source.
create or replace view public.analytics_funnel as
with s as (
  select
    creator_slug,
    session_id,
    (array_agg(src order by created_at) filter (where src is not null))[1] as src,
    bool_or(event_name = 'landing_viewed')     as landing,
    bool_or(event_name = 'quiz_started')       as quiz_started,
    bool_or(event_name = 'quiz_completed')     as quiz_completed,
    bool_or(event_name = 'email_submitted')    as email,
    bool_or(event_name = 'paywall_viewed')     as paywall,
    bool_or(event_name = 'checkout_started')   as checkout,
    bool_or(event_name = 'purchase_completed') as purchased
  from public.events
  group by creator_slug, session_id
)
select
  creator_slug,
  case when grouping(src) = 1 then 'ALL' else coalesce(src, '(none)') end as src,
  count(*) filter (where landing)        as landing_viewed,
  count(*) filter (where quiz_started)   as quiz_started,
  count(*) filter (where quiz_completed) as quiz_completed,
  count(*) filter (where email)          as email_submitted,
  count(*) filter (where paywall)        as paywall_viewed,
  count(*) filter (where checkout)       as checkout_started,
  count(*) filter (where purchased)      as purchase_completed,
  round(100.0 * count(*) filter (where quiz_started)   / nullif(count(*) filter (where landing), 0), 1)        as pct_landing_to_quiz,
  round(100.0 * count(*) filter (where quiz_completed) / nullif(count(*) filter (where quiz_started), 0), 1)   as pct_quiz_completed,
  round(100.0 * count(*) filter (where paywall)        / nullif(count(*) filter (where quiz_completed), 0), 1) as pct_to_paywall,
  round(100.0 * count(*) filter (where purchased)      / nullif(count(*) filter (where paywall), 0), 1)        as pct_paywall_to_purchase,
  round(100.0 * count(*) filter (where purchased)      / nullif(count(*) filter (where landing), 0), 2)        as pct_overall
from s
group by grouping sets ((creator_slug), (creator_slug, src));

-- Quiz drop-off per question.
create or replace view public.analytics_quiz_steps as
select creator_slug, properties->>'question' as question, (properties->>'step')::int as step,
       count(distinct session_id) as sessions
from public.events
where event_name = 'quiz_answered'
group by 1, 2, 3;

-- Buyers = first purchase per member.
create or replace view public.analytics_buyers as
select distinct on (user_id) user_id, creator_slug, created_at as purchased_at, src, properties->>'plan' as plan
from public.events
where event_name = 'purchase_completed' and user_id is not null
order by user_id, created_at;

-- Activation: first workout within 24 h of the purchase.
create or replace view public.analytics_activation as
select
  b.creator_slug,
  date_trunc('week', b.purchased_at)::date as purchase_week,
  count(*) as buyers,
  count(*) filter (where fw.first_at <= b.purchased_at + interval '24 hours') as activated_24h,
  round(100.0 * count(*) filter (where fw.first_at <= b.purchased_at + interval '24 hours') / nullif(count(*), 0), 1) as pct_activated_24h
from public.analytics_buyers b
left join lateral (
  select min(w.completed_at) as first_at
  from public.workout_sessions w
  where w.user_id = b.user_id and w.status = 'completed'
) fw on true
group by 1, 2;

-- North star: share of buyers with ≥ 2 workouts in their first 7 days.
create or replace view public.analytics_week1_active as
select
  b.creator_slug,
  date_trunc('week', b.purchased_at)::date as purchase_week,
  count(*) as buyers,
  count(*) filter (where w.n >= 2) as week1_active,
  round(100.0 * count(*) filter (where w.n >= 2) / nullif(count(*), 0), 1) as pct_week1_active
from public.analytics_buyers b
left join lateral (
  select count(*) as n
  from public.workout_sessions ws
  where ws.user_id = b.user_id and ws.status = 'completed'
    and ws.completed_at >= b.purchased_at and ws.completed_at < b.purchased_at + interval '7 days'
) w on true
where b.purchased_at < now() - interval '7 days'   -- only buyers whose first week is over
group by 1, 2;

-- Cohort retention: per purchase week, share of buyers who trained in week N after buying.
create or replace view public.analytics_cohort_retention as
with cohorts as (
  select creator_slug, date_trunc('week', purchased_at)::date as cohort_week, count(*) as size
  from public.analytics_buyers group by 1, 2
),
activity as (
  select b.creator_slug, date_trunc('week', b.purchased_at)::date as cohort_week,
         floor(extract(epoch from (ws.completed_at - b.purchased_at)) / 604800)::int as week_n,
         b.user_id
  from public.analytics_buyers b
  join public.workout_sessions ws on ws.user_id = b.user_id and ws.status = 'completed' and ws.completed_at >= b.purchased_at
)
select c.creator_slug, c.cohort_week, c.size as cohort_size, a.week_n,
       count(distinct a.user_id) as active,
       round(100.0 * count(distinct a.user_id) / nullif(c.size, 0), 1) as pct_active
from cohorts c
join activity a on a.creator_slug = c.creator_slug and a.cohort_week = c.cohort_week
where a.week_n between 0 and 12
group by 1, 2, 3, 4;

-- Revenue per source (net of refunds, ex tax).
create or replace view public.analytics_revenue_by_src as
select
  creator_slug,
  coalesce(src, '(none)') as src,
  currency,
  count(*) filter (where kind = 'payment' and is_first) as purchases,
  sum(case when kind = 'payment' then amount_cents - tax_cents else 0 end) as gross_ex_tax_cents,
  sum(case when kind = 'refund' then amount_cents - tax_cents else 0 end) as refunds_ex_tax_cents,
  sum(case when kind = 'payment' then amount_cents - tax_cents else -(amount_cents - tax_cents) end) as net_ex_tax_cents
from public.payments
group by 1, 2, 3;

-- Monthly creator report: purchases, revenue, cancellations, revenue share.
-- Basis for the payout to the creator. Revenue = paid minus refunds, excluding VAT;
-- Stripe fees are NOT deducted here — follow whatever the contract says.
create or replace view public.creator_monthly_report as
with money as (
  select creator_slug, date_trunc('month', created_at)::date as month, currency,
         count(*) filter (where kind = 'payment' and is_first) as purchases,
         sum(case when kind = 'payment' then amount_cents - tax_cents else 0 end) as revenue_ex_tax_cents,
         sum(case when kind = 'refund' then amount_cents - tax_cents else 0 end) as refunds_ex_tax_cents
  from public.payments group by 1, 2, 3
),
cancels as (
  select creator_slug, date_trunc('month', canceled_at)::date as month, count(*) as cancellations
  from public.subscriptions where canceled_at is not null group by 1, 2
)
select m.creator_slug, m.month, m.currency, m.purchases,
       coalesce(c.cancellations, 0) as cancellations,
       m.revenue_ex_tax_cents, m.refunds_ex_tax_cents,
       m.revenue_ex_tax_cents - m.refunds_ex_tax_cents as net_ex_tax_cents,
       cs.rev_share_percent,
       round((m.revenue_ex_tax_cents - m.refunds_ex_tax_cents) * coalesce(cs.rev_share_percent, 0) / 100.0)::int as rev_share_cents
from money m
left join cancels c on c.creator_slug = m.creator_slug and c.month = m.month
left join public.creator_settings cs on cs.creator_slug = m.creator_slug;

revoke all on public.analytics_funnel, public.analytics_quiz_steps, public.analytics_buyers, public.analytics_activation,
  public.analytics_week1_active, public.analytics_cohort_retention, public.analytics_revenue_by_src,
  public.creator_monthly_report from anon, authenticated;
