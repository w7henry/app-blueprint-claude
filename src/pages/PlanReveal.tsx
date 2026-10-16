import { useEffect, useMemo, useState } from 'react';
import { CreatorImage } from '../components/CreatorImage';
import { Icon } from '../components/Icon';
import { BackButton, Button } from '../components/ui';
import creator, { getProgram, t } from '../creator';
import { track } from '../lib/analytics';
import { currentPlan, decodeAnswers, updateFunnel, useFunnel } from '../lib/funnel';
import { navigate, useLocation } from '../router';
import { buildSlots, calendarWeeks, dayName, programWeeks, scheduleShort, sortSchedule } from '../shared/plan';
import { isComplete } from '../shared/quiz';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Building({ onDone }: { onDone: () => void }) {
  const lines = creator.copy.quiz.building;
  const [i, setI] = useState(0);
  useEffect(() => {
    // Max ~2.1 s in total (conversion.md: 2–3 s, no artificial waiting).
    const step = reducedMotion() ? 300 : Math.min(700, 2100 / lines.length);
    const timers = lines.map((_, k) => setTimeout(() => (k + 1 < lines.length ? setI(k + 1) : onDone()), step * (k + 1)));
    return () => timers.forEach(clearTimeout);
  }, [lines, onDone]);
  return (
    <main className="screen building" aria-live="polite">
      <div className="building-ring" aria-hidden />
      <p className="display building-text">{lines[i]}</p>
    </main>
  );
}

export default function PlanReveal() {
  const funnel = useFunnel();
  const { query } = useLocation();
  const [building, setBuilding] = useState(!funnel.revealSeen);

  // "Your plan" email link: /plan?a=<answers>
  useEffect(() => {
    const encoded = query.get('a');
    if (encoded) {
      const answers = decodeAnswers(encoded);
      if (answers) updateFunnel({ answers, completedAt: new Date().toISOString() });
      navigate('/plan', { replace: true });
    }
  }, [query]);

  const complete = isComplete(creator, funnel.answers);
  useEffect(() => {
    if (!complete && !query.get('a')) navigate('/quiz/resume', { replace: true });
  }, [complete, query]);

  const plan = currentPlan(funnel);
  const program = getProgram(plan.programId)!;
  const slots = useMemo(
    () => buildSlots(program, { schedule: plan.schedule, shortSessions: plan.shortSessions }),
    [program, plan.schedule, plan.shortSessions],
  );
  const weekOne = slots.slice(0, plan.schedule.length);
  const days = sortSchedule(plan.schedule);
  const weeks = calendarWeeks(slots, plan.schedule);
  const blockerLine = funnel.answers.blocker ? creator.copy.reveal.blockerLines[funnel.answers.blocker] : undefined;

  useEffect(() => {
    if (!complete || building) return;
    track('plan_revealed', { program: program.id, days: plan.daysKey }, { once: `plan_revealed:${program.id}:${plan.daysKey}` });
  }, [complete, building, program.id, plan.daysKey]);

  if (!complete) return null;
  if (building) {
    return (
      <Building
        onDone={() => {
          updateFunnel({ revealSeen: true });
          setBuilding(false);
        }}
      />
    );
  }

  return (
    <main className="screen reveal">
      <div className="topnav">
        <BackButton fallback="/quiz/resume" />
      </div>
      <p className="eyebrow">{creator.copy.reveal.title}</p>
      <h1 className="display reveal-title">{program.name}</h1>
      <p className="reveal-tagline">{program.tagline}</p>

      <dl className="plan-facts">
        <div>
          <dt>Length</dt>
          <dd>{weeks} weeks</dd>
        </div>
        <div>
          <dt>Rhythm</dt>
          <dd>{plan.schedule.length}× a week</dd>
        </div>
        <div>
          <dt>Days</dt>
          <dd>{scheduleShort(plan.schedule)}</dd>
        </div>
      </dl>
      <p className="muted small">
        <Icon name="home" size={16} /> {program.equipment}
      </p>

      {plan.note || blockerLine ? (
        <figure className="voice-note">
          <CreatorImage source={creator.brand.images.avatar} className="avatar-sm" width={96} height={96} />
          <blockquote>
            {plan.note ? <p>{plan.note}</p> : null}
            {blockerLine ? <p>{blockerLine}</p> : null}
            <footer className="signoff">{creator.voice.signOff}</footer>
          </blockquote>
        </figure>
      ) : null}

      <section aria-labelledby="week1" className="week-one">
        <h2 id="week1" className="label">
          Week 1
        </h2>
        <ol className="week-list">
          {weekOne.map((s, i) => (
            <li key={s.key} className="week-item">
              <span className="week-day">{dayName(days[i % days.length])}</span>
              <span className="week-name">
                <strong>{s.workout.name}</strong>
                <span className="muted small">{s.workout.focus}</span>
              </span>
              <span className="week-min">{s.workout.minutes} min</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="outcomes" className="outcomes">
        <h2 id="outcomes" className="label">
          {t(creator.copy.reveal.outcomesTitle, { weeks: programWeeks(program) })}
        </h2>
        <ul className="ticks">
          {program.outcomes.map((o) => (
            <li key={o}>
              <Icon name="check" size={18} />
              <span>{o}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Everyone’s body responds differently. No results are guaranteed.</p>
      </section>

      <div className="bottom-bar">
        <Button block className="btn-lg" onClick={() => navigate('/join')}>
          {creator.copy.reveal.cta}
        </Button>
      </div>
    </main>
  );
}
