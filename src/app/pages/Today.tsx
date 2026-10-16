// Home: exactly one main action — today's workout (workout.md).

import { useMemo } from 'react';
import { CreatorImage } from '../../components/CreatorImage';
import { Button } from '../../components/ui';
import creator, { getProgram, t } from '../../creator';
import { navigate } from '../../router';
import type { Access, SubscriptionRow } from '../../shared/access';
import { formatDate, formatMoney, perMonth } from '../../shared/format';
import { addDays, dayName, isTrainingDay, nextTrainingDate, startOfDay, startOfWeek, weekdayOf } from '../../shared/plan';
import { weekStreak } from '../../shared/streak';
import { beginWorkout } from '../actions';
import { usePlan } from '../usePlan';

const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function creatorNote(now: Date) {
  const monday = startOfWeek(now).toISOString().slice(0, 10);
  const past = creator.messages.filter((m) => m.week <= monday).sort((a, b) => b.week.localeCompare(a.week));
  return past[0] ?? creator.messages[0] ?? null;
}

export default function Today({ access, rows }: { access: Access; rows: SubscriptionRow[] }) {
  const plan = usePlan()!;
  const now = new Date();
  const { profile, program, next, runSessions, allCompleted, slots } = plan;
  const active = plan.data.active;

  const completedDates = useMemo(() => allCompleted.map((s) => new Date(s.completedAt!)), [allCompleted]);
  const weekStart = startOfWeek(now);
  const doneThisWeek = completedDates.filter((d) => d >= weekStart).length;
  const goal = profile.schedule.length;
  const streak = weekStreak(completedDates, goal, now);
  const doneToday = completedDates.some((d) => startOfDay(d).getTime() === startOfDay(now).getTime());
  const trainingDay = isTrainingDay(now, profile.schedule);

  // Missed a scheduled day since the last workout? → "Pick up where you left off", never "missed".
  const last = allCompleted[allCompleted.length - 1];
  const since = startOfDay(last ? new Date(last.completedAt!) : new Date(profile.programStartedAt));
  let missed = false;
  for (let d = addDays(since, 1); d < startOfDay(now); d = addDays(d, 1)) if (isTrainingDay(d, profile.schedule)) missed = true;

  const note = creatorNote(now);
  const nextProgram = getProgram(program.next);
  const lastWeek = next && slots.length - runSessions.length <= goal;

  const monthly = rows.find((r) => r.kind === 'subscription' && r.plan_id === 'monthly' && access.hasAccess);
  const annual = creator.offer.plans.find((p) => p.id === 'annual');
  const monthlyPlan = creator.offer.plans.find((p) => p.id === 'monthly');
  const memberDays = (now.getTime() - new Date(profile.programStartedAt).getTime()) / 864e5;
  const showUpsell = monthly && annual && monthlyPlan && memberDays >= creator.offer.upsell.monthlyToAnnualAfterDays;

  const start = () => {
    if (beginWorkout()) navigate('/app/workout');
  };

  let card;
  if (active) {
    card = (
      <div className="workout-card">
        <p className="eyebrow">In progress</p>
        <h2 className="display">{slots.find((s) => s.key === active.slotKey)?.workout.name ?? 'Your workout'}</h2>
        <p className="workout-meta">Started {formatDate(active.startedAt, { hour: 'numeric', minute: '2-digit' })}</p>
        <Button block className="btn-lg" onClick={() => navigate('/app/workout')}>
          Continue workout
        </Button>
      </div>
    );
  } else if (!next) {
    card = (
      <div className="workout-card">
        <p className="eyebrow">Program complete</p>
        <h2 className="display">{t(creator.copy.templates.programDone, { program: program.name })}</h2>
        <Button block className="btn-lg" onClick={() => navigate('/app/complete')}>
          See your results
        </Button>
      </div>
    );
  } else {
    const nextDay = nextTrainingDate(now, profile.schedule);
    const headline = doneToday ? 'Done for today.' : trainingDay || missed ? next.workout.name : 'Rest day';
    card = (
      <div className="workout-card">
        <p className="eyebrow">
          Week {next.programWeek} · {next.phase.name}
        </p>
        <h2 className="display">{headline}</h2>
        {doneToday ? (
          <p className="workout-meta">
            Next: {next.workout.name}, {dayName(weekdayOf(nextDay), true)}.
          </p>
        ) : trainingDay || missed ? (
          <>
            {missed ? <p style={{ marginBottom: 8 }}>{t(creator.copy.templates.pickUp, { workout: next.workout.name })}</p> : null}
            <p className="workout-meta">
              <span>{next.workout.focus}</span>
              <span>~{next.workout.minutes} min</span>
              <span>{next.workout.exercises.length} exercises</span>
            </p>
            <Button block className="btn-lg" onClick={start}>
              Start workout
            </Button>
          </>
        ) : (
          <>
            <p style={{ marginBottom: 6 }}>{creator.copy.templates.restDay}</p>
            <p className="workout-meta">
              Next: {next.workout.name}, {dayName(weekdayOf(nextDay), true)}
            </p>
            <Button variant="secondary" block onClick={start}>
              Train anyway
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <main className="app-main">
      <header className="app-header">
        <p className="eyebrow">
          {greeting(now)} · {formatDate(now, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <h1 className="display app-title">{program.shortName}</h1>
      </header>

      <div className="week-strip" aria-label={`This week: ${doneThisWeek} of ${goal} workouts done`}>
        {WEEK.map((d, i) => {
          const date = addDays(weekStart, i);
          const done = completedDates.some((c) => startOfDay(c).getTime() === date.getTime());
          const isToday = date.getTime() === startOfDay(now).getTime();
          const training = profile.schedule.includes(d);
          return (
            <div key={d} className={`day-dot${training ? ' is-training' : ''}${done ? ' is-done' : ''}${isToday ? ' is-today' : ''}`}>
              <span>{dayName(d).slice(0, 1)}</span>
              <i aria-hidden>{done ? '✓' : date.getDate()}</i>
            </div>
          );
        })}
      </div>
      <p className="muted small">
        {doneThisWeek}/{goal} this week{streak > 1 ? ` · ${streak}-week streak` : ''}
      </p>

      {card}

      {lastWeek && nextProgram ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="eyebrow">Coming up next</p>
          <h3 style={{ fontSize: 19, margin: '4px 0' }}>{nextProgram.name}</h3>
          <p className="muted small">{nextProgram.tagline}</p>
        </div>
      ) : null}

      {note ? (
        <div className="note-card">
          <CreatorImage source={creator.brand.images.avatar} className="avatar-sm" width={96} height={96} />
          <div>
            <h3>{note.title}</h3>
            <p>{note.body}</p>
            <p className="signoff" style={{ fontSize: 17, marginTop: 6 }}>
              {creator.voice.signOff}
            </p>
          </div>
        </div>
      ) : null}

      {showUpsell ? (
        <div className="card upsell">
          <p className="eyebrow">Save with yearly</p>
          <p style={{ margin: '6px 0 12px' }}>
            Yearly is {formatMoney(perMonth(annual.priceCents), creator.offer.currency)}/month instead of{' '}
            {formatMoney(monthlyPlan.priceCents, creator.offer.currency)}.
          </p>
          <Button variant="secondary" block onClick={() => navigate('/app/settings#membership')}>
            See yearly
          </Button>
        </div>
      ) : null}
    </main>
  );
}
