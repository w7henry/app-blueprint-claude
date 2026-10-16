// Creator registry. Adding a creator = adding a folder + one line here.
// The active creator is chosen per deploy with the CREATOR_SLUG env variable.

import { exerciseInputs, loadExerciseLibrary } from '../content/exercises';
import { validateCreator, type CreatorConfig, type CreatorConfigInput, type Exercise } from './schema';
import ayria from './ayria/config';
import nova from './nova/config';

export const creatorInputs: Record<string, CreatorConfigInput> = { ayria, nova };

export const DEFAULT_CREATOR = 'ayria';

/** Everything the app needs for one creator, validated and normalised. */
export interface CreatorBundle {
  creator: CreatorConfig;
  /** Shared library with this creator's overrides applied. */
  exercises: Record<string, Exercise>;
}

export function loadCreator(slug: string = DEFAULT_CREATOR): CreatorBundle {
  const input = creatorInputs[slug];
  if (!input) {
    throw new Error(`Unknown CREATOR_SLUG "${slug}". Available: ${Object.keys(creatorInputs).join(', ')}`);
  }
  const creator = validateCreator(input, slug);
  if (creator.identity.slug !== slug) {
    throw new Error(`Creator "${slug}": identity.slug is "${creator.identity.slug}" — they must match.`);
  }

  const library = loadExerciseLibrary(exerciseInputs);
  const problems: string[] = [];

  // Apply per-creator overrides (own videos and cues).
  const exercises: Record<string, Exercise> = {};
  for (const [id, ex] of Object.entries(library)) {
    const o = creator.exerciseOverrides[id];
    exercises[id] = o ? { ...ex, videoUrl: o.videoUrl ?? ex.videoUrl, cues: o.cues ?? ex.cues } : ex;
  }
  for (const id of Object.keys(creator.exerciseOverrides)) {
    if (!library[id]) problems.push(`exerciseOverrides.${id}: unknown exercise`);
  }

  // Every exercise a program references must exist; home programs only use home-capable moves.
  creator.programs.forEach((p, pi) => {
    p.phases.forEach((ph, phi) => {
      const all = [...ph.workouts, ...Object.values(ph.weekOverrides).flat()];
      for (const w of all) {
        w.exercises.forEach((e, ei) => {
          const path = `programs.${pi}.phases.${phi}.workouts.${w.id}.exercises.${ei}`;
          const ex = library[e.exercise];
          if (!ex) {
            problems.push(`${path}: unknown exercise "${e.exercise}"`);
            return;
          }
          if (p.location === 'home' && !ex.location.includes('home')) {
            problems.push(`${path}: "${e.exercise}" is not a home exercise but "${p.id}" is a home program`);
          }
          for (const alt of e.alternatives ?? []) if (!library[alt]) problems.push(`${path}: unknown alternative "${alt}"`);
        });
      }
    });
  });

  if (problems.length) {
    throw new Error(`Creator config "${slug}" is invalid:\n${problems.map((p) => `  • ${p}`).join('\n')}`);
  }
  return { creator, exercises };
}
