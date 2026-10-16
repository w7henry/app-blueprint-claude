import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CreatorImage } from '../components/CreatorImage';
import { BackButton, Button, ProgressBar } from '../components/ui';
import creator from '../creator';
import { track } from '../lib/analytics';
import { api } from '../lib/api';
import { getAttribution } from '../lib/attribution';
import { DEMO } from '../lib/env';
import { currentPlan, encodeAnswers, getFunnel, updateFunnel, useFunnel } from '../lib/funnel';
import { Link, navigate } from '../router';
import { isComplete } from '../shared/quiz';

type QuestionT = (typeof creator.quiz.questions)[number];
type InterstitialT = (typeof creator.copy.quiz.interstitials)[number];
type QuizScreen = { kind: 'question'; q: QuestionT; n: number } | { kind: 'interstitial'; s: InterstitialT };

const questions = creator.quiz.questions;
const screens: QuizScreen[] = questions.flatMap((q, i) => [
  { kind: 'question' as const, q, n: i + 1 },
  ...creator.copy.quiz.interstitials.filter((s) => s.after === q.id).map((s) => ({ kind: 'interstitial' as const, s })),
]);
const TOTAL = screens.length + 1; // + email

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Index (0-based) of the first screen whose question is still unanswered, or -1. */
function firstOpenScreen(answers: Record<string, string>): number {
  return screens.findIndex((s) => s.kind === 'question' && !answers[s.q.id]);
}

function QuizHeader({ step, backTo }: { step: number; backTo: string }) {
  return (
    <div className="quiz-header">
      <BackButton fallback={backTo} />
      <ProgressBar value={step / TOTAL} label={`Quiz progress: step ${step} of ${TOTAL}`} />
      <span className="quiz-count" aria-hidden>
        {step}/{TOTAL}
      </span>
    </div>
  );
}

function QuestionScreen({ screen, index }: { screen: Extract<QuizScreen, { kind: 'question' }>; index: number }) {
  const funnel = useFunnel();
  const current = funnel.answers[screen.q.id];
  const [picked, setPicked] = useState<string | null>(null);
  const leaving = useRef(false);

  const choose = (optionId: string) => {
    if (leaving.current) return;
    leaving.current = true;
    setPicked(optionId);
    updateFunnel((s) => ({ answers: { ...s.answers, [screen.q.id]: optionId } }));
    track('quiz_answered', { question: screen.q.id, answer: optionId, step: screen.n });
    const isLast = screen.n === questions.length;
    if (isLast && isComplete(creator, getFunnel().answers)) {
      updateFunnel({ completedAt: new Date().toISOString() });
      track('quiz_completed', { program: currentPlan().programId }, { once: 'quiz_completed' });
    }
    const next = index + 1 < screens.length ? `/quiz/${index + 2}` : '/quiz/email';
    setTimeout(() => navigate(next), reducedMotion() ? 0 : 180);
  };

  return (
    <>
      <QuizHeader step={index + 1} backTo={index === 0 ? '/' : `/quiz/${index}`} />
      <div className="quiz-body">
        <h1 className="display quiz-prompt" id={`q-${screen.q.id}`}>
          {screen.q.prompt}
        </h1>
        {screen.q.help ? <p className="muted">{screen.q.help}</p> : null}
        <div className="options" role="radiogroup" aria-labelledby={`q-${screen.q.id}`}>
          {screen.q.options.map((o) => {
            const selected = (picked ?? current) === o.id;
            return (
              <button key={o.id} role="radio" aria-checked={selected} className={`option${selected ? ' is-selected' : ''}`} onClick={() => choose(o.id)}>
                <span className="option-label">{o.label}</span>
                {o.hint ? <span className="option-hint">{o.hint}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function InterstitialScreen({ screen, index }: { screen: Extract<QuizScreen, { kind: 'interstitial' }>; index: number }) {
  const next = index + 1 < screens.length ? `/quiz/${index + 2}` : '/quiz/email';
  return (
    <>
      <QuizHeader step={index + 1} backTo={`/quiz/${index}`} />
      <div className="quiz-body interstitial">
        <CreatorImage source={creator.brand.images.avatar} className="avatar-lg" width={240} height={240} />
        <h1 className="display interstitial-title">{screen.s.title}</h1>
        <p className="interstitial-text">{screen.s.body}</p>
        <p className="signoff">{creator.voice.signOff}</p>
      </div>
      <div className="bottom-bar">
        <Button block onClick={() => navigate(next)}>
          Continue
        </Button>
      </div>
    </>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function EmailScreen() {
  const funnel = useFunnel();
  const [email, setEmail] = useState(funnel.email ?? '');
  const [consent, setConsent] = useState(!!funnel.marketingConsent);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = creator.copy.quiz.email;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    updateFunnel({ email: value, marketingConsent: consent });
    track('email_submitted', { marketing_consent: consent });
    if (!DEMO) {
      // Fire-and-forget: a slow or failing backend never blocks the reveal.
      const plan = currentPlan();
      void api('/api/leads', {
        body: {
          email: value,
          marketingConsent: consent,
          consentText: consent ? copy.marketingConsent : null,
          answers: getFunnel().answers,
          programId: plan.programId,
          daysKey: plan.daysKey,
          resume: encodeAnswers(getFunnel().answers),
          attribution: getAttribution(),
        },
        timeoutMs: 4000,
      }).catch(() => undefined);
    }
    navigate('/plan');
  };

  return (
    <>
      <QuizHeader step={TOTAL} backTo={`/quiz/${screens.length}`} />
      <form className="quiz-body" onSubmit={submit} noValidate>
        <h1 className="display quiz-prompt">{copy.title}</h1>
        <p className="muted">{copy.body}</p>
        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'email-error' : 'email-note'}
            required
          />
        </label>
        {error ? (
          <p id="email-error" className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{copy.marketingConsent}</span>
        </label>
        <p id="email-note" className="muted small">
          {copy.privacyNote} <Link to="/legal/privacy">Privacy policy</Link>
        </p>
        <Button type="submit" block busy={busy} className="btn-lg">
          {copy.button}
        </Button>
      </form>
    </>
  );
}

export default function Quiz({ step }: { step: string }) {
  const funnel = useFunnel();

  // Resolve the current screen; deep links into the middle go to the first open question.
  const open = firstOpenScreen(funnel.answers);
  const requested = step === 'email' ? screens.length : step === 'resume' ? (open === -1 ? screens.length : open) : Number(step) - 1;
  const valid = Number.isInteger(requested) && requested >= 0 && requested <= screens.length;
  const target = !valid ? 0 : open !== -1 && requested > open ? open : requested;

  useEffect(() => {
    if (!valid || target !== requested || step === 'resume') {
      navigate(target >= screens.length ? '/quiz/email' : `/quiz/${target + 1}`, { replace: true });
    }
  }, [valid, target, requested, step]);

  useEffect(() => {
    if (!getFunnel().startedAt) updateFunnel({ startedAt: new Date().toISOString() });
    track('quiz_started', {}, { once: 'quiz_started' });
  }, []);

  if (target !== requested || step === 'resume') return null;

  const screen = screens[target];
  return (
    <main className="screen quiz" key={target}>
      {target === screens.length ? (
        <EmailScreen />
      ) : screen.kind === 'question' ? (
        <QuestionScreen screen={screen} index={target} />
      ) : (
        <InterstitialScreen screen={screen} index={target} />
      )}
    </main>
  );
}
