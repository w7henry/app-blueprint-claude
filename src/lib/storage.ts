// Storage that never throws (Safari private mode, blocked storage, quota).
// Funnel data lives in sessionStorage: it survives reloads but not the end of
// the visit, so nothing persists on the device before a purchase.
// When the browser blocks storage (private mode, sandboxed previews), values
// live in memory for the current page instead.

type Area = 'session' | 'local';

const memory: Record<Area, Map<string, string>> = { session: new Map(), local: new Map() };

function area(a: Area): Storage | null {
  try {
    return a === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function getRaw(key: string, a: Area): string | null {
  try {
    const s = area(a);
    if (s) return s.getItem(key);
  } catch {
    /* blocked → memory */
  }
  return memory[a].get(key) ?? null;
}

export function readJSON<T>(key: string, fallback: T, a: Area = 'session'): T {
  try {
    const raw = getRaw(key, a);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, a: Area = 'session'): void {
  const raw = JSON.stringify(value);
  try {
    const s = area(a);
    if (s) {
      s.setItem(key, raw);
      return;
    }
  } catch {
    /* storage full or blocked — keep working in memory */
  }
  memory[a].set(key, raw);
}

export function remove(key: string, a: Area = 'session'): void {
  memory[a].delete(key);
  try {
    area(a)?.removeItem(key);
  } catch {
    /* ignore */
  }
}
