// A tiny History API router. The app has ~15 routes; a router library would
// cost more bytes on the landing page than this whole file.
// VITE_ROUTER=memory keeps the route in memory instead of the URL — used for
// the single-file preview (npm run preview:file), where there is no server.

import { useMemo, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

const MEMORY = import.meta.env.VITE_ROUTER === 'memory';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let depth = 0; // in-app navigations since load, used for "back"
const stack: string[] = [MEMORY && typeof window !== 'undefined' ? window.location.hash.slice(1) || '/' : '/'];

if (typeof window !== 'undefined' && !MEMORY) {
  window.addEventListener('popstate', () => {
    depth = Math.max(0, depth - 1);
    notify();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const snapshot = () => (MEMORY ? stack[stack.length - 1] : window.location.pathname + window.location.search);

export function useLocation(): { path: string; query: URLSearchParams } {
  const href = useSyncExternalStore(subscribe, snapshot, () => '/');
  // Stable objects per URL, so they can be used as effect dependencies.
  return useMemo(() => {
    const [path, search = ''] = href.split('?');
    return { path, query: new URLSearchParams(search) };
  }, [href]);
}

export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}): void {
  if (to === snapshot()) return;
  if (MEMORY) {
    if (opts.replace) stack[stack.length - 1] = to;
    else stack.push(to);
  } else if (opts.replace) window.history.replaceState(null, '', to);
  else {
    window.history.pushState(null, '', to);
    depth++;
  }
  notify();
  if (!opts.keepScroll) window.scrollTo(0, 0);
}

/** Go back inside the app, or to `fallback` when the visit started on this page. */
export function back(fallback: string): void {
  if (MEMORY && stack.length > 1) {
    stack.pop();
    notify();
  } else if (!MEMORY && depth > 0) window.history.back();
  else navigate(fallback, { replace: true });
}

export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}
