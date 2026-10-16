// Runtime configuration. Without Supabase settings the app runs in demo mode:
// no payments, no emails, data stays on this device. Useful for pitching and local dev.
// VITE_API_URL may stay empty when the backend serves the app (same origin).

const trim = (s: string | undefined) => (s ?? '').trim().replace(/\/$/, '');

export const API_URL = trim(import.meta.env.VITE_API_URL);
export const SUPABASE_URL = trim(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim();

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
