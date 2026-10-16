// Public cancellation page (§ 312k BGB "Kündigungsbutton"): reachable without
// logging in, from the footer and the terms. Cancels at the end of the paid period.

import { useState, type FormEvent } from 'react';
import { BackButton, Button } from '../components/ui';
import creator from '../creator';
import { api } from '../lib/api';
import { updateDemoSubscription } from '../lib/demo';
import { DEMO } from '../lib/env';

export default function PublicCancel() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setState('busy');
    try {
      if (DEMO) updateDemoSubscription({ cancel_at_period_end: true });
      else await api('/api/cancel-request', { body: { email: email.trim().toLowerCase() } });
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <main className="screen">
      <div className="topnav">
        <BackButton fallback="/" />
      </div>
      <h1 className="display app-title">Cancel membership</h1>
      {state === 'done' ? (
        <>
          <p style={{ marginTop: 16 }}>
            Done. If there is a membership for <strong>{email}</strong>, it is cancelled at the end of the current period. A confirmation is on its way to that
            inbox.
          </p>
          <p className="muted">Questions? {creator.identity.supportEmail}</p>
        </>
      ) : (
        <form onSubmit={submit}>
          <p className="muted" style={{ marginTop: 12 }}>
            Enter the email you used for your membership. You keep access until the end of the period you paid for. You can also cancel in the app under
            Settings.
          </p>
          <label className="field">
            <span className="field-label">Email</span>
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {state === 'error' ? (
            <p className="field-error" role="alert">
              Something went wrong. Please try again or email {creator.identity.supportEmail}.
            </p>
          ) : null}
          <Button type="submit" block busy={state === 'busy'}>
            Cancel now
          </Button>
        </form>
      )}
    </main>
  );
}
