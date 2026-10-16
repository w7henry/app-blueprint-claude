// Storage that never throws (Safari private mode, blocked storage, quota).
// Funnel data lives in sessionStorage: it survives reloads but not the end of
// the visit, so nothing persists on the device before a purchase.

type Area = 'session' | 'local';

function area(a: Area): Storage | null {
  try {
    return a === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(key: string, fallback: T, a: Area = 'session'): T {
  try {
    const raw = area(a)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, a: Area = 'session'): void {
  try {
    area(a)?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the app keeps working in memory */
  }
}

export function remove(key: string, a: Area = 'session'): void {
  try {
    area(a)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
