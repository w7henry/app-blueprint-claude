// After checkout: sign in silently (one-time token from the paid checkout),
// a short welcome from the creator, then straight into the first workout.
// Max. 3 taps from purchase to the first logged set (activation.md).

import { useEffect, useRef, useState } from 'react';
import { CreatorImage } from '../../components/CreatorImage';
import { Button, Screen, Spinner } from '../../components/ui';
import creator, { t } from '../../creator';
import { track } from '../../lib/analytics';
import { api } from '../../lib/api';
import { demoSubscription } from '../../lib/demo';
import { DEMO } from '../../lib/env';
import { navigate, useLocation } from '../../router';
import { formatDate } from '../../shared/format';
import { addDays, isTrainingDay, scheduleShort, startOfDay } from '../../shared/plan';
import { beginWorkout } from '../actions';
import { refreshDemoAuth, signInWithTokenHash, useAuth } from '../auth';
import { setProfile } from '../store';
import { usePlan } from '../usePlan';

function useCheckoutLogin() {
  const { query } = useLocation();
  const auth = useAuth();
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    if (DEMO) {
      tried.current = true;
      if (!demoSubscription()) navigate('/join', { replace: true });
      else refreshDemoAuth();
      return;
    }
    if (auth.status !== 'signed-out') return;
    const sessionId = query.get('session_id');
    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }
    tried.current = true;
    void (async () => {
      // The webhook may not have arrived yet; the endpoint fulfils idempotently. Retry briefly.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await api<{ tokenHash: string }>('/api/auth/checkout-login', { body: { sessionId } });
          await signInWithTokenHash(res.tokenHash);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      setFailed(true);
    })();
  }, [auth.status, query]);

  return { auth, failed };
}

export default function Welcome() {
  const { auth, failed } = useCheckoutLogin();
  const plan = usePlan();
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (auth.status === 'signed-in' && plan) {
      track('onboarding_started', { program: plan.program.id }, { once: 'onboarding_started' });
      track('welcome_viewed', { program: plan.program.id }, { once: 'welcome_viewed' });
    }
  }, [auth.status, plan]);

  if (failed) {
    return (
      <Screen className="center-fill">
        <h1 className="display app-title">Payment received.</h1>
        <p>We couldn’t log you in automatically. Your login link is in your inbox. Tap it and you’re in.</p>
        <Button variant="secondary" onClick={() => navigate('/login')}>
          Send the link again
        </Button>
      </Screen>
    );
  }
  if (auth.status !== 'signed-in' || !plan) return <Spinner label="Setting up your plan" />;

  const first = plan.next ?? plan.slots[0];
  const today = new Date();
  const trainingToday = isTrainingDay(today, plan.profile.schedule);
  const upcoming = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(today), i + 1)).filter((d) => isTrainingDay(d, plan.profile.schedule));

  const start = () => {
    if (beginWorkout()) navigate('/app/workout');
  };

  const schedule = (d: Date) => {
    setProfile({ firstWorkoutScheduledFor: d.toISOString() });
    track('workout_scheduled', { weekday: d.getDay(), days_ahead: Math.round((d.getTime() - startOfDay(today).getTime()) / 864e5) });
    navigate('/app/reminders?next=/app');
  };

  return (
    <main className="screen welcome">
      <div className="done-hero">
        <CreatorImage source={creator.brand.images.welcome} className="story-img" priority width={600} height={640} />
        <h1 className="display done-title">{creator.copy.welcome.title}</h1>
        {creator.copy.welcome.body.map((p) => (
          <p key={p} className="story-p">
            {t(p, { minutes: first.workout.minutes, program: plan.program.name })}
          </p>
        ))}
        <p className="signoff">{creator.voice.signOff}</p>
        {!trainingToday ? (
          <p className="notice" style={{ marginTop: 20 }}>
            Your training days are {scheduleShort(plan.profile.schedule)}. Today is a rest day, but you can start anyway.
          </p>
        ) : null}
        {scheduling ? (
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="label">Pick your first day</h2>
            <div className="day-picker">
              {upcoming.map((d) => (
                <button key={d.toISOString()} onClick={() => schedule(d)} aria-pressed={false}>
                  {formatDate(d, { weekday: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!DEMO ? (
          <p className="muted small" style={{ marginTop: 16 }}>
            We also emailed you a login link for your other devices.
          </p>
        ) : null}
      </div>
      <div className="bottom-bar">
        <Button block className="btn-lg" onClick={start}>
          {trainingToday ? creator.copy.welcome.cta : 'Start now anyway'}
        </Button>
        {!trainingToday && !scheduling ? (
          <Button variant="ghost" block onClick={() => setScheduling(true)}>
            Schedule it instead
          </Button>
        ) : null}
      </div>
    </main>
  );
}
