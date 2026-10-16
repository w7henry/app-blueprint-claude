// Ayria's programs. DRAFT: built from the lifts she shows publicly (hip thrust,
// wide-stance leg press, Bulgarian split squat, back extension, banded RDL).
// She must approve or replace them before launch.

import type { CreatorConfigInput } from '../schema';

type ProgramInput = CreatorConfigInput['programs'][number];
type Ex = { exercise: string; sets: number; reps: [number, number]; restSec: number; finisher?: boolean; note?: string };

const ex = (exercise: string, sets: number, reps: [number, number], restSec: number, extra: Partial<Ex> = {}): Ex => ({
  exercise,
  sets,
  reps,
  restSec,
  ...extra,
});

export const foundations: ProgramInput = {
  id: 'foundations',
  name: 'Glute Era: Foundations',
  shortName: 'Foundations',
  tagline: 'Your first 8 weeks of real glute training.',
  location: 'gym',
  level: 'beginner',
  equipment: 'Gym: machines, cables, barbell & dumbbells',
  outcomes: [
    'Your hip thrust can go up a lot. Most beginners add weight almost every week at first.',
    'You’ll know your way around the gym and every lift in your plan.',
    'Training 3× a week starts to feel like routine, not a decision.',
  ],
  next: 'growth',
  phases: [
    {
      id: 'learn',
      name: 'Learn the lifts',
      summary: 'Moderate weights, clean reps. Finish every set with 2–3 reps left in the tank.',
      weeks: 4,
      workouts: [
        {
          id: 'glutes-hams',
          name: 'Glutes & Hamstrings',
          focus: 'Glutes · Hamstrings',
          minutes: 45,
          exercises: [
            ex('hip-thrust', 3, [10, 12], 90),
            ex('rdl', 3, [10, 12], 90),
            ex('hip-abduction', 3, [12, 15], 60),
            ex('leg-curl', 3, [10, 12], 60),
            ex('plank', 2, [20, 40], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper-core',
          name: 'Upper Body & Core',
          focus: 'Back · Shoulders · Core',
          minutes: 40,
          exercises: [
            ex('lat-pulldown', 3, [10, 12], 75),
            ex('cable-row', 3, [10, 12], 75),
            ex('db-shoulder-press', 3, [10, 12], 75),
            ex('lateral-raise', 2, [12, 15], 45),
            ex('cable-crunch', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'glutes-quads',
          name: 'Glutes & Quads',
          focus: 'Glutes · Quads',
          minutes: 45,
          exercises: [
            ex('leg-press-wide', 3, [10, 12], 90),
            ex('bulgarian-split-squat', 2, [8, 10], 75),
            ex('back-extension', 3, [12, 15], 60),
            ex('cable-kickback', 2, [12, 15], 45),
            ex('dead-bug', 2, [6, 8], 45, { finisher: true }),
          ],
        },
      ],
    },
    {
      id: 'build',
      name: 'Build',
      summary: 'Same lifts, a little heavier. More sets on the big glute moves.',
      weeks: 4,
      workouts: [
        {
          id: 'glutes-hams',
          name: 'Glutes & Hamstrings',
          focus: 'Glutes · Hamstrings',
          minutes: 50,
          exercises: [
            ex('hip-thrust', 4, [8, 10], 120),
            ex('rdl', 3, [8, 10], 90),
            ex('hip-abduction', 3, [12, 15], 60),
            ex('leg-curl', 3, [10, 12], 60),
            ex('plank', 2, [30, 45], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper-core',
          name: 'Upper Body & Core',
          focus: 'Back · Shoulders · Core',
          minutes: 45,
          exercises: [
            ex('lat-pulldown', 3, [8, 10], 90),
            ex('cable-row', 3, [8, 10], 75),
            ex('db-shoulder-press', 3, [8, 10], 75),
            ex('lateral-raise', 3, [12, 15], 45),
            ex('cable-crunch', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'glutes-quads',
          name: 'Glutes & Quads',
          focus: 'Glutes · Quads',
          minutes: 50,
          exercises: [
            ex('leg-press-wide', 4, [8, 10], 120),
            ex('bulgarian-split-squat', 3, [8, 10], 75),
            ex('back-extension', 3, [10, 12], 60),
            ex('cable-kickback', 3, [12, 15], 45),
            ex('dead-bug', 2, [8, 10], 45, { finisher: true }),
          ],
        },
      ],
    },
  ],
};

export const growth: ProgramInput = {
  id: 'growth',
  name: 'Glute Era: Growth',
  shortName: 'Growth',
  tagline: 'Heavier lifts, a real peak phase.',
  location: 'gym',
  level: 'intermediate',
  equipment: 'Gym: machines, cables, barbell & dumbbells',
  outcomes: [
    'Your main lifts (hip thrust, RDL, hack squat) can climb steadily, week after week.',
    'A clear structure instead of random workouts you found on TikTok.',
    'A Peak phase at the end to see how strong you’ve really become.',
  ],
  next: 'growth',
  phases: [
    {
      id: 'build',
      name: 'Build',
      summary: 'Heavier main lifts, moderate volume.',
      weeks: 4,
      workouts: [
        {
          id: 'glute-strength',
          name: 'Glute Strength',
          focus: 'Glutes · Hamstrings',
          minutes: 55,
          exercises: [
            ex('hip-thrust', 4, [6, 8], 150),
            ex('rdl', 3, [8, 10], 120),
            ex('bulgarian-split-squat', 3, [8, 10], 90),
            ex('hip-abduction', 3, [15, 20], 60),
            ex('cable-kickback', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper',
          name: 'Upper Push & Pull',
          focus: 'Back · Chest · Shoulders',
          minutes: 50,
          exercises: [
            ex('lat-pulldown', 4, [8, 10], 90),
            ex('incline-db-press', 3, [8, 10], 90),
            ex('cable-row', 3, [10, 12], 75),
            ex('lateral-raise', 3, [12, 15], 45),
            ex('triceps-pushdown', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'quads-glutes',
          name: 'Quads & Glutes',
          focus: 'Quads · Glutes',
          minutes: 55,
          exercises: [
            ex('hack-squat', 4, [8, 10], 120),
            ex('leg-press-wide', 3, [10, 12], 90),
            ex('step-up', 2, [10, 12], 75),
            ex('leg-extension', 3, [12, 15], 60),
            ex('back-extension', 3, [12, 15], 60, { finisher: true }),
          ],
        },
        {
          id: 'glute-pump',
          name: 'Glute Pump & Core',
          focus: 'Glutes · Core',
          minutes: 35,
          optional: true,
          exercises: [
            ex('cable-pull-through', 3, [12, 15], 60),
            ex('hip-abduction', 3, [15, 20], 45),
            ex('cable-kickback', 3, [12, 15], 45),
            ex('hanging-knee-raise', 3, [10, 12], 45),
            ex('side-plank', 2, [20, 30], 30, { finisher: true }),
          ],
        },
      ],
    },
    {
      id: 'peak',
      name: 'Peak',
      summary: 'Fewer reps, heavier weights on the big lifts. Your strongest weeks.',
      weeks: 4,
      workouts: [
        {
          id: 'glute-strength',
          name: 'Glute Strength',
          focus: 'Glutes · Hamstrings',
          minutes: 55,
          exercises: [
            ex('hip-thrust', 4, [5, 7], 180),
            ex('rdl', 4, [6, 8], 120),
            ex('bulgarian-split-squat', 3, [8, 10], 90),
            ex('hip-abduction', 3, [15, 20], 60),
            ex('cable-kickback', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper',
          name: 'Upper Push & Pull',
          focus: 'Back · Chest · Shoulders',
          minutes: 50,
          exercises: [
            ex('lat-pulldown', 4, [6, 8], 120),
            ex('incline-db-press', 4, [6, 8], 120),
            ex('cable-row', 3, [8, 10], 90),
            ex('lateral-raise', 3, [12, 15], 45),
            ex('triceps-pushdown', 2, [12, 15], 45, { finisher: true }),
          ],
        },
        {
          id: 'quads-glutes',
          name: 'Quads & Glutes',
          focus: 'Quads · Glutes',
          minutes: 55,
          exercises: [
            ex('hack-squat', 4, [6, 8], 150),
            ex('leg-press-wide', 3, [8, 10], 90),
            ex('step-up', 3, [8, 10], 75),
            ex('leg-extension', 3, [12, 15], 60),
            ex('back-extension', 3, [10, 12], 60, { finisher: true }),
          ],
        },
        {
          id: 'glute-pump',
          name: 'Glute Pump & Core',
          focus: 'Glutes · Core',
          minutes: 35,
          optional: true,
          exercises: [
            ex('cable-pull-through', 3, [12, 15], 60),
            ex('hip-abduction', 3, [15, 20], 45),
            ex('cable-kickback', 3, [12, 15], 45),
            ex('hanging-knee-raise', 3, [10, 12], 45),
            ex('side-plank', 2, [25, 35], 30, { finisher: true }),
          ],
        },
      ],
    },
  ],
};

export const home: ProgramInput = {
  id: 'home',
  name: 'Glute Era: Home',
  shortName: 'Home',
  tagline: 'Dumbbells, a band and your living room.',
  location: 'home',
  level: 'all',
  equipment: 'A pair of dumbbells + a mini band',
  outcomes: [
    'Stronger glutes and legs with nothing but dumbbells and a band.',
    'A routine that fits into 30–35 minutes at home.',
    'The confidence to take your training to a gym whenever you’re ready.',
  ],
  next: 'foundations',
  phases: [
    {
      id: 'foundation',
      name: 'Foundation',
      summary: 'Learn the moves with dumbbells and a band. Slow, controlled reps.',
      weeks: 3,
      workouts: [
        {
          id: 'glutes-hams',
          name: 'Glutes & Hamstrings',
          focus: 'Glutes · Hamstrings',
          minutes: 35,
          exercises: [
            ex('db-hip-thrust', 3, [12, 15], 75),
            ex('db-rdl', 3, [10, 12], 75),
            ex('sliding-leg-curl', 3, [8, 10], 60),
            ex('seated-band-abduction', 3, [15, 20], 45),
            ex('dead-bug', 2, [6, 8], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper-core',
          name: 'Upper Body & Core',
          focus: 'Back · Shoulders · Core',
          minutes: 30,
          exercises: [
            ex('db-row', 3, [10, 12], 60),
            ex('push-up', 3, [6, 10], 60),
            ex('db-shoulder-press', 3, [10, 12], 60),
            ex('band-pull-apart', 2, [15, 20], 45),
            ex('plank', 2, [20, 40], 45, { finisher: true }),
          ],
        },
        {
          id: 'glutes-quads',
          name: 'Glutes & Quads',
          focus: 'Glutes · Quads',
          minutes: 35,
          exercises: [
            ex('goblet-squat', 3, [10, 12], 75),
            ex('bulgarian-split-squat', 3, [8, 10], 60, { note: 'Back foot on the couch or a sturdy chair.' }),
            ex('banded-kickback', 3, [15, 20], 45),
            ex('frog-pump', 2, [20, 25], 45),
            ex('side-plank', 2, [20, 30], 30, { finisher: true }),
          ],
        },
      ],
    },
    {
      id: 'build',
      name: 'Build',
      summary: 'More sets and slower lowering — making light weights count.',
      weeks: 3,
      workouts: [
        {
          id: 'glutes-hams',
          name: 'Glutes & Hamstrings',
          focus: 'Glutes · Hamstrings',
          minutes: 40,
          exercises: [
            ex('db-hip-thrust', 4, [12, 15], 75),
            ex('db-rdl', 4, [10, 12], 75),
            ex('sliding-leg-curl', 3, [10, 12], 60),
            ex('seated-band-abduction', 3, [20, 25], 45),
            ex('dead-bug', 2, [8, 10], 45, { finisher: true }),
          ],
        },
        {
          id: 'upper-core',
          name: 'Upper Body & Core',
          focus: 'Back · Shoulders · Core',
          minutes: 35,
          exercises: [
            ex('db-row', 4, [10, 12], 60),
            ex('push-up', 3, [8, 12], 60),
            ex('db-shoulder-press', 3, [10, 12], 60),
            ex('band-pull-apart', 3, [15, 20], 45),
            ex('plank', 2, [30, 45], 45, { finisher: true }),
          ],
        },
        {
          id: 'glutes-quads',
          name: 'Glutes & Quads',
          focus: 'Glutes · Quads',
          minutes: 40,
          exercises: [
            ex('goblet-squat', 4, [10, 12], 75),
            ex('bulgarian-split-squat', 3, [10, 12], 60, { note: 'Back foot on the couch or a sturdy chair.' }),
            ex('banded-kickback', 3, [20, 25], 45),
            ex('frog-pump', 3, [20, 25], 45),
            ex('side-plank', 2, [25, 35], 30, { finisher: true }),
          ],
        },
      ],
    },
  ],
};
