import { useState } from 'react';
import { Button } from '../../components/ui';
import creator from '../../creator';
import { track } from '../../lib/analytics';
import { clearDemo } from '../../lib/demo';
import { DEMO } from '../../lib/env';
import { Link, navigate } from '../../router';
import { weekdays, type Weekday } from '../../shared/weekdays';
import type { Access, SubscriptionRow } from '../../shared/access';
import { formatLongDate, formatMoney, perMonth } from '../../shared/format';
import { dayName, sortSchedule } from '../../shared/plan';
import { signOut, useAuth } from '../auth';
import { deleteAccount, membershipAction, openBillingPortal } from '../billing';
import { enablePush, pushSupported } from '../push';
import { setProfile, wipeStore } from '../store';
import { usePlan } from '../usePlan';

function membershipLine(access: Access): string {
  const until = access.until ? formatLongDate(access.until) : null;
  switch (access.reason) {
    case 'trial':
      return `Free trial until ${until}. Then your membership starts.`;
    case 'active':
      return until ? `Active · renews on ${until}` : 'Active';
    case 'canceling':
      return `Cancelled · full access until ${until}`;
    case 'grace':
      return `Your last payment failed. Access until ${until} while we retry.`;
    case 'one_time':
      return 'Lifetime access to your program';
    default:
      return 'No active membership';
  }
}

export default function Settings({ access, rows, onChanged }: { access: Access; rows: SubscriptionRow[]; onChanged: () => void }) {
  const plan = usePlan()!;
  const auth = useAuth();
  const { profile } = plan;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const sub = rows.find((r) => r.kind === 'subscription');
  const annual = creator.offer.plans.find((p) => p.id === 'annual');

  const change = (setting: string, value: string | number | boolean, patch: Parameters<typeof setProfile>[0]) => {
    setProfile(patch);
    track('settings_changed', { setting, value });
  };

  const toggleDay = (d: Weekday) => {
    const has = profile.schedule.includes(d);
    const next = has ? profile.schedule.filter((x) => x !== d) : sortSchedule([...profile.schedule, d]);
    if (next.length < 1 || next.length > 6) return;
    change('days', next.length, { schedule: next, daysKey: String(next.length) });
  };

  const togglePush = async () => {
    if (profile.reminders.push) return change('reminder_push', false, { reminders: { ...profile.reminders, push: false } });
    const result = await enablePush();
    track('push_permission_result', { result, from: 'settings' });
    if (result === 'granted') change('reminder_push', true, { reminders: { ...profile.reminders, push: true } });
  };

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const remove = async () => {
    await run('delete', async () => {
      await deleteAccount();
      wipeStore();
      if (DEMO) clearDemo();
      await signOut();
      navigate('/', { replace: true });
    });
  };

  return (
    <main className="app-main">
      <header className="app-header">
        <h1 className="display app-title">Settings</h1>
      </header>

      <section className="settings-group">
        <h2 className="label">Training</h2>
        <ul className="list-rows">
          <li className="row">
            <span>Units</span>
            <div className="segmented" role="group" aria-label="Weight units">
              {(['kg', 'lbs'] as const).map((u) => (
                <button key={u} aria-pressed={profile.unit === u} onClick={() => profile.unit !== u && change('unit', u, { unit: u })}>
                  {u}
                </button>
              ))}
            </div>
          </li>
          <li className="row" style={{ display: 'block' }}>
            <span>Training days</span>
            <div className="day-picker" role="group" aria-label="Training days">
              {weekdays.map((d) => (
                <button key={d} aria-pressed={profile.schedule.includes(d)} onClick={() => toggleDay(d)}>
                  {dayName(d)}
                </button>
              ))}
            </div>
            <p className="muted small" style={{ margin: '8px 0' }}>
              Your plan follows these days. Missed one? It simply moves on.
            </p>
          </li>
          <li className="row">
            <span>Program</span>
            <span className="muted">{plan.program.name}</span>
          </li>
        </ul>
      </section>

      <section className="settings-group">
        <h2 className="label">Reminders</h2>
        <ul className="list-rows">
          {pushSupported() ? (
            <li className="row">
              <label htmlFor="push">Push on training days</label>
              <input id="push" type="checkbox" className="switch" checked={profile.reminders.push} onChange={() => void togglePush()} />
            </li>
          ) : null}
          <li className="row">
            <label htmlFor="mail">Email reminders and weekly recap</label>
            <input
              id="mail"
              type="checkbox"
              className="switch"
              checked={profile.reminders.email}
              onChange={(e) => change('reminder_email', e.target.checked, { reminders: { ...profile.reminders, email: e.target.checked } })}
            />
          </li>
        </ul>
      </section>

      <section className="settings-group" id="membership">
        <h2 className="label">Membership</h2>
        <p style={{ margin: '4px 0 12px' }}>{membershipLine(access)}</p>
        <ul className="list-rows">
          {sub && sub.plan_id === 'monthly' && annual && !sub.cancel_at_period_end ? (
            <li className="row">
              <span>Switch to yearly · {formatMoney(perMonth(annual.priceCents), creator.offer.currency)}/month</span>
              <Button variant="ghost" busy={busy === 'upgrade'} onClick={() => run('upgrade', () => membershipAction('upgrade'))}>
                Switch
              </Button>
            </li>
          ) : null}
          {sub ? (
            <li className="row">
              <span>Payment method and invoices</span>
              <Button variant="ghost" onClick={() => void openBillingPortal()}>
                Manage
              </Button>
            </li>
          ) : null}
          {sub && (sub.cancel_at_period_end || access.reason === 'canceling') ? (
            <li className="row">
              <span>Changed your mind?</span>
              <Button variant="ghost" busy={busy === 'resume'} onClick={() => run('resume', () => membershipAction('resume'))}>
                Resume membership
              </Button>
            </li>
          ) : sub ? (
            <li className="row">
              <Link to="/app/settings/cancel" className="row-link">
                <span>Cancel membership here</span>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <section className="settings-group">
        <h2 className="label">Account</h2>
        <ul className="list-rows">
          {auth.status === 'signed-in' && auth.email ? (
            <li className="row">
              <span>Email</span>
              <span className="muted">{auth.email}</span>
            </li>
          ) : null}
          <li className="row">
            <button className="row-link" onClick={() => void logout()}>
              Log out
            </button>
          </li>
          <li className="row" style={{ display: 'block' }}>
            {confirmDelete ? (
              <div style={{ padding: '8px 0' }}>
                <p style={{ marginBottom: 10 }}>
                  This deletes your account, workouts and settings. Your membership is cancelled immediately. This can’t be undone.
                </p>
                <Button block busy={busy === 'delete'} onClick={() => void remove()}>
                  Delete my account
                </Button>
                <Button variant="ghost" block onClick={() => setConfirmDelete(false)}>
                  Keep my account
                </Button>
              </div>
            ) : (
              <button className="row-link" onClick={() => setConfirmDelete(true)}>
                Delete account
              </button>
            )}
          </li>
        </ul>
      </section>

      <nav className="footer-links" aria-label="Legal" style={{ marginTop: 24 }}>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/legal/privacy">Privacy</Link>
        <Link to="/legal/imprint">Imprint</Link>
        <a href={`mailto:${creator.identity.supportEmail}`}>Support</a>
      </nav>
    </main>
  );
}
