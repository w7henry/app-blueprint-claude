// Push permission with context, after the first workout or when scheduling —
// never on first open. Declined or unsupported → calendar file (.ics).

import { useEffect, useState } from 'react';
import { Button, Screen } from '../../components/ui';
import creator, { t } from '../../creator';
import { track } from '../../lib/analytics';
import { navigate, useLocation } from '../../router';
import { scheduleSentence } from '../../shared/plan';
import { buildIcs, downloadFile } from '../ics';
import { enablePush, pushSupported } from '../push';
import { setProfile } from '../store';
import { usePlan } from '../usePlan';

const HOURS = [6, 7, 8, 12, 16, 17, 18, 19, 20];
const label = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'am' : 'pm'}`;

export default function Reminders() {
  const plan = usePlan()!;
  const { query } = useLocation();
  const next = query.get('next') ?? '/app';
  const [hour, setHour] = useState(plan.profile.reminders.hour);
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const days = scheduleSentence(plan.profile.schedule);

  useEffect(() => {
    track('push_prompt_shown', { supported: pushSupported() }, { once: 'push_prompt_shown' });
  }, []);

  const finish = () => navigate(next, { replace: true });

  const yes = async () => {
    setBusy(true);
    setProfile({ remindersAsked: true, reminders: { ...plan.profile.reminders, hour } });
    const result = await enablePush();
    track('push_permission_result', { result });
    setBusy(false);
    if (result === 'granted') {
      setProfile({ reminders: { ...plan.profile.reminders, hour, push: true } });
      finish();
    } else setFallback(true);
  };

  const calendar = () => {
    const ics = buildIcs({
      schedule: plan.profile.schedule,
      hour,
      minutes: plan.next?.workout.minutes ?? 45,
      title: `${creator.identity.appName} workout`,
      description: `Your ${plan.program.name} workout. Open the app: ${window.location.origin}/app`,
      url: `${window.location.origin}/app?ref=calendar`,
      uid: `${creator.identity.slug}-${plan.profile.programStartedAt}@${creator.identity.domain}`,
    });
    downloadFile(ics, `${creator.identity.slug}-workouts.ics`, 'text/calendar');
    track('workout_scheduled', { method: 'calendar', days: plan.profile.schedule.length });
    setProfile({ remindersAsked: true, reminders: { ...plan.profile.reminders, hour, email: true } });
    finish();
  };

  const notNow = () => {
    setProfile({ remindersAsked: true });
    finish();
  };

  return (
    <Screen>
      <div className="done-hero">
        <p className="eyebrow">Reminders</p>
        <h1 className="display done-title">{fallback ? 'Add it to your calendar instead?' : t(creator.copy.templates.scheduleAsk, { days })}</h1>
        <p className="muted">
          {fallback
            ? 'No problem. One tap adds your training days as a weekly event, with an alert 30 minutes before.'
            : 'One reminder on training days, at the time you pick. Never more than one a day, and you can turn it off in Settings.'}
        </p>
        <label className="field">
          <span className="field-label">Time</span>
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {label(h)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="bottom-bar">
        <Button block className="btn-lg" busy={busy} onClick={fallback ? calendar : pushSupported() ? yes : calendar}>
          {fallback || !pushSupported() ? 'Add to my calendar' : 'Yes, remind me'}
        </Button>
        <Button variant="ghost" block onClick={notNow}>
          Not now
        </Button>
      </div>
    </Screen>
  );
}
