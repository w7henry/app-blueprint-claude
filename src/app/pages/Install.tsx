// "Add to Home Screen" hint — only after the first workout (activation.md).

import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Button, Screen } from '../../components/ui';
import creator from '../../creator';
import { track } from '../../lib/analytics';
import { navigate } from '../../router';
import { getInstallEvent } from '../installPrompt';
import { setProfile } from '../store';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function Install() {
  const [ios] = useState(isIOS);
  const prompt = getInstallEvent();

  useEffect(() => {
    if (isStandalone()) {
      setProfile({ installShown: true });
      navigate('/app', { replace: true });
      return;
    }
    track('install_prompt_shown', { platform: ios ? 'ios' : prompt ? 'android' : 'other' }, { once: 'install_prompt_shown' });
  }, [ios, prompt]);

  const done = () => {
    setProfile({ installShown: true });
    navigate('/app', { replace: true });
  };

  const install = async () => {
    if (!prompt) return done();
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') track('install_accepted', { platform: 'android' });
    done();
  };

  return (
    <Screen>
      <div className="done-hero">
        <p className="eyebrow">One more thing</p>
        <h1 className="display done-title">Put {creator.identity.appName} on your home screen.</h1>
        <p className="muted">It opens like an app, works without signal at the gym and keeps you logged in.</p>
        {ios ? (
          <ol className="cues" style={{ marginTop: 20 }}>
            <li>
              Tap <Icon name="share" size={18} /> <strong>Share</strong> at the bottom of Safari
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>
            </li>
            <li>
              Tap <strong>Add</strong>
            </li>
          </ol>
        ) : !prompt ? (
          <p style={{ marginTop: 20 }}>Open your browser menu and choose “Install app” or “Add to Home Screen”.</p>
        ) : null}
      </div>
      <div className="bottom-bar">
        <Button block className="btn-lg" onClick={prompt ? install : done}>
          {prompt ? 'Add to Home Screen' : 'Got it'}
        </Button>
        {prompt ? (
          <Button variant="ghost" block onClick={done}>
            Maybe later
          </Button>
        ) : null}
      </div>
    </Screen>
  );
}
