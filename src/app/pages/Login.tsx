// Passwordless login. The link in the email points to /login/callback?token_hash=…

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BackButton, Button, Screen, Spinner } from '../../components/ui';
import creator from '../../creator';
import { track } from '../../lib/analytics';
import { api } from '../../lib/api';
import { DEMO } from '../../lib/env';
import { getFunnel } from '../../lib/funnel';
import { navigate, useLocation } from '../../router';
import { signInWithTokenHash, useAuth } from '../auth';

export default function Login() {
  const auth = useAuth();
  const [email, setEmail] = useState(getFunnel().email ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (auth.status === 'signed-in') navigate('/app', { replace: true });
  }, [auth.status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setState('busy');
    track('login_link_requested');
    if (DEMO) {
      setState('sent');
      return;
    }
    try {
      await api('/api/auth/link', { body: { email: email.trim().toLowerCase() } });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <Screen>
      <div className="topnav">
        <BackButton fallback="/" />
      </div>
      <h1 className="display app-title">Log in</h1>
      {state === 'sent' ? (
        <p style={{ marginTop: 16 }}>
          {DEMO
            ? 'Demo mode: there are no emails. Buy a plan on this device to get in.'
            : `Check your inbox. If ${email} has a ${creator.identity.appName} membership, your login link is on its way.`}
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="muted" style={{ marginTop: 12 }}>
            No password needed. We’ll email you a link.
          </p>
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {state === 'error' ? (
            <p className="field-error" role="alert">
              That didn’t work. Please try again.
            </p>
          ) : null}
          <Button type="submit" block busy={state === 'busy'}>
            Email me a login link
          </Button>
        </form>
      )}
    </Screen>
  );
}

export function LoginCallback() {
  const { query } = useLocation();
  const [error, setError] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = query.get('token_hash');
    if (!hash || DEMO) {
      setError(true);
      return;
    }
    signInWithTokenHash(hash)
      .then(() => navigate(`/app?ref=${query.get('ref') ?? 'email'}`, { replace: true }))
      .catch(() => setError(true));
  }, [query]);
  if (!error) return <Spinner label="Logging you in" />;
  return (
    <Screen className="center-fill">
      <h1 className="display app-title">This link has expired.</h1>
      <Button onClick={() => navigate('/login', { replace: true })}>Get a new link</Button>
    </Screen>
  );
}
