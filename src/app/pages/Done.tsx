// Workout finished: duration, sets, personal bests, what's next.
// After the very first workout: a concrete starting number (activation.md).

import { useEffect } from 'react';
import { Button } from '../../components/ui';
import creator, { t } from '../../creator';
import { navigate, useLocation } from '../../router';
import { dayName, nextTrainingDate, weekdayOf } from '../../shared/plan';
import { bestSet, findPRs } from '../../shared/progression';
import { displayWeight, formatWeight } from '../../shared/units';
import { getData } from '../store';
import { exercise, usePlan } from '../usePlan';

export default function Done() {
  const { query } = useLocation();
  const plan = usePlan()!;
  const sid = query.get('s');
  const session = plan.data.sessions.find((s) => s.id === sid && s.status === 'completed');

  useEffect(() => {
    if (!session) navigate('/app', { replace: true });
  }, [session]);
  if (!session) return null;

  const unit = plan.profile.unit;
  const count = plan.allCompleted.findIndex((s) => s.id === session.id) + 1;
  const first = count === 1;
  const sets = plan.data.sets.filter((s) => s.sessionId === session.id && s.completed);
  const earlier = plan.data.sets.filter((s) => s.completed && s.sessionId !== session.id && s.loggedAt < session.startedAt);
  const prs = findPRs(sets, earlier, (id) => exercise(id)?.load === 'weighted');

  // The starting number: best set of the first main lift (or any lift with values).
  const withValues = sets.filter((s) => s.reps !== null);
  const firstLift = withValues.find((s) => exercise(s.exerciseId)?.main && s.weightKg !== null) ?? withValues.find((s) => s.weightKg !== null) ?? withValues[0];
  const best = firstLift
    ? bestSet(
        withValues.filter((s) => s.exerciseId === firstLift.exerciseId),
        firstLift.weightKg !== null,
      )
    : null;
  const pick = best ? { exerciseId: best.exerciseId, weightKg: best.weightKg, reps: best.reps } : undefined;
  const starting = pick
    ? t(creator.copy.templates.firstWorkoutDone, {
        exercise: exercise(pick.exerciseId).name,
        weight: pick.weightKg !== null ? formatWeight(displayWeight(pick.weightKg, unit), unit) : 'bodyweight',
        reps: `${pick.reps}${exercise(pick.exerciseId).measure === 'seconds' ? ' sec' : ''}`,
      })
    : null;

  const nextDay = nextTrainingDate(new Date(), plan.profile.schedule);
  const minutes = Math.max(1, Math.round((session.durationSec ?? 0) / 60));

  const onContinue = () => {
    const p = getData().profile!;
    if (first && !p.remindersAsked) navigate('/app/reminders?next=/app/install', { replace: true });
    else if (first && !p.installShown) navigate('/app/install', { replace: true });
    else if (!plan.next) navigate('/app/complete', { replace: true });
    else navigate('/app', { replace: true });
  };

  return (
    <main className="screen">
      <div className="done-hero">
        <p className="eyebrow">{session.workoutName}</p>
        <h1 className="display done-title">{first ? 'First workout done.' : t(creator.copy.templates.workoutDone, { count })}</h1>
        {first && starting ? <p className="big-number">{starting}</p> : null}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <strong>{minutes}</strong>
          <span>minutes</span>
        </div>
        <div className="stat">
          <strong>{sets.length}</strong>
          <span>sets</span>
        </div>
        <div className="stat">
          <strong>{prs.length}</strong>
          <span>new bests</span>
        </div>
      </div>

      {prs.length ? (
        <section>
          <h2 className="label">New personal bests</h2>
          <ul className="pr-list">
            {prs.map((p) => (
              <li key={p.exerciseId}>
                <span>{exercise(p.exerciseId).name}</span>
                <strong>
                  {p.weightKg !== null ? `${formatWeight(displayWeight(p.weightKg, unit), unit)} × ` : ''}
                  {p.reps}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan.next ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="eyebrow">Next up</p>
          <h2 style={{ fontSize: 20, margin: '4px 0' }}>{plan.next.workout.name}</h2>
          <p className="muted">
            {dayName(weekdayOf(nextDay), true)} · ~{plan.next.workout.minutes} min
          </p>
        </div>
      ) : null}

      <div className="bottom-bar">
        <Button block className="btn-lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </main>
  );
}
