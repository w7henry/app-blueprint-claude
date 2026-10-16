// Visible progress: weekly streak, main lifts over time, personal bests,
// weekly recap and a shareable card. Strength and habit — never body weight.

import { useEffect, useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { Button, ProgressBar } from '../../components/ui';
import creator, { t } from '../../creator';
import { track } from '../../lib/analytics';
import { startOfWeek } from '../../shared/plan';
import { bestSet } from '../../shared/progression';
import { weekStreak } from '../../shared/streak';
import type { SetLog } from '../../shared/types';
import { displayWeight, formatWeight, type Unit } from '../../shared/units';
import { shareProgress } from '../shareCard';
import { exercise, usePlan } from '../usePlan';

interface Series {
  exerciseId: string;
  name: string;
  weighted: boolean;
  points: { at: string; value: number; label: string }[];
}

/** One point per session: the best set (heaviest weight, or most reps for bodyweight). */
export function liftSeries(sets: SetLog[], unit: Unit): Series[] {
  const byExercise = new Map<string, Map<string, SetLog[]>>();
  for (const s of sets) {
    if (!s.completed || s.reps === null) continue;
    const ex = exercise(s.exerciseId);
    if (!ex?.main) continue;
    const sessions = byExercise.get(s.exerciseId) ?? new Map<string, SetLog[]>();
    sessions.set(s.sessionId, [...(sessions.get(s.sessionId) ?? []), s]);
    byExercise.set(s.exerciseId, sessions);
  }
  const out: Series[] = [];
  for (const [exerciseId, sessions] of byExercise) {
    const ex = exercise(exerciseId);
    const weighted = ex.load === 'weighted';
    const points = [...sessions.values()]
      .map((ss) => {
        const at = ss.reduce((a, b) => (a.loggedAt < b.loggedAt ? a : b)).loggedAt;
        if (weighted) {
          const w = Math.max(...ss.map((x) => x.weightKg ?? 0));
          if (!w) return null;
          const v = displayWeight(w, unit);
          return { at, value: v, label: formatWeight(v, unit) };
        }
        const r = Math.max(...ss.map((x) => x.reps ?? 0));
        return { at, value: r, label: `${r} ${ex.measure === 'seconds' ? 'sec' : 'reps'}` };
      })
      .filter((p): p is NonNullable<typeof p> => !!p)
      .sort((a, b) => a.at.localeCompare(b.at));
    if (points.length) out.push({ exerciseId, name: ex.name, weighted, points });
  }
  return out.sort((a, b) => b.points.length - a.points.length);
}

function Chart({ s }: { s: Series }) {
  const W = 300;
  const H = 110;
  const vals = s.points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => (s.points.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (s.points.length - 1));
  const y = (v: number) => H - 22 - ((v - min) / span) * (H - 40);
  const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.name}: from ${first.label} to ${last.label} over ${s.points.length} sessions`}>
      <line className="grid" x1="0" x2={W} y1={H - 14} y2={H - 14} />
      <path className="line" d={d} />
      {s.points.map((p, i) => (
        <circle key={p.at} className="dot" cx={x(i)} cy={y(p.value)} r={i === s.points.length - 1 ? 4.5 : 3} />
      ))}
      <text x="0" y={H}>
        {first.label}
      </text>
      <text x={W} y={H} textAnchor="end">
        {last.label}
      </text>
    </svg>
  );
}

export default function Progress() {
  const plan = usePlan()!;
  const unit = plan.profile.unit;
  const now = new Date();

  useEffect(() => {
    track('progress_viewed', {}, { once: 'progress_viewed' });
  }, []);

  const completedDates = plan.allCompleted.map((s) => new Date(s.completedAt!));
  const goal = plan.profile.schedule.length;
  const weekStart = startOfWeek(now);
  const doneThisWeek = completedDates.filter((d) => d >= weekStart).length;
  const streak = weekStreak(completedDates, goal, now);
  const series = useMemo(() => liftSeries(plan.data.sets, unit), [plan.data.sets, unit]);

  // Weekly recap highlight: biggest gain on a main lift this week vs. before.
  const highlight = useMemo(() => {
    let best: { name: string; gain: number } | null = null;
    for (const s of series) {
      if (!s.weighted) continue;
      const before = s.points.filter((p) => new Date(p.at) < weekStart);
      const thisWeek = s.points.filter((p) => new Date(p.at) >= weekStart);
      if (!before.length || !thisWeek.length) continue;
      const gain = Math.max(...thisWeek.map((p) => p.value)) - Math.max(...before.map((p) => p.value));
      if (gain > 0 && (!best || gain > best.gain)) best = { name: s.name.toLowerCase(), gain };
    }
    return best ? `, ${best.name} +${formatWeight(best.gain, unit)}` : '';
  }, [series, weekStart, unit]);

  const bests = useMemo(() => {
    const ids = [...new Set(plan.data.sets.filter((s) => s.completed).map((s) => s.exerciseId))];
    return ids
      .map((id) => ({
        id,
        best: bestSet(
          plan.data.sets.filter((s) => s.exerciseId === id),
          exercise(id)?.load === 'weighted',
        ),
      }))
      .filter((b) => b.best && exercise(b.id)?.main)
      .slice(0, 8);
  }, [plan.data.sets]);

  const done = plan.runSessions.length;
  const top = series.find((s) => s.weighted && s.points.length > 1);

  const share = () =>
    void shareProgress(
      top
        ? {
            eyebrow: `${plan.program.shortName} · week ${plan.next?.programWeek ?? 'done'}`,
            headline: top.name,
            big: `${top.points[0].label} → ${top.points[top.points.length - 1].label}`,
            sub: `${plan.allCompleted.length} workouts with ${creator.identity.firstName}’s ${creator.identity.appName}`,
          }
        : {
            eyebrow: plan.program.shortName,
            headline: 'Workouts done',
            big: String(plan.allCompleted.length),
            sub: `Training with ${creator.identity.firstName}’s ${creator.identity.appName}`,
          },
      top ? 'lift' : 'count',
    );

  return (
    <main className="app-main">
      <header className="app-header">
        <p className="eyebrow">{plan.program.name}</p>
        <h1 className="display app-title">Progress</h1>
      </header>

      <div className="stat-grid">
        <div className="stat">
          <strong>{streak}</strong>
          <span>week streak</span>
        </div>
        <div className="stat">
          <strong>
            {doneThisWeek}/{goal}
          </strong>
          <span>this week</span>
        </div>
        <div className="stat">
          <strong>{plan.allCompleted.length}</strong>
          <span>workouts</span>
        </div>
      </div>

      <p>{t(creator.copy.templates.weeklySummary, { done: doneThisWeek, goal, highlight })}</p>

      <div className="program-bar">
        <p className="muted small" style={{ marginBottom: 6 }}>
          {done} of {plan.slots.length} workouts in {plan.program.shortName}
        </p>
        <ProgressBar value={done / plan.slots.length} label="Program progress" />
      </div>

      {series.length === 0 ? (
        <p className="card" style={{ marginTop: 20 }}>
          {creator.copy.templates.emptyProgress}
        </p>
      ) : (
        <section style={{ marginTop: 24 }}>
          <h2 className="label">Main lifts</h2>
          {series.slice(0, 6).map((s) => (
            <div key={s.exerciseId} className="card chart-card">
              <h3>{s.name}</h3>
              <p className="muted small">
                {s.points.length} session{s.points.length === 1 ? '' : 's'}
              </p>
              {s.points.length > 1 ? (
                <Chart s={s} />
              ) : (
                <p style={{ marginTop: 8 }}>
                  Starting point: <strong>{s.points[0].label}</strong>. Your graph builds from the next session.
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {bests.length ? (
        <section style={{ marginTop: 24 }}>
          <h2 className="label">Personal bests</h2>
          <ul className="pr-list">
            {bests.map(({ id, best }) => (
              <li key={id}>
                <span>{exercise(id).name}</span>
                <strong>
                  {best!.weightKg !== null ? `${formatWeight(displayWeight(best!.weightKg, unit), unit)} × ` : ''}
                  {best!.reps}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan.allCompleted.length ? (
        <Button variant="secondary" block onClick={share} style={{ marginTop: 24 }}>
          <Icon name="share" size={18} /> Share my progress
        </Button>
      ) : null}
    </main>
  );
}
