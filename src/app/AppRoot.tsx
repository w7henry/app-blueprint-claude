// Everything after the purchase: onboarding, login, the workout app.
// Loaded lazily — none of this code is on the landing page.

import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Spinner } from '../components/ui';
import creator from '../creator';
import { track } from '../lib/analytics';
import { DEMO } from '../lib/env';
import { currentPlan, getFunnel } from '../lib/funnel';
import { Link, navigate, useLocation } from '../router';
import { isComplete } from '../shared/quiz';
import { useAuth } from './auth';
import { useMembership } from './membership';
import Cancel from './pages/Cancel';
import Done from './pages/Done';
import Install from './pages/Install';
import Login, { LoginCallback } from './pages/Login';
import MembershipGate from './pages/MembershipGate';
import Player from './pages/Player';
import ProgramComplete from './pages/ProgramComplete';
import Progress from './pages/Progress';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Welcome from './pages/Welcome';
import { getData, openStore, setProfile, useAppData } from './store';
import './installPrompt';
import { pullAll, syncNow, wireSync } from './sync';

function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
}

/** Creates the profile from the quiz answers (same device) or sensible defaults. */
export function ensureProfile(): void {
  if (getData().profile) return;
  const f = getFunnel();
  const plan = currentPlan(f);
  setProfile({
    programId: plan.programId,
    daysKey: plan.daysKey,
    schedule: plan.schedule,
    shortSessions: plan.shortSessions,
    answers: isComplete(creator, f.answers) ? f.answers : {},
    programStartedAt: new Date().toISOString(),
  });
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function TabBar({ path }: { path: string }) {
  const tabs = [
    { to: '/app', label: 'Today', icon: 'home' as const },
    { to: '/app/progress', label: 'Progress', icon: 'chart' as const },
    { to: '/app/settings', label: 'Settings', icon: 'settings' as const },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} aria-current={path === t.to ? 'page' : undefined}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Gated({ path, userId }: { path: string; userId: string }) {
  const membership = useMembership(userId);
  const data = useAppData();
  const { query } = useLocation();

  useEffect(() => {
    const ref = query.get('ref') ?? 'direct';
    track('app_opened', { ref }, { once: 'app_opened' });
    if (ref === 'weekly_summary') track('weekly_summary_opened', {}, { once: `weekly_summary_opened:${new Date().toDateString()}` });
    if (ref === 'reminder') track('reminder_opened', {}, { once: `reminder_opened:${new Date().toDateString()}` });
  }, [query]);

  if (membership.loading) return <Spinner label="Checking your membership" />;
  if (!membership.access?.hasAccess) return <MembershipGate access={membership.access} />;
  if (!data.profile) return <Spinner label="Loading your plan" />;

  let page;
  switch (path) {
    case '/app':
      page = <Today access={membership.access} rows={membership.rows} />;
      break;
    case '/app/workout':
      return <Player />;
    case '/app/done':
      return <Done />;
    case '/app/reminders':
      return <Reminders />;
    case '/app/install':
      return <Install />;
    case '/app/complete':
      return <ProgramComplete rows={membership.rows} />;
    case '/app/progress':
      page = <Progress />;
      break;
    case '/app/settings':
      page = <Settings access={membership.access} rows={membership.rows} onChanged={membership.reload} />;
      break;
    case '/app/settings/cancel':
      return <Cancel access={membership.access} onChanged={membership.reload} />;
    default:
      return <Redirect to="/app" />;
  }
  return (
    <>
      {page}
      <TabBar path={path} />
    </>
  );
}

export default function AppRoot({ path }: { path: string }) {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    wireSync();
  }, []);

  useEffect(() => {
    if (auth.status !== 'signed-in') return;
    openStore(auth.userId);
    if (auth.demo || getData().profile) setReady(true);
    void pullAll().then(() => {
      ensureProfile();
      setReady(true);
      void syncNow();
    });
  }, [auth]);

  let content;
  if (path === '/welcome') content = <Welcome />;
  else if (path === '/login') content = <Login />;
  else if (path === '/login/callback') content = <LoginCallback />;
  else if (auth.status === 'loading') content = <Spinner />;
  else if (auth.status === 'signed-out') content = <Redirect to="/login" />;
  else if (!ready) content = <Spinner label="Loading your plan" />;
  else content = <Gated path={path} userId={auth.userId} />;

  return (
    <>
      {DEMO ? <div className="demo-banner">Demo mode · no real payments · data stays on this device</div> : null}
      {content}
    </>
  );
}
