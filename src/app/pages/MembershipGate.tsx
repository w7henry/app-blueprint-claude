// Shown when the account has no access (ended, paused, payment failed).

import { Button, Screen } from '../../components/ui';
import creator from '../../creator';
import { isComplete } from '../../shared/quiz';
import { getFunnel } from '../../lib/funnel';
import { navigate } from '../../router';
import type { Access } from '../../shared/access';
import { formatLongDate } from '../../shared/format';
import { signOut } from '../auth';
import { membershipAction, openBillingPortal } from '../billing';

export default function MembershipGate({ access }: { access: Access | null }) {
  const reason = access?.reason ?? 'none';
  const rejoin = () => navigate(isComplete(creator, getFunnel().answers) ? '/join' : '/quiz/1');
  const copy: Record<string, { title: string; body: string; cta: string; action: () => void }> = {
    paused: {
      title: 'Your membership is paused.',
      body: access?.until ? `It restarts on ${formatLongDate(access.until)}. Want to come back now?` : 'Want to come back now?',
      cta: 'Resume now',
      action: () => void membershipAction('resume').then(() => window.location.reload()),
    },
    payment_failed: {
      title: 'Your last payment didn’t go through.',
      body: 'Update your payment method and you’re straight back in.',
      cta: 'Update payment',
      action: () => void openBillingPortal(),
    },
    ended: { title: 'Your membership has ended.', body: `Your workouts and numbers are still saved. Come back anytime.`, cta: 'See plans', action: rejoin },
    none: {
      title: 'No membership on this account.',
      body: `If you bought ${creator.identity.appName} with another email, log in with that one.`,
      cta: 'See plans',
      action: rejoin,
    },
  };
  const c = copy[reason] ?? copy.none;
  return (
    <Screen>
      <div className="done-hero">
        <h1 className="display done-title">{c.title}</h1>
        <p>{c.body}</p>
      </div>
      <div className="bottom-bar">
        <Button block className="btn-lg" onClick={c.action}>
          {c.cta}
        </Button>
        <Button variant="ghost" block onClick={() => void signOut().then(() => navigate('/login'))}>
          Log in with another email
        </Button>
      </div>
    </Screen>
  );
}
