// "Add to Home Screen" on Android/Chrome: keep the browser's event for later,
// so the install hint can be shown after the first workout instead of right away.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let installEvent: InstallEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallEvent;
  });
}

export const getInstallEvent = () => installEvent;
