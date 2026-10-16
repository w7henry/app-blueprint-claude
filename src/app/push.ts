// Web push with context (activation.md): only asked after we explain why,
// e.g. "Want me to remind you on Mon, Wed and Fri?". Never on first open.

import { api } from '../lib/api';
import { DEMO, VAPID_PUBLIC_KEY } from '../lib/env';
import { currentToken } from './auth';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Returns the permission result. Subscribes and registers with the backend when granted. */
export async function enablePush(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result !== 'granted' || DEMO || !VAPID_PUBLIC_KEY) return result;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
    await api('/api/push/subscribe', { body: { subscription: sub.toJSON() }, token: currentToken() });
  } catch {
    /* permission granted but subscription failed: email reminders still work */
  }
  return result;
}
