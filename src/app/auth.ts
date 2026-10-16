// Auth state. Pay first, account after: login is passwordless (magic link /
// one-time token from the checkout) — see server/routes/auth.ts.

import { useSyncExternalStore } from 'react';
import { setAnalyticsAuth } from '../lib/analytics';
import { demoSubscription } from '../lib/demo';
import { DEMO } from '../lib/env';
import { supabase } from './supabase';

export type AuthState =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; userId: string; email: string | null; token: string | null; demo: boolean };

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();
let started = false;

function set(next: AuthState) {
  state = next;
  setAnalyticsAuth(next.status === 'signed-in' ? next.token : null);
  listeners.forEach((l) => l());
}

export function getAuth(): AuthState {
  return state;
}

export function useAuth(): AuthState {
  if (!started) initAuth();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function initAuth(): void {
  if (started) return;
  started = true;
  if (DEMO) {
    refreshDemoAuth();
    return;
  }
  const sb = supabase();
  void sb.auth.getSession().then(({ data }) => {
    const s = data.session;
    set(s ? { status: 'signed-in', userId: s.user.id, email: s.user.email ?? null, token: s.access_token, demo: false } : { status: 'signed-out' });
  });
  sb.auth.onAuthStateChange((_event, s) => {
    set(s ? { status: 'signed-in', userId: s.user.id, email: s.user.email ?? null, token: s.access_token, demo: false } : { status: 'signed-out' });
  });
}

/** Demo mode: "signed in" once a simulated purchase exists on this device. */
export function refreshDemoAuth(): void {
  const signedIn = !!demoSubscription();
  if (signedIn && state.status === 'signed-in') return;
  if (!signedIn && state.status === 'signed-out') return;
  set(signedIn ? { status: 'signed-in', userId: 'demo', email: null, token: null, demo: true } : { status: 'signed-out' });
}

export async function signInWithTokenHash(tokenHash: string): Promise<void> {
  const { error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (DEMO) {
    set({ status: 'signed-out' });
    return;
  }
  await supabase().auth.signOut();
}

export function currentToken(): string | null {
  return state.status === 'signed-in' ? state.token : null;
}
