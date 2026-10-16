// Creator config schema. Everything that belongs to a creator is data and is
// validated here — at build time (vite.config.ts), at server start and in tests.
// A missing or broken field fails loudly with a readable path, e.g.
//   "brand.colors.accent: Invalid hex colour (expected #RRGGBB)".

import { z } from 'zod';
import { contrastRatio } from '../src/shared/color';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex colour (expected #RRGGBB)');
const nonEmpty = z.string().trim().min(1, 'Required');
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, digits and dashes');

import { weekdays } from '../src/shared/weekdays';

export { weekdays };
export type { Weekday } from '../src/shared/weekdays';

// ---------------------------------------------------------------------------
// Shared exercise library (content/exercises.ts)
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  id,
  name: nonEmpty,
  /** weighted: weight + reps are logged. bodyweight/band: reps (or seconds) only. */
  load: z.enum(['weighted', 'bodyweight', 'band']),
  measure: z.enum(['reps', 'seconds']).default('reps'),
  perSide: z.boolean().default(false),
  equipment: z.array(z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'smith', 'band', 'bench', 'none'])).min(1),
  location: z.array(z.enum(['gym', 'home'])).min(1),
  muscle: z.enum(['glutes', 'hamstrings', 'quads', 'back', 'chest', 'shoulders', 'arms', 'core']),
  /** Main lifts get a progress graph. */
  main: z.boolean().default(false),
  cues: z.array(nonEmpty).min(2).max(3),
  videoUrl: z.string().url().nullable().default(null),
  increment: z.object({ kg: z.number().positive(), lbs: z.number().positive() }),
  /** Suggested first weight for someone who has never done the lift. */
  startWeight: z.object({ kg: z.number().nonnegative(), lbs: z.number().nonnegative() }).optional(),
  alternatives: z.array(id).default([]),
  /** Label shown on the swap button, e.g. "No Smith machine?" */
  swapPrompt: z.string().optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseInput = z.input<typeof exerciseSchema>;

// ---------------------------------------------------------------------------
// Programs: program → phases → weeks → workouts → exercises
// A phase repeats its workout template for `weeks` weeks; `weekOverrides`
// lets a single week differ (e.g. a deload). Progression handles the load.
// ---------------------------------------------------------------------------

