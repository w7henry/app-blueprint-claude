// Where did the visitor come from? (?src=tiktok&kw=guide, utm_*)
// Captured on first page view and carried through checkout into Stripe metadata,
// so purchase_completed can be attributed server-side.

import { readJSON, writeJSON } from './storage';

export interface Attribution {
  src: string | null;
  kw: string | null;
  utm: Record<string, string>;
  landing: string;
  referrer: string | null;
  at: string;
}

const KEY = 'attr';
const clip = (s: string | null) => (s ? s.slice(0, 80) : null);

export function captureAttribution(): Attribution {
  const existing = readJSON<Attribution | null>(KEY, null);
  const q = new URLSearchParams(window.location.search);
  const src = q.get('src') ?? q.get('utm_source');
  // Keep the first touch of this visit, unless a new explicit source arrives.
  if (existing && !src) return existing;
  const utm: Record<string, string> = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const v = q.get(k);
    if (v) utm[k] = v.slice(0, 80);
  }
  let referrer: string | null = null;
  try {
    referrer = document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    referrer = null;
  }
  const attr: Attribution = {
    src: clip(src) ?? existing?.src ?? (referrer ? referrer.replace(/^www\./, '') : 'direct'),
    kw: clip(q.get('kw')) ?? existing?.kw ?? null,
    utm,
    landing: window.location.pathname,
    referrer,
    at: new Date().toISOString(),
  };
  writeJSON(KEY, attr);
  return attr;
}

export function getAttribution(): Attribution | null {
  return readJSON<Attribution | null>(KEY, null);
}
