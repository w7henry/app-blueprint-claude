import { useEffect, useRef, useState } from 'react';
import { CreatorImage } from '../components/CreatorImage';
import { BackButton, Button } from '../components/ui';
import creator, { getProgram, t } from '../creator';
import { sessionId, track } from '../lib/analytics';
import { api } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { demoPurchase } from '../lib/demo';
import { DEMO } from '../lib/env';
import { currentPlan, getFunnel, updateFunnel, useFunnel } from '../lib/funnel';
import { Link, navigate, useLocation } from '../router';
import { formatDate, formatMoney, perMonth } from '../shared/format';
import { programWeeks, scheduleShort } from '../shared/plan';
import { isComplete } from '../shared/quiz';

const offer = creator.offer;
const money = (c: number) => formatMoney(c, offer.currency);

interface Option {
  id: string;
  title: string;
  price: string;
  sub: string;
  badge?: string;
  trialDays: number;
}

function options(programName: string): Option[] {
  const list: Option[] = offer.plans.map((p) => ({
    id: p.id,
    title: p.label,
    price: p.interval === 'year' ? `${money(perMonth(p.priceCents))} / month` : `${money(p.priceCents)} / month`,
    sub: p.interval === 'year' ? `${money(p.priceCents)} billed yearly` : 'Billed monthly',
    badge: p.badge,
    trialDays: p.trialDays,
  }));
  if (offer.oneTime?.enabled) {
    list.push({ id: 'one_time', title: offer.oneTime.label, price: money(offer.oneTime.priceCents), sub: `One payment · ${programName} only`, trialDays: 0 });
  }
  return list;
}

function billingLine(optionId: string): string {
  if (optionId === 'one_time' && offer.oneTime) return `One payment of ${money(offer.oneTime.priceCents)} today. No subscription, nothing renews.`;
  const p = offer.plans.find((x) => x.id === optionId)!;
  const every = p.interval === 'year' ? 'every year' : 'every month';
  if (p.trialDays > 0) {
    const charge = new Date(Date.now() + p.trialDays * 864e5);
    return `Today: ${money(0)}. On ${formatDate(charge, { month: 'long', day: 'numeric' })}: ${money(p.priceCents)}, then ${money(p.priceCents)} ${every} until you cancel. We’ll email you 3 days before your free week ends.`;
  }
  return `Today: ${money(p.priceCents)}, then ${money(p.priceCents)} ${every} until you cancel.`;
}

export default function Paywall() {
  const funnel = useFunnel();
  const { query } = useLocation();
  const complete = isComplete(creator, funnel.answers);
  const plan = currentPlan(funnel);
  const program = getProgram(plan.programId)!;
  const opts = options(program.shortName);
  const defaultId = offer.plans.find((p) => p.highlight)?.id ?? opts[0].id;
  const [selected, setSelected] = useState(funnel.selectedPlan && opts.some((o) => o.id === funnel.selectedPlan) ? funnel.selectedPlan : defaultId);
  const [age, setAge] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ageRef = useRef<HTMLInputElement>(null);
  const wdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!complete) navigate('/quiz/resume', { replace: true });
  }, [complete]);

  useEffect(() => {
    if (complete) track('paywall_viewed', { program: program.id }, { once: 'paywall_viewed' });
  }, [complete, program.id]);

  if (!complete) return null;

  const select = (id: string) => {
    if (id === selected) return;
    setSelected(id);
    updateFunnel({ selectedPlan: id });
    track('plan_selected', { plan: id });
  };

  const checkout = async () => {
    setError(null);
    if (!age) {
      setError('Please confirm your age to continue.');
      ageRef.current?.focus();
      return;
    }
    if (!withdrawal) {
      setError('Please confirm that your membership can start right away.');
      wdRef.current?.focus();
      return;
    }
    setBusy(true);
    track('checkout_started', { plan: selected, program: program.id });
    if (DEMO) {
      demoPurchase(selected, program.id);
      setTimeout(() => navigate('/welcome?demo=1'), 400);
      return;
    }
    try {
      const f = getFunnel();
      const res = await api<{ url: string }>('/api/checkout', {
        body: {
          plan: selected,
          email: f.email ?? null,
          answers: f.answers,
          programId: plan.programId,
          daysKey: plan.daysKey,
          attribution: getAttribution(),
          analyticsSession: sessionId(),
          consents: { age: true, withdrawal: true, withdrawalText: creator.legal.withdrawalConsentLabel, at: new Date().toISOString() },
        },
      });
      window.location.assign(res.url);
    } catch {
      setBusy(false);
      setError('Checkout could not be opened. Please check your connection and try again.');
    }
  };

  const current = opts.find((o) => o.id === selected)!;

  return (
    <main className="screen paywall">
      <div className="topnav">
        <BackButton fallback="/plan" />
      </div>

      <header className="paywall-head">
        <CreatorImage source={creator.brand.images.avatar} className="avatar-md" width={160} height={160} />
        <div>
          <h1 className="display paywall-title">{t(creator.copy.paywall.title, { program: program.name })}</h1>
          <p className="muted small">
            {programWeeks(program)} weeks · {scheduleShort(plan.schedule)}
          </p>
        </div>
      </header>

      {query.get('canceled') ? <p className="notice">No worries, nothing was charged. Your plan is still here.</p> : null}

      <div className="plans" role="radiogroup" aria-label="Choose your membership">
        {opts.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={selected === o.id}
            className={`plan-option${selected === o.id ? ' is-selected' : ''}`}
            onClick={() => select(o.id)}
          >
            <span className="plan-radio" aria-hidden />
            <span className="plan-main">
              <span className="plan-title">
                {o.title}
                {o.badge ? <span className="badge">{o.badge}</span> : null}
              </span>
              <span className="muted small">{o.sub}</span>
              {o.trialDays ? <span className="plan-trial">{o.trialDays}-day free trial</span> : null}
            </span>
            <span className="plan-price">{o.price}</span>
          </button>
        ))}
      </div>

      <p className="billing-line">{billingLine(current.id)}</p>

      <div className="consents">
        <label className="check">
          <input ref={ageRef} type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
          <span>{creator.legal.ageConfirmLabel}</span>
        </label>
        <label className="check">
          <input ref={wdRef} type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} />
          <span>
            {creator.legal.withdrawalConsentLabel} <Link to="/legal/withdrawal">Details</Link>
          </span>
        </label>
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bottom-bar">
        <Button block className="btn-lg" busy={busy} onClick={checkout}>
          {current.trialDays ? `Start my free ${current.trialDays === 7 ? 'week' : `${current.trialDays} days`}` : creator.copy.paywall.cta}
        </Button>
        <p className="pay-note">{DEMO ? 'Demo mode: no payment is taken.' : 'Secure checkout with Stripe · Apple Pay · Google Pay · card'}</p>
      </div>

      <p className="muted small center">{creator.copy.paywall.reassurance}</p>
      {funnel.email ? <p className="muted small center">Your account will use {funnel.email}.</p> : null}
      <nav className="footer-links center" aria-label="Legal">
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/privacy">Privacy</Link>
        <Link to="/legal/withdrawal">Right of withdrawal</Link>
      </nav>
    </main>
  );
}