export const prescriptionSchema = z.object({
  exercise: id,
  sets: z.number().int().min(1).max(8),
  /** Rep range [min, max]; seconds when the exercise is timed. */
  reps: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([a, b]) => a <= b, 'min must be ≤ max'),
  restSec: z.number().int().min(15).max(300),
  /** Dropped when the member picked short sessions in the quiz. */
  finisher: z.boolean().default(false),
  note: z.string().optional(),
  /** Overrides the library alternatives for this slot. */
  alternatives: z.array(id).optional(),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

export const workoutSchema = z.object({
  id,
  name: nonEmpty,
  focus: nonEmpty,
  minutes: z.number().int().min(10).max(120),
  /** Optional workouts are only scheduled for members who train 4+ days. */
  optional: z.boolean().default(false),
  exercises: z.array(prescriptionSchema).min(1),
});
export type Workout = z.infer<typeof workoutSchema>;

export const phaseSchema = z.object({
  id,
  name: nonEmpty,
  summary: nonEmpty,
  weeks: z.number().int().min(1).max(12),
  workouts: z.array(workoutSchema).min(1),
  weekOverrides: z.record(z.string(), z.array(workoutSchema)).default({}),
});
export type Phase = z.infer<typeof phaseSchema>;

export const programSchema = z.object({
  id,
  name: nonEmpty,
  shortName: nonEmpty,
  tagline: nonEmpty,
  location: z.enum(['gym', 'home']),
  level: z.enum(['beginner', 'intermediate', 'all']),
  equipment: nonEmpty,
  /** Honest, non-guaranteed outcomes shown on the plan reveal. */
  outcomes: z.array(nonEmpty).min(2).max(4),
  phases: z.array(phaseSchema).min(1),
  /** Program suggested when this one is finished. */
  next: id.optional(),
});
export type Program = z.infer<typeof programSchema>;

// ---------------------------------------------------------------------------
// Creator
// ---------------------------------------------------------------------------

const imageSchema = z.object({
  /** Local path under /public (preferred, self-hosted) or a remote URL. */
  src: nonEmpty,
  /** Tried in order if `src` is missing or fails to load. */
  fallbacks: z.array(z.string()).default([]),
  alt: nonEmpty,
  /** CSS object-position for cropping. */
  focus: z.string().default('50% 30%'),
});
export type CreatorImageSource = z.infer<typeof imageSchema>;

const fontSchema = z.object({
  family: nonEmpty,
  fallback: nonEmpty,
  /** CSS files to import (self-hosted fonts, e.g. @fontsource). No Google Fonts CDN (GDPR). */
  imports: z.array(nonEmpty).min(1),
  weight: z.number().int().default(400),
  /** Optical tweak: uppercase display fonts usually want tighter tracking. */
  letterSpacing: z.string().default('-0.01em'),
  uppercase: z.boolean().default(false),
});

const quizOptionSchema = z.object({ id, label: nonEmpty, hint: z.string().optional() });

const quizQuestionSchema = z.object({
  id,
  prompt: nonEmpty,
  help: z.string().optional(),
  options: z.array(quizOptionSchema).min(2).max(6),
});

const ruleSchema = z.object({
  /** All listed questions must match one of the listed answers. */
  when: z.record(z.string(), z.array(z.string()).min(1)),
  program: id,
  /** Use this "days" answer's schedule instead of the chosen one (e.g. start beginners on 3 days). */
  scheduleAs: z.string().optional(),
  /** Shown on the reveal, in the creator's voice — explains the choice. */
  note: z.string().optional(),
});

const planSchema = z.object({
  id: z.enum(['annual', 'monthly']),
  label: nonEmpty,
  interval: z.enum(['year', 'month']),
  priceCents: z.number().int().positive(),
  /** Stripe Price lookup key. `npm run stripe:setup` creates matching prices. */
  stripeLookupKey: nonEmpty,
  trialDays: z.number().int().min(0).max(30).default(0),
  highlight: z.boolean().default(false),
  badge: z.string().optional(),
});
export type OfferPlan = z.infer<typeof planSchema>;

const emailTemplateSchema = z.object({ subject: nonEmpty, preview: nonEmpty, body: z.array(nonEmpty).min(1), cta: nonEmpty });

const creatorBase = z.object({
  identity: z.object({
    name: nonEmpty,
    firstName: nonEmpty,
    handle: z.string().regex(/^@[\w.]+$/, 'Handle must start with @'),
    slug: id,
    appName: nonEmpty,
    domain: nonEmpty,
    supportEmail: z.email(),
    socials: z.array(z.object({ platform: z.enum(['tiktok', 'instagram', 'youtube', 'snapchat']), url: z.url(), label: nonEmpty })).min(1),
    /** Marks a fictional demo creator. Shows a small "demo" label. */
    demo: z.boolean().default(false),
  }),
  brand: z.object({
    base: z.enum(['light', 'dark']),
    colors: z.object({
      bg: hex,
      surface: hex,
      text: hex,
      muted: hex,
      line: hex,
      accent: hex,
      accentContrast: hex,
    }),
    fonts: z.object({ display: fontSchema, ui: fontSchema }),
    radius: z.object({ card: z.number().int().min(0).max(40), button: z.number().int().min(0).max(999) }),
    logo: z.object({ text: nonEmpty, image: z.string().optional() }),
    images: z.object({ hero: imageSchema, welcome: imageSchema, story: imageSchema, avatar: imageSchema }),
  }),
  voice: z.object({
    tone: nonEmpty,
    greeting: nonEmpty,
    signOff: nonEmpty,
    samples: z.array(nonEmpty).min(5).max(10),
  }),
  copy: z.object({
    meta: z.object({ title: nonEmpty, description: nonEmpty }),
    landing: z.object({
      eyebrow: nonEmpty,
      headline: nonEmpty,
      promise: nonEmpty,
      cta: nonEmpty,
      ctaNote: nonEmpty,
      benefitsTitle: nonEmpty,
      benefits: z
        .array(z.object({ title: nonEmpty, body: nonEmpty, screen: z.enum(['plan', 'player', 'progress', 'today']) }))
        .min(3)
        .max(4),
      stepsTitle: nonEmpty,
      steps: z.array(z.object({ title: nonEmpty, body: nonEmpty })).length(3),
      story: z.object({ title: nonEmpty, paragraphs: z.array(nonEmpty).min(1).max(4) }),
      finalCta: z.object({ headline: nonEmpty, body: nonEmpty }),
      healthNote: nonEmpty,
    }),
    faq: z.array(z.object({ q: nonEmpty, a: nonEmpty })).min(4),
    quiz: z.object({
      interstitials: z.array(z.object({ after: id, title: nonEmpty, body: nonEmpty })).min(1),
      email: z.object({
        title: nonEmpty,
        body: nonEmpty,
        button: nonEmpty,
        marketingConsent: nonEmpty,
        privacyNote: nonEmpty,
      }),
      building: z.array(nonEmpty).min(2).max(4),
    }),
    reveal: z.object({
      title: nonEmpty,
      outcomesTitle: nonEmpty,
      cta: nonEmpty,
      /** Keyed by the answer id of the "blocker" question. */
      blockerLines: z.record(z.string(), nonEmpty).default({}),
    }),
    paywall: z.object({ title: nonEmpty, reassurance: nonEmpty, cta: nonEmpty }),
    welcome: z.object({ title: nonEmpty, body: z.array(nonEmpty).min(1).max(3), cta: nonEmpty }),
    /** Short templates with {{placeholders}}; see src/shared/template.ts. */
    templates: z.object({
      firstWorkoutDone: nonEmpty,
      workoutDone: nonEmpty,
      restDay: nonEmpty,
      pickUp: nonEmpty,
      emptyProgress: nonEmpty,
      weeklySummary: nonEmpty,
      reminderPush: nonEmpty,
      scheduleAsk: nonEmpty,
      programDone: nonEmpty,
      cancelConfirm: nonEmpty,
    }),
    emails: z.object({
      welcome: emailTemplateSchema,
      planReady: emailTemplateSchema,
      confirmMarketing: emailTemplateSchema,
      noWorkout24h: emailTemplateSchema,
      day3Tip: emailTemplateSchema,
      trialEnding: emailTemplateSchema,
      weeklySummary: emailTemplateSchema,
      inactive5d: emailTemplateSchema,
    }),
  }),
  offer: z.object({
    currency: z.enum(['usd', 'eur', 'gbp']),
    plans: z.array(planSchema).min(1).max(2),
    oneTime: z.object({ enabled: z.boolean(), programId: id, label: nonEmpty, priceCents: z.number().int().positive(), stripeLookupKey: nonEmpty }).optional(),
    pastDueGraceDays: z.number().int().min(0).max(14).default(3),
    cancel: z.object({
      reasons: z.array(z.object({ id, label: nonEmpty, offer: z.enum(['pause', 'switch', 'discount', 'none']) })).min(2),
      pauseMonths: z.number().int().min(1).max(3).default(1),
      discount: z.object({ percent: z.number().int().min(5).max(80), months: z.number().int().min(1).max(12) }),
    }),
    upsell: z.object({ monthlyToAnnualAfterDays: z.number().int().min(14).default(60) }),
  }),
  programs: z.array(programSchema).min(1),
  quiz: z.object({
    questions: z.array(quizQuestionSchema).min(4).max(7),
    /** Weekday pattern per answer of the "days" question. */
    schedules: z.record(z.string(), z.array(z.enum(weekdays)).min(1).max(6)),
    rules: z.array(ruleSchema).min(1),
    defaultProgram: id,
    /** Answer ids of the "session" question that mean short sessions (finishers dropped). */
    shortSessionAnswers: z.array(z.string()).default([]),
  }),
  features: z.object({ challenges: z.boolean(), nutrition: z.boolean(), progressPhotos: z.boolean() }),
  /** Real, consented results only. Empty → the section is not rendered. */
  results: z.array(z.object({ name: nonEmpty, quote: nonEmpty, image: z.string().optional(), consentOnFile: z.literal(true) })).default([]),
  /** Weekly creator notes, scheduled by date (ISO Monday of the week). */
  messages: z.array(z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: nonEmpty, body: nonEmpty, videoUrl: z.string().optional() })).default([]),
  /** Per-creator overrides of the shared library (own videos and cues). */
  exerciseOverrides: z.record(z.string(), z.object({ videoUrl: z.string().url().optional(), cues: z.array(nonEmpty).min(2).max(3).optional() })).default({}),
  legal: z.object({
    contractPartner: z.enum(['operator', 'creator']),
    operator: z.object({
      name: nonEmpty,
      address: z.array(nonEmpty).min(2),
      email: z.email(),
      phone: z.string().optional(),
      vatId: z.string().optional(),
      representative: z.string().optional(),
    }),
    ageConfirmLabel: nonEmpty,
    withdrawalConsentLabel: nonEmpty,
    lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** True until a lawyer has reviewed the texts. Renders a visible draft notice. */
    draft: z.boolean().default(true),
  }),
});

