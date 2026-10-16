// Program finished: start vs. end, a shareable card and the next program in one tap.

import { useEffect, useMemo } from 'react';
import { Icon } from '../../components/Icon';
import { Button, Screen } from '../../components/ui';
import creator, { getProgram, t } from '../../creator';
import { track } from '../../lib/analytics';
import { navigate } from '../../router';
import type { SubscriptionRow } from '../../shared/access';
import { formatMoney, perMonth } from '../../shared/format';
import { membershipAction } from '../billing';
import { shareProgress } from '../shareCard';
import { setProfile } from '../store';
import { usePlan } from '../usePlan';
import { liftSeries } from './Progress';

export default function ProgramComplete({ rows }: { rows: SubscriptionRow[] }) {
  const plan = usePlan()!;
  const { program, profile } = plan;
  const runIds = new Set(plan.runSessions.map((s) => s.id));
  const series = useMemo(
    () =>
      liftSeries(
        plan.data.sets.filter((s) => runIds.has(s.sessionId)),
        profile.unit,
      ),
    [plan.data.sets, profile.unit],
  );
  const next = getProgram(program.next);
  const others = creator.programs.filter((p) => p.id !== next?.id);
  const monthly = rows.find((r) => r.kind === 'subscription' && r.plan_id === 'monthly' && !r.cancel_at_period_end);
  const annual = creator.offer.plans.find((p) => p.id === 'annual');
  const finished = !plan.next;

  useEffect(() => {
    if (!finished) {
      navigate('/app', { replace: true });
      return;
    }
    track(
      'program_completed',
      { program: program.id, workouts: plan.runSessions.length },
      { once: `program_completed:${program.id}:${profile.programStartedAt}` },
    );
  }, [finished, program.id, profile.programStartedAt, plan.runSessions.length]);

  if (!finished) return null;

  const start = (id: string) => {
    setProfile({ programId: id, programStartedAt: new Date().toISOString(), completedPrograms: [...profile.completedPrograms, program.id] });
    track('next_program_started', { program: id, previous: program.id });
    navigate('/app', { replace: true });
  };

  const best = series.find((s) => s.weighted && s.points.length > 1);

  return (
    <Screen>
      <div className="done-hero">
        <p className="eyebrow">{plan.runSessions.length} workouts</p>
        <h1 className="display done-title">{t(creator.copy.templates.programDone, { program: program.name })}</h1>
      </div>

      {series.length ? (
        <section style={{ marginTop: 20 }}>
          <h2 className="label">Start → now</h2>
          <ul className="pr-list">
            {series.slice(0, 5).map((s) => (
              <li key={s.exerciseId}>
                <span>{s.name}</span>
                <strong>
                  {s.points[0].label} → {s.points[s.points.length - 1].label}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button
        variant="secondary"
        block
        style={{ marginTop: 20 }}
        onClick={() =>
          void shareProgress(
            best
              ? {
                  eyebrow: `${program.shortName} complete`,
                  headline: best.name,
                  big: `${best.points[0].label} → ${best.points[best.points.length - 1].label}`,
                  sub: `${plan.runSessions.length} workouts. ${program.name}.`,
                }
              : { eyebrow: 'Program complete', headline: program.name, big: `${plan.runSessions.length} workouts`, sub: `With ${creator.identity.name}` },
            'program',
          )
        }
      >
        <Icon name="share" size={18} /> Share my results
      </Button>

      {monthly && annual ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="eyebrow">Keep going for less</p>
          <p style={{ margin: '6px 0 12px' }}>Switch to yearly: {formatMoney(perMonth(annual.priceCents), creator.offer.currency)}/month.</p>
          <Button variant="secondary" block onClick={() => void membershipAction('upgrade')}>
            Switch to yearly
          </Button>
        </div>
      ) : null}

      {others.length ? (
        <section style={{ marginTop: 20 }}>
          <h2 className="label">Or pick another program</h2>
          <div className="swap-list">
            {others.map((p) => (
              <button key={p.id} onClick={() => start(p.id)}>
                {p.name} <span className="muted">· {p.tagline}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="bottom-bar">
        {next ? (
          <Button block className="btn-lg" onClick={() => start(next.id)}>
            {next.id === program.id ? `Run ${next.shortName} again, heavier` : `Start ${next.name}`}
          </Button>
        ) : null}
      </div>
    </Screen>
  );
}
