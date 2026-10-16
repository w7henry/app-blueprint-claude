// Workout player: one exercise per screen, big steppers, auto rest timer,
// swap from data, logging optional, works offline, one-handed (main action
// always in the thumb zone at the bottom).

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import creator from '../../creator';
import { track } from '../../lib/analytics';
import { uuid } from '../../lib/ids';
import { navigate } from '../../router';
import type { Exercise, Prescription } from '../../../creators/schema';
import { lastPerformance, suggestNext, type Suggestion } from '../../shared/progression';
import { clean, toKg, type Unit } from '../../shared/units';
import { abandonWorkout, completeWorkout } from '../actions';
import { updateActive, upsertSet, type DraftSet } from '../store';
import { exercise, usePlan } from '../usePlan';

/** Ticks while a rest timer runs; restarts (fresh "now") whenever the end time changes. */
function useNow(endsAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [endsAt]);
  return now;
}

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not supported or denied — the workout still works */
      }
    };
    void request();
    const onVis = () => void request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function initialDrafts(rx: Prescription, s: Suggestion): DraftSet[] {
  return Array.from({ length: rx.sets }, (_, i) => ({ weight: s.weight, reps: s.reps[i] ?? rx.reps[1], done: false, logId: null }));
}

function Stepper(props: { label: string; value: number | null; unit: string; step: number; start: number; max: number; onChange: (v: number) => void }) {
  const { label, value, unit, step, start, max, onChange } = props;
  const set = (v: number) => onChange(clean(Math.max(0, Math.min(max, v))));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Less ${label}`} onClick={() => set((value ?? start) - step)}>
        <Icon name="minus" size={24} />
      </button>
      <div className="stepper-value" aria-live="polite">
        <strong>{value ?? '–'}</strong>
        <span>{unit}</span>
      </div>
      <button type="button" aria-label={`More ${label}`} onClick={() => set(value === null ? start : value + step)}>
        <Icon name="plus" size={24} />
      </button>
    </div>
  );
}

function SetRow(props: {
  i: number;
  draft: DraftSet;
  rx: Prescription;
  ex: Exercise;
  unit: Unit;
  open: boolean;
  isNext: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<DraftSet>) => void;
  onUndo: () => void;
}) {
  const { i, draft, rx, ex, unit, open, isNext, onToggle, onChange, onUndo } = props;
  const weighted = ex.load === 'weighted';
  const measure = ex.measure === 'seconds' ? 'sec' : 'reps';
  const summary = draft.done
    ? `${weighted && draft.weight !== null ? `${draft.weight} ${unit} × ` : ''}${draft.reps ?? '–'} ${measure}`
    : `Target ${rx.reps[0]}–${rx.reps[1]} ${measure}${weighted && draft.weight !== null ? ` · ${draft.weight} ${unit}` : ''}`;
  return (
    <li className={`set${draft.done ? ' is-done' : ''}${open ? ' is-active' : ''}`}>
      <button type="button" className="set-summary" onClick={onToggle} aria-expanded={open}>
        <span>
          <strong>Set {i + 1}</strong> <span className="muted">{summary}</span>
        </span>
        <span className="set-check" aria-label={draft.done ? 'Done' : isNext ? 'Up next' : 'Not done'}>
          {draft.done ? <Icon name="check" /> : null}
        </span>
      </button>
      {open ? (
        <div className={`set-edit${weighted ? '' : ' is-single'}`}>
          {weighted ? (
            <Stepper
              label="weight"
              value={draft.weight}
              unit={unit}
              step={ex.increment[unit]}
              start={ex.startWeight?.[unit] ?? ex.increment[unit]}
              max={1000}
              onChange={(v) => onChange({ weight: v })}
            />
          ) : null}
          <Stepper
            label={measure}
            value={draft.reps}
            unit={measure}
            step={ex.measure === 'seconds' ? 5 : 1}
            start={rx.reps[1]}
            max={ex.measure === 'seconds' ? 600 : 100}
            onChange={(v) => onChange({ reps: v })}
          />
          {draft.done ? (
            <Button variant="ghost" type="button" onClick={onUndo} style={{ gridColumn: '1 / -1' }}>
              Mark as not done
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function Player() {
  const plan = usePlan();
  useWakeLock();
  const active = plan?.data.active ?? null;
  const slot = plan && active ? plan.slots.find((s) => s.key === active.slotKey) : undefined;
  const [openSet, setOpenSet] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const now = useNow(active?.restEndsAt ?? null);

  useEffect(() => {
    if (!active || !slot) navigate('/app', { replace: true });
  }, [active, slot]);

  const idx = active?.exerciseIndex ?? 0;
  const rx = slot?.workout.exercises[idx];
  const performedId = rx ? (active?.swaps[idx] ?? rx.exercise) : '';
  const ex = performedId ? exercise(performedId) : undefined;
  const unit = plan?.profile.unit ?? 'kg';

  const suggestion = useMemo(() => {
    if (!rx || !ex || !plan || !active) return null;
    return suggestNext(ex, rx, lastPerformance(plan.data.sets, performedId, active.sessionId), unit);
    // History doesn't change while this exercise is on screen; recompute per exercise/unit only.
  }, [rx, ex, performedId, unit, active?.sessionId]);

  // Persist the prefilled drafts the first time an exercise is shown (reload-safe).
  useEffect(() => {
    if (active && rx && suggestion && !active.drafts[idx]) {
      updateActive((a) => ({ drafts: { ...a.drafts, [idx]: initialDrafts(rx, suggestion) } }));
    }
  }, [active, rx, suggestion, idx]);

  // Rest timer: derived from a timestamp, so it is right even after the screen was off.
  // `now` only drives the re-render; reading the clock here keeps the first frame exact too.
  const remaining = active?.restEndsAt ? Math.max(0, Math.ceil((active.restEndsAt - Math.max(now, Date.now())) / 1000)) : 0;
  useEffect(() => {
    if (active?.restEndsAt && remaining === 0) {
      if (document.visibilityState === 'visible') navigator.vibrate?.([120, 60, 120]);
      updateActive({ restEndsAt: null });
    }
  }, [active?.restEndsAt, remaining]);

  if (!plan || !active || !slot || !rx || !ex) return null;

  const drafts = active.drafts[idx] ?? (suggestion ? initialDrafts(rx, suggestion) : []);
  const nextSet = drafts.findIndex((d) => !d.done);
  const shownOpen = openSet ?? (nextSet >= 0 ? nextSet : null);
  const total = slot.workout.exercises.length;
  const isLastExercise = idx === total - 1;
  const anyDone = Object.values(active.drafts).some((ds) => ds?.some((d) => d.done));
  const resting = !!active.restEndsAt && remaining > 0;

  const setDrafts = (next: DraftSet[]) => updateActive((a) => ({ drafts: { ...a.drafts, [idx]: next } }));

  const logSet = (i: number) => {
    const d = drafts[i];
    const logId = d.logId ?? uuid();
    const weighted = ex.load === 'weighted';
    upsertSet({
      id: logId,
      sessionId: active.sessionId,
      exerciseId: performedId,
      slotExerciseId: rx.exercise,
      setIndex: i,
      weightKg: weighted && d.weight !== null ? toKg(d.weight, unit) : null,
      reps: d.reps,
      completed: true,
      unit,
      range: rx.reps,
      prescribedSets: rx.sets,
      loggedAt: new Date().toISOString(),
    });
    // A weight change carries over to the remaining sets.
    const next = drafts.map((x, j) => (j === i ? { ...x, done: true, logId } : j > i && !x.done ? { ...x, weight: d.weight } : x));
    const workoutOver = isLastExercise && next.every((x) => x.done);
    setDrafts(next);
    updateActive({ restEndsAt: workoutOver ? null : Date.now() + rx.restSec * 1000, restTotalSec: rx.restSec });
    track('set_logged', { exercise: performedId, set: i + 1, has_values: d.reps !== null });
    navigator.vibrate?.(15);
    setOpenSet(null);
  };

  const undo = (i: number) => {
    const d = drafts[i];
    if (d.logId) {
      upsertSet({
        id: d.logId,
        sessionId: active.sessionId,
        exerciseId: performedId,
        slotExerciseId: rx.exercise,
        setIndex: i,
        weightKg: null,
        reps: null,
        completed: false,
        unit,
        range: rx.reps,
        prescribedSets: rx.sets,
        loggedAt: new Date().toISOString(),
      });
    }
    setDrafts(drafts.map((x, j) => (j === i ? { ...x, done: false } : x)));
    setOpenSet(i);
  };

  const goTo = (i: number) => {
    setOpenSet(null);
    setSwapOpen(false);
    updateActive({ exerciseIndex: i });
    window.scrollTo(0, 0);
  };

  const skipRest = () => {
    track('rest_timer_skipped', { exercise: performedId, remaining_sec: remaining });
    updateActive({ restEndsAt: null });
  };

  const finish = () => {
    const res = completeWorkout();
    if (res) navigate(`/app/done?s=${res.session.id}`, { replace: true });
  };

  const discard = () => {
    abandonWorkout(idx, performedId);
    navigate('/app', { replace: true });
  };

  const alternatives = (rx.alternatives ?? exercise(rx.exercise).alternatives)
    .concat(performedId !== rx.exercise ? [rx.exercise] : [])
    .filter((id) => id !== performedId && exercise(id) && (plan.program.location === 'gym' || exercise(id).location.includes('home')));

  const swap = (to: string) => {
    track('exercise_swapped', { from: performedId, to });
    updateActive((a) => {
      const drafts = { ...a.drafts };
      delete drafts[idx];
      return { swaps: { ...a.swaps, [idx]: to }, drafts };
    });
    setSwapOpen(false);
    setOpenSet(null);
  };

  const measure = ex.measure === 'seconds' ? 'sec' : 'reps';
  const doneSets = drafts.filter((d) => d.done).length;

  let action;
  if (resting) {
    action = (
      <div className="rest" role="timer" aria-live="off">
        <div>
          <div className="rest-label">Rest</div>
          <div className="rest-time" aria-label={`${remaining} seconds rest left`}>
            {mmss(remaining)}
          </div>
        </div>
        <div className="rest-actions">
          <Button variant="secondary" onClick={() => updateActive((a) => ({ restEndsAt: (a.restEndsAt ?? Date.now()) + 15000 }))}>
            +15s
          </Button>
          <Button onClick={skipRest}>Skip</Button>
        </div>
      </div>
    );
  } else if (nextSet >= 0) {
    action = (
      <Button block className="btn-lg" onClick={() => logSet(nextSet)}>
        <Icon name="check" /> Log set {nextSet + 1} of {drafts.length}
      </Button>
    );
  } else if (!isLastExercise) {
    action = (
      <Button block className="btn-lg" onClick={() => goTo(idx + 1)}>
        Next exercise <Icon name="next" />
      </Button>
    );
  } else {
    action = (
      <Button block className="btn-lg" onClick={finish}>
        Finish workout
      </Button>
    );
  }

  return (
    <main className="player">
      <div className="player-top">
        <button className="icon-btn" aria-label="Close (your workout stays open)" onClick={() => navigate('/app')}>
          <Icon name="close" />
        </button>
        <div className="segments" aria-label={`Exercise ${idx + 1} of ${total}`}>
          {slot.workout.exercises.map((_, i) => {
            const ds = active.drafts[i];
            const done = !!ds && ds.length > 0 && ds.every((d) => d.done);
            return <span key={i} className={i === idx ? 'is-current' : done ? 'is-done' : ''} />;
          })}
        </div>
        <button className="icon-btn" aria-label="Workout menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <Icon name="more" />
        </button>
      </div>

      {menuOpen ? (
        <div className="menu-panel">
          <p style={{ marginBottom: 12 }}>End this workout now?</p>
          <Button block onClick={anyDone ? finish : discard}>
            {anyDone ? 'Save and finish' : 'End workout'}
          </Button>
          {anyDone ? (
            <Button variant="ghost" block onClick={discard}>
              Discard this workout
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="media">
        {ex.videoUrl ? (
          <video src={ex.videoUrl} muted loop playsInline autoPlay preload="metadata" aria-label={`${ex.name} demo`} />
        ) : (
          <div className="media-placeholder">
            <Icon name="play" size={28} />
            <span>Placeholder: {creator.identity.firstName}’s demo video for this exercise goes here.</span>
          </div>
        )}
      </div>

      <div className="ex-head">
        <p className="eyebrow">
          Exercise {idx + 1} of {total}
          {rx.finisher ? ' · Finisher' : ''}
        </p>
        <h1 className="display ex-name">{ex.name}</h1>
        <p className="muted">
          {rx.sets} sets · {rx.reps[0]}–{rx.reps[1]} {measure}
          {ex.perSide ? ' per side' : ''} · {rx.restSec}s rest
        </p>
      </div>

      <ol className="cues">
        {ex.cues.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      {rx.note ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          {rx.note}
        </p>
      ) : null}

      {suggestion ? (
        <p className="suggestion">
          <Icon name="star" size={18} />
          <span>{suggestion.reason}</span>
        </p>
      ) : null}

      <ol className="sets plain-list" aria-label={`Sets, ${doneSets} of ${drafts.length} done`}>
        {drafts.map((d, i) => (
          <SetRow
            key={i}
            i={i}
            draft={d}
            rx={rx}
            ex={ex}
            unit={unit}
            open={shownOpen === i}
            isNext={nextSet === i}
            onToggle={() => setOpenSet(shownOpen === i ? -1 : i)}
            onChange={(patch) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
            onUndo={() => undo(i)}
          />
        ))}
      </ol>
      {nextSet >= 0 ? (
        <p className="muted small" style={{ marginTop: 8 }}>
          Logging numbers is optional. You can tick a set without changing them.
        </p>
      ) : null}

      {alternatives.length ? (
        <div className="swap">
          <Button variant="ghost" onClick={() => setSwapOpen((o) => !o)} aria-expanded={swapOpen}>
            <Icon name="swap" size={18} /> {exercise(rx.exercise).swapPrompt ?? 'Swap exercise'}
          </Button>
          {swapOpen ? (
            <div className="swap-list">
              {alternatives.map((id) => (
                <button key={id} onClick={() => swap(id)}>
                  {exercise(id).name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="topnav" style={{ marginTop: 16 }}>
        <Button variant="ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
          <Icon name="back" size={18} /> Previous
        </Button>
        <Button variant="ghost" disabled={isLastExercise} onClick={() => goTo(idx + 1)}>
          Next <Icon name="next" size={18} />
        </Button>
      </div>

      <div className="bottom-bar">{action}</div>
    </main>
  );
}