export const creatorSchema = creatorBase.superRefine((c, ctx) => {
  // Zod runs refinements even if fields above already failed; the cross-field
  // checks below assume the basic shape, so bail out quietly if it's broken
  // (the field-level errors are reported anyway).
  try {
    crossFieldChecks(c, ctx);
  } catch {
    /* shape errors already reported */
  }
});

type RefineCtx = { addIssue: (issue: { code: 'custom'; path: (string | number)[]; message: string }) => void };

function crossFieldChecks(c: z.infer<typeof creatorBase>, ctx: RefineCtx) {
  {
    const programIds = new Set(c.programs.map((p) => p.id));
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });

    // Quiz: mandatory questions (conversion.md) and valid mapping targets.
    const qIds = new Set(c.quiz.questions.map((q) => q.id));
    for (const required of ['goal', 'experience', 'location', 'days']) {
      if (!qIds.has(required)) issue(['quiz', 'questions'], `Missing mandatory question "${required}"`);
    }
    const days = c.quiz.questions.find((q) => q.id === 'days');
    for (const opt of days?.options ?? []) {
      if (!c.quiz.schedules[opt.id]) issue(['quiz', 'schedules'], `No weekday schedule for days answer "${opt.id}"`);
    }
    c.quiz.rules.forEach((r, i) => {
      if (!programIds.has(r.program)) issue(['quiz', 'rules', i, 'program'], `Unknown program "${r.program}"`);
      if (r.scheduleAs && !c.quiz.schedules[r.scheduleAs]) issue(['quiz', 'rules', i, 'scheduleAs'], `No schedule "${r.scheduleAs}"`);
      for (const [qid, answers] of Object.entries(r.when)) {
        const q = c.quiz.questions.find((x) => x.id === qid);
        if (!q) issue(['quiz', 'rules', i, 'when', qid], `Unknown question "${qid}"`);
        else for (const a of answers) if (!q.options.some((o) => o.id === a)) issue(['quiz', 'rules', i, 'when', qid], `Unknown answer "${a}"`);
      }
    });
    if (!programIds.has(c.quiz.defaultProgram)) issue(['quiz', 'defaultProgram'], `Unknown program "${c.quiz.defaultProgram}"`);
    c.copy.quiz.interstitials.forEach((s, i) => {
      if (!qIds.has(s.after)) issue(['copy', 'quiz', 'interstitials', i, 'after'], `Unknown question "${s.after}"`);
    });

    // Programs: next program must exist, workout ids unique per phase.
    c.programs.forEach((p, i) => {
      if (p.next && !programIds.has(p.next)) issue(['programs', i, 'next'], `Unknown program "${p.next}"`);
      p.phases.forEach((ph, j) => {
        const seen = new Set<string>();
        for (const w of ph.workouts) {
          if (seen.has(w.id)) issue(['programs', i, 'phases', j], `Duplicate workout id "${w.id}"`);
          seen.add(w.id);
        }
      });
    });

    // Offer
    if (c.offer.plans.filter((p) => p.highlight).length > 1) issue(['offer', 'plans'], 'At most one plan can be highlighted');
    if (new Set(c.offer.plans.map((p) => p.id)).size !== c.offer.plans.length) issue(['offer', 'plans'], 'Plan ids must be unique');
    if (c.offer.oneTime?.enabled && !programIds.has(c.offer.oneTime.programId)) {
      issue(['offer', 'oneTime', 'programId'], `Unknown program "${c.offer.oneTime.programId}"`);
    }

    // Accessibility: WCAG AA (4.5:1) for every text/background pair the UI uses.
    const col = c.brand.colors;
    // Refinements also run when a colour already failed the hex check — skip then.
    if (!Object.values(col).every((v) => /^#[0-9a-fA-F]{6}$/.test(v))) return;
    const pairs: [string, string, string][] = [
      ['text', 'bg', 'text on background'],
      ['text', 'surface', 'text on surface'],
      ['muted', 'bg', 'muted text on background'],
      ['muted', 'surface', 'muted text on surface'],
      ['accentContrast', 'accent', 'button label on accent'],
    ];
    for (const [fg, bg, label] of pairs) {
      const ratio = contrastRatio(col[fg as keyof typeof col], col[bg as keyof typeof col]);
      if (ratio < 4.5) issue(['brand', 'colors', fg], `Contrast ${label} is ${ratio.toFixed(2)}:1, needs ≥ 4.5:1 (WCAG AA)`);
    }
    // Accent used as text/links on the background needs AA too.
    const accentOnBg = contrastRatio(col.accent, col.bg);
    if (accentOnBg < 4.5) issue(['brand', 'colors', 'accent'], `Accent on background is ${accentOnBg.toFixed(2)}:1, needs ≥ 4.5:1 (used for links)`);
  }
}

export type CreatorConfig = z.infer<typeof creatorSchema>;
export type CreatorConfigInput = z.input<typeof creatorSchema>;

/** Validate and normalise. Throws a single error listing every problem. */
export function validateCreator(input: unknown, label = 'creator'): CreatorConfig {
  const result = creatorSchema.safeParse(input);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Creator config "${label}" is invalid:\n${lines.join('\n')}`);
  }
  return result.data;
}

/** Defines a config with type checking at authoring time. */
export function defineCreator(config: CreatorConfigInput): CreatorConfigInput {
  return config;
}
