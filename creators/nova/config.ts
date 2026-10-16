// FICTIONAL demo creator. Exists to prove that a second creator with a different
// look, offer and home-only programs runs without code changes:
//   CREATOR_SLUG=nova npm run dev
// No real person. Images are deliberately missing so the placeholders show.

import { defineCreator } from '../schema';

const placeholder = (file: string, alt: string) => ({ src: `/creators/nova/${file}`, fallbacks: [], alt, focus: '50% 30%' });

type Ex = { exercise: string; sets: number; reps: [number, number]; restSec: number; finisher?: boolean };
const ex = (exercise: string, sets: number, reps: [number, number], restSec: number, finisher = false): Ex => ({ exercise, sets, reps, restSec, finisher });

export default defineCreator({
  identity: {
    name: 'Nova Lindqvist',
    firstName: 'Nova',
    handle: '@nova.demo',
    slug: 'nova',
    appName: 'Nova Method',
    domain: 'nova.example.com',
    supportEmail: 'support@nova.example.com',
    socials: [{ platform: 'instagram', url: 'https://example.com/nova', label: 'Instagram' }],
    demo: true,
  },

  brand: {
    base: 'dark',
    colors: {
      bg: '#0F1217',
      surface: '#181D25',
      text: '#EEF2F6',
      muted: '#A4AEBB',
      line: '#2A313C',
      accent: '#7DDCC4',
      accentContrast: '#0F1217',
    },
    fonts: {
      display: {
        family: 'Unbounded',
        fallback: '"Arial Black", system-ui, sans-serif',
        imports: ['@fontsource/unbounded/latin-600.css'],
        weight: 600,
        letterSpacing: '-0.03em',
        uppercase: true,
      },
      ui: {
        family: 'DM Sans Variable',
        fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        imports: ['@fontsource-variable/dm-sans/wght.css'],
        weight: 400,
        letterSpacing: '0',
      },
    },
    radius: { card: 6, button: 6 },
    logo: { text: 'NOVA METHOD' },
    images: {
      hero: placeholder('hero.jpg', 'Nova training at home'),
      welcome: placeholder('welcome.jpg', 'Nova'),
      story: placeholder('story.jpg', 'Nova'),
      avatar: placeholder('avatar.jpg', 'Nova'),
    },
  },

  voice: {
    tone: 'Calm, precise, coach-like. Dry humour. No hype words.',
    greeting: 'Hi,',
    signOff: '— Nova',
    samples: [
      'Twenty minutes, done properly, beats an hour of scrolling for motivation.',
      'Slow down the lowering. That is where the work happens.',
      'You do not need equipment. You need a plan and a floor.',
      'Consistency is boring. Boring works.',
      'If it hurts, stop. If it is just hard, breathe.',
    ],
  },

  copy: {
    meta: { title: 'Nova Method: strength at home in 20 minutes', description: 'Bodyweight strength at home. No equipment, 20 minutes, three times a week.' },
    landing: {
      eyebrow: 'Nova Method · demo creator',
      headline: 'Strong at home. No equipment.',
      promise: '4 weeks. 3 sessions a week. 20 minutes each.',
      cta: 'Build my plan',
      ctaNote: '4 questions · no account needed',
      benefitsTitle: 'Inside the app',
      benefits: [
        { title: 'Your plan', body: 'Matched to your level and schedule.', screen: 'plan' },
        { title: 'Follow along', body: 'One move per screen, clear cues, a rest timer that just works.', screen: 'player' },
        { title: 'Progress you can see', body: 'Reps and holds tracked automatically.', screen: 'progress' },
      ],
      stepsTitle: 'Three steps',
      steps: [
        { title: 'Answer 4 questions', body: 'Level, goal, place, days.' },
        { title: 'Get your plan', body: 'See the program and your first week.' },
        { title: 'Train', body: '20 minutes, three times a week.' },
      ],
      story: { title: 'About Nova', paragraphs: ['This is a fictional demo creator used to test the white-label setup.'] },
      finalCta: { headline: 'Start this week.', body: 'Four questions, then your plan.' },
      healthNote: 'Check with a doctor before starting if you are pregnant, injured or unwell. Stop if something hurts.',
    },
    faq: [
      { q: 'Will I get bulky?', a: 'No. Bodyweight training builds strength and control.' },
      { q: 'Gym or home?', a: 'Home. All you need is a floor, a wall and optionally a resistance band.' },
      { q: 'Is it beginner friendly?', a: 'Yes. Every move has an easier option.' },
      { q: 'How do I cancel?', a: 'Settings → Membership → Cancel membership. Access continues until the end of the paid period.' },
    ],
    quiz: {
      interstitials: [{ after: 'goal', title: 'Good choice.', body: 'Short, focused sessions are the easiest to keep doing. That is the whole idea.' }],
      email: {
        title: 'Where should we send your plan?',
        body: 'You will get a link to come back to it.',
        button: 'See my plan',
        marketingConsent: 'Send me new programs and offers from Nova. Unsubscribe anytime.',
        privacyNote: 'Your email is only used for your plan and account.',
      },
      building: ['Reading your answers…', 'Building your week…'],
    },
    reveal: { title: 'Here is your plan.', outcomesTitle: 'What {{weeks}} weeks can change', cta: 'Get started', blockerLines: {} },
    paywall: { title: 'Get {{program}}', reassurance: 'Cancel anytime in settings.', cta: 'Continue' },
    welcome: { title: 'Welcome.', body: ['Your first session takes about {{minutes}} minutes. Find a bit of floor and let us begin.'], cta: 'Begin session 1' },
    templates: {
      firstWorkoutDone: '{{exercise}}: {{reps}}. Your baseline.',
      workoutDone: 'Session {{count}} complete.',
      restDay: 'Rest day. A walk counts.',
      pickUp: 'Next up: {{workout}}.',
      emptyProgress: 'Finish a session to see progress here.',
      weeklySummary: 'This week: {{done}}/{{goal}} sessions{{highlight}}.',
      reminderPush: '{{workout}} today. {{minutes}} minutes.',
      scheduleAsk: 'Remind you on {{days}}?',
      programDone: '{{program}} complete.',
      cancelConfirm: 'Cancelled. Access until {{date}}.',
    },
    emails: {
      welcome: { subject: 'Your login link', preview: 'Session 1 is ready', body: ['Hi,', 'Your plan is {{program}}.', 'Log in below.'], cta: 'Log in' },
      planReady: { subject: 'Your plan', preview: 'Saved for you', body: ['Hi,', '{{program}} on {{days}}.'], cta: 'Open plan' },
      confirmMarketing: {
        subject: 'Confirm your subscription',
        preview: 'One click',
        body: ['Hi,', 'Please confirm you want updates from Nova.'],
        cta: 'Confirm',
      },
      noWorkout24h: { subject: 'Session 1 is waiting', preview: '20 minutes', body: ['Hi,', '{{workout}} takes about {{minutes}} minutes.'], cta: 'Start' },
      day3Tip: { subject: 'Slow is strong', preview: 'One tip', body: ['Hi,', 'Take three seconds to lower on every rep this week.'], cta: 'Open app' },
      trialEnding: {
        subject: 'Trial ends {{date}}',
        preview: 'Heads-up',
        body: ['Hi,', 'Your trial ends on {{date}}. Then {{price}} for {{plan}}.'],
        cta: 'Manage',
      },
      weeklySummary: {
        subject: 'Week: {{done}}/{{goal}}',
        preview: 'Recap',
        body: ['This week: {{done}}/{{goal}} sessions{{highlight}}.', '{{nextLine}}'],
        cta: 'Progress',
      },
      inactive5d: { subject: 'Checking in', preview: 'Your plan is waiting', body: ['Hi,', '{{workout}} is next whenever you are ready.'], cta: 'Continue' },
    },
  },

  offer: {
    currency: 'eur',
    plans: [{ id: 'monthly', label: 'Monthly', interval: 'month', priceCents: 999, stripeLookupKey: 'nova_monthly_v1', trialDays: 0 }],
    oneTime: { enabled: true, programId: 'base', label: 'Base program, lifetime access', priceCents: 2499, stripeLookupKey: 'nova_base_once_v1' },
    pastDueGraceDays: 3,
    cancel: {
      reasons: [
        { id: 'price', label: 'Too expensive', offer: 'discount' },
        { id: 'time', label: 'No time right now', offer: 'pause' },
        { id: 'other', label: 'Other', offer: 'none' },
      ],
      pauseMonths: 1,
      discount: { percent: 30, months: 3 },
    },
    upsell: { monthlyToAnnualAfterDays: 60 },
  },

  programs: [
    {
      id: 'base',
      name: 'Nova Method: Base',
      shortName: 'Base',
      tagline: 'Bodyweight strength in 20 minutes.',
      location: 'home',
      level: 'all',
      equipment: 'No equipment',
      outcomes: ['More push-ups and longer holds than in week 1.', 'A 20-minute routine you can do anywhere.'],
      next: 'bands',
      phases: [
        {
          id: 'base',
          name: 'Base',
          summary: 'Control first. Slow lowering on every rep.',
          weeks: 4,
          workouts: [
            {
              id: 'lower',
              name: 'Lower',
              focus: 'Legs · Glutes',
              minutes: 20,
              exercises: [
                ex('air-squat', 3, [12, 15], 45),
                ex('split-squat', 3, [8, 10], 45),
                ex('glute-bridge', 3, [12, 15], 45),
                ex('wall-sit', 2, [30, 45], 45, true),
              ],
            },
            {
              id: 'upper',
              name: 'Upper',
              focus: 'Chest · Shoulders · Back',
              minutes: 20,
              exercises: [
                ex('push-up', 3, [6, 10], 60),
                ex('pike-push-up', 3, [5, 8], 60),
                ex('superman', 3, [20, 30], 45),
                ex('plank', 2, [30, 45], 45, true),
              ],
            },
            {
              id: 'full',
              name: 'Full body',
              focus: 'Everything',
              minutes: 20,
              exercises: [
                ex('single-leg-hip-thrust', 3, [8, 12], 45),
                ex('air-squat', 3, [15, 20], 45),
                ex('push-up', 2, [6, 10], 60),
                ex('dead-bug', 2, [8, 10], 30, true),
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bands',
      name: 'Nova Method: Bands',
      shortName: 'Bands',
      tagline: 'Add one resistance band, keep the 20 minutes.',
      location: 'home',
      level: 'intermediate',
      equipment: 'One long resistance band + a mini band',
      outcomes: ['Stronger posterior chain with minimal kit.', 'Harder sessions, same time budget.'],
      phases: [
        {
          id: 'bands',
          name: 'Bands',
          summary: 'Constant tension. Pause at the hardest point.',
          weeks: 4,
          workouts: [
            {
              id: 'pull-hinge',
              name: 'Pull & Hinge',
              focus: 'Back · Hamstrings',
              minutes: 20,
              exercises: [
                ex('banded-rdl', 3, [12, 15], 45),
                ex('band-pulldown', 3, [12, 15], 45),
                ex('band-pull-apart', 3, [15, 20], 30),
                ex('side-plank', 2, [20, 30], 30, true),
              ],
            },
            {
              id: 'glutes',
              name: 'Glutes',
              focus: 'Glutes',
              minutes: 20,
              exercises: [
                ex('banded-kickback', 3, [15, 20], 30),
                ex('seated-band-abduction', 3, [20, 25], 30),
                ex('frog-pump', 3, [20, 25], 30),
                ex('lying-leg-raise', 2, [10, 12], 30, true),
              ],
            },
            {
              id: 'mobility',
              name: 'Strength & Control',
              focus: 'Full body',
              minutes: 20,
              optional: true,
              exercises: [ex('split-squat', 3, [10, 12], 45), ex('push-up', 3, [8, 12], 60), ex('dead-bug', 2, [10, 12], 30)],
            },
          ],
        },
      ],
    },
  ],

  quiz: {
    questions: [
      {
        id: 'goal',
        prompt: 'What do you want most?',
        options: [
          { id: 'strength', label: 'Get stronger' },
          { id: 'routine', label: 'A routine I keep' },
          { id: 'energy', label: 'More energy' },
        ],
      },
      {
        id: 'experience',
        prompt: 'Your training experience?',
        options: [
          { id: 'none', label: 'None yet' },
          { id: 'some', label: 'Some' },
          { id: 'lots', label: 'A lot' },
        ],
      },
      {
        id: 'location',
        prompt: 'Where will you train?',
        options: [
          { id: 'home', label: 'At home' },
          { id: 'outside', label: 'Outdoors' },
        ],
      },
      {
        id: 'days',
        prompt: 'Sessions per week?',
        options: [
          { id: '2', label: '2' },
          { id: '3', label: '3' },
          { id: '4', label: '4' },
        ],
      },
    ],
    schedules: { '2': ['tue', 'sat'], '3': ['mon', 'wed', 'sat'], '4': ['mon', 'tue', 'thu', 'sat'] },
    rules: [{ when: { experience: ['lots'] }, program: 'bands' }],
    defaultProgram: 'base',
    shortSessionAnswers: [],
  },

  features: { challenges: false, nutrition: false, progressPhotos: false },
  results: [],
  messages: [{ week: '2026-10-12', title: 'Slow is strong', body: 'Three seconds down on every rep this week.' }],
  exerciseOverrides: {
    'push-up': { cues: ['Hands under shoulders', 'Lower for three seconds', 'Knees down is a valid option'] },
  },

  legal: {
    contractPartner: 'operator',
    operator: { name: '[Operator name / company]', address: ['[Street and number]', '[Postcode City]', 'Germany'], email: 'legal@nova.example.com' },
    ageConfirmLabel: 'I am 18 or older.',
    withdrawalConsentLabel: 'Start my access now. I understand I lose my 14-day right of withdrawal once it has started.',
    lastUpdated: '2026-10-16',
    draft: true,
  },
});
