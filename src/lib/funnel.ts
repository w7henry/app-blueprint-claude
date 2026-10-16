// Funnel state (quiz answers, email, chosen plan). Kept in sessionStorage so a
// reload at any step loses nothing, while nothing persists before a purchase.

import { useSyncExternalStore } from 'react';
import creator from '../creator';
import { resolvePlan, sanitizeAnswers, type PlanChoice, type QuizAnswers } from '../shared/quiz';
import { readJSON, remove, writeJSON } from './storage';

export interface FunnelState {
  answers: QuizAnswers;
  startedAt?: string;
  completedAt?: string;
  email?: string;
  marketingConsent?: boolean;
  revealSeen?: boolean;
  selectedPlan?: string;
}

const KEY = `funnel:${creator.identity.slug}`;
const listeners = new Set<() => void>();
let state: FunnelState = readJSON<FunnelState>(KEY, { answers: {} });
state = { ...state, answers: sanitizeAnswers(creator, state.answers ?? {}) };

export function getFunnel(): FunnelState {
  return state;
}

export function updateFunnel(patch: Partial<FunnelState> | ((s: FunnelState) => Partial<FunnelState>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  writeJSON(KEY, state);
  listeners.forEach((l) => l());
}

export function resetFunnel(): void {
  state = { answers: {} };
  remove(KEY);
  listeners.forEach((l) => l());
}

export function useFunnel(): FunnelState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function currentPlan(s: FunnelState = state): PlanChoice {
  return resolvePlan(creator, s.answers);
}

// Answers travel in the "your plan" email link so she can come back on any device.
export function encodeAnswers(a: QuizAnswers): string {
  return btoa(JSON.stringify(a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeAnswers(s: string): QuizAnswers | null {
  try {
    const json = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizeAnswers(creator, parsed as QuizAnswers);
  } catch {
    return null;
  }
}
