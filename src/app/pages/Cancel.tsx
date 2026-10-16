// Cancellation (paywall.md): optional reason, at most ONE matching offer,
// and "Cancel now" is always one tap away. No guilt-tripping copy.

import { useEffect, useRef, useState } from 'react';
import { BackButton, Button, Screen } from '../../components/ui';
import creator, { t } from '../../creator';
import { track } from '../../lib/analytics';
import { navigate } from '../../router';
import type { Access } from '../../shared/access';
import { formatLongDate } from '../../shared/format';
import { membershipAction } from '../billing';
import { setProfile } from '../store';
import { usePlan } from '../usePlan';

type Offer = 'pause' | 'switch' | 'discount';

export default function Cancel({ access, onChanged }: { access: Access; onChanged: () => void }) {
  const plan = usePlan()!;
  const [reasons, setReasons] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'canceled' | 'saved' | 'error'>('idle');
  const [savedText, setSavedText] = useState('');
  const [periodEnd, setPeriodEnd] = useState<string | null>(access.until?.toISOString() ?? null);
  const [showPrograms, setShowPrograms] = useState(false);
  const started = useRef(false);
  const c = creator.offer.cancel;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    track('cancel_flow_started', { reason: access.reason });
  }, [access.reason]);

  const toggle = (id: string) => {
    const selected = reasons.includes(id);
    if (!selected) track('cancel_reason_selected', { reason: id });
    setReasons(selected ? reasons.filter((x) => x !== id) : [...reasons, id]);
  };

  const offer = c.reasons.find((r) => reasons.includes(r.id) && r.offer !== 'none')?.offer as Offer | undefined;
  const otherPrograms = creator.programs.filter((p) => p.id !== plan.program.id);

  const cancelNow = async () => {
    setState('busy');
    try {
      const res = await membershipAction('cancel', { reasons });
      setPeriodEnd(res.periodEnd ?? periodEnd);
      setState('canceled');
      onChanged();
    } catch {
      setState('error');
    }
  };

  const accept = async (o: Offer, programId?: string) => {
    setState('busy');
    try {
      if (o === 'switch' && programId) {
        setProfile({ programId, programStartedAt: new Date().toISOString() });
        setSavedText(`You’re now on ${creator.programs.find((p) => p.id === programId)?.name}. Your membership continues.`);
      } else if (o === 'pause') {
        await membershipAction('pause', { months: c.pauseMonths });
        setSavedText(`Paused for ${c.pauseMonths} month${c.pauseMonths > 1 ? 's' : ''}. No charge in that time. Resume anytime in Settings.`);
      } else {
        await membershipAction('discount', {});
        setSavedText(`Done: ${c.discount.percent}% off your next ${c.discount.months} months.`);
      }
      track('save_offer_accepted', { offer: o, program: programId ?? null });
      setState('saved');
      onChanged();
    } catch {
      setState('error');
    }
  };

  if (state === 'canceled' || state === 'saved') {
    return (
      <Screen>
        <div className="done-hero">
          <h1 className="display done-title">{state === 'canceled' ? 'Membership cancelled.' : 'You’re staying. Love that.'}</h1>
          <p>
            {state === 'canceled'
              ? t(creator.copy.templates.cancelConfirm, { date: periodEnd ? formatLongDate(periodEnd) : 'the end of your period' })
              : savedText}
          </p>
          {state === 'canceled' ? (
            <p className="muted small" style={{ marginTop: 12 }}>
              We’ve sent you a confirmation email.
            </p>
          ) : null}
        </div>
        <div className="bottom-bar">
          <Button block onClick={() => navigate('/app', { replace: true })}>
            Back to the app
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="topnav">
        <BackButton fallback="/app/settings" />
      </div>
      <h1 className="display app-title">Cancel membership</h1>
      <p className="muted" style={{ margin: '8px 0 16px' }}>
        You keep full access until {access.until ? formatLongDate(access.until) : 'the end of your paid period'}. Telling us why is optional.
      </p>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label">Why are you leaving? (optional)</legend>
        {c.reasons.map((r) => (
          <label key={r.id} className="check">
            <input type="checkbox" checked={reasons.includes(r.id)} onChange={() => toggle(r.id)} />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>

      {offer === 'pause' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 12 }}>
            Need a break? Pause for {c.pauseMonths} month{c.pauseMonths > 1 ? 's' : ''} instead. No charge, your plan waits for you.
          </p>
          <Button variant="secondary" block onClick={() => void accept('pause')}>
            Pause instead
          </Button>
        </div>
      ) : offer === 'discount' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 12 }}>
            Stay for {c.discount.percent}% off your next {c.discount.months} months.
          </p>
          <Button variant="secondary" block onClick={() => void accept('discount')}>
            Take {c.discount.percent}% off
          </Button>
        </div>
      ) : offer === 'switch' && otherPrograms.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 12 }}>Want to try a different program instead?</p>
          {showPrograms ? (
            <div className="swap-list">
              {otherPrograms.map((p) => (
                <button key={p.id} onClick={() => void accept('switch', p.id)}>
                  {p.name} · <span className="muted">{p.tagline}</span>
                </button>
              ))}
            </div>
          ) : (
            <Button variant="secondary" block onClick={() => setShowPrograms(true)}>
              Show programs
            </Button>
          )}
        </div>
      ) : null}

      {state === 'error' ? (
        <p className="field-error" role="alert">
          That didn’t work. Please try again or email {creator.identity.supportEmail}.
        </p>
      ) : null}

      <div className="bottom-bar">
        <Button block className="btn-lg" busy={state === 'busy'} onClick={() => void cancelNow()}>
          Cancel now
        </Button>
      </div>
    </Screen>
  );
}
