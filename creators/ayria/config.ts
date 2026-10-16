// Creator: Ayria Rutledge (@ayria_rutledge)
// Research and reasoning: docs/CREATOR_RESEARCH.md
//
// DRAFT STATUS — before going live:
//  - voice.samples, story and welcome copy are written from public info. Ayria approves or rewrites them.
//  - Images: drop her own photos into public/creators/ayria/ (hero.jpg, welcome.jpg, story.jpg, avatar.jpg).
//    Until then, her public TikTok/Instagram profile picture is loaded via unavatar.io (pitch/demo only).
//  - legal.operator: fill in your real operator data; legal texts need a lawyer's review (legal.draft).

import { defineCreator } from '../schema';
import { foundations, growth, home } from './programs';

const profilePhoto = ['https://unavatar.io/tiktok/ayria_rutledge?fallback=false', 'https://unavatar.io/instagram/ayria_rutledge?fallback=false'];

export default defineCreator({
  identity: {
    name: 'Ayria Rutledge',
    firstName: 'Ayria',
    handle: '@ayria_rutledge',
    slug: 'ayria',
    appName: 'Glute Era',
    domain: 'ayria.example.com',
    supportEmail: 'support@ayria.example.com',
    socials: [
      { platform: 'tiktok', url: 'https://www.tiktok.com/@ayria_rutledge', label: 'TikTok' },
      { platform: 'instagram', url: 'https://www.instagram.com/ayria_rutledge/', label: 'Instagram' },
      { platform: 'youtube', url: 'https://www.youtube.com/@ayriarutledge', label: 'YouTube' },
    ],
  },

  brand: {
    base: 'light',
    colors: {
      bg: '#F7F1EA',
      surface: '#FFFFFF',
      text: '#1C1512',
      muted: '#675A51',
      line: '#E7DCD0',
      accent: '#8C2335',
      accentContrast: '#FFFFFF',
    },
    fonts: {
      display: {
        family: 'Instrument Serif',
        fallback: 'Georgia, "Times New Roman", serif',
        imports: ['@fontsource/instrument-serif/latin-400.css', '@fontsource/instrument-serif/latin-400-italic.css'],
        weight: 400,
        letterSpacing: '-0.015em',
      },
      ui: {
        family: 'Inter Variable',
        fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        imports: ['@fontsource-variable/inter/wght.css'],
        weight: 400,
        letterSpacing: '-0.005em',
      },
    },
    radius: { card: 22, button: 999 },
    logo: { text: 'Glute Era' },
    images: {
      hero: { src: '/creators/ayria/hero.jpg', fallbacks: profilePhoto, alt: 'Ayria Rutledge', focus: '50% 22%' },
      welcome: { src: '/creators/ayria/welcome.jpg', fallbacks: profilePhoto, alt: 'Ayria Rutledge', focus: '50% 25%' },
      story: { src: '/creators/ayria/story.jpg', fallbacks: profilePhoto, alt: 'Ayria at the gym', focus: '50% 30%' },
      avatar: { src: '/creators/ayria/avatar.jpg', fallbacks: profilePhoto, alt: 'Ayria', focus: '50% 30%' },
    },
  },

  voice: {
    tone: 'Big-sister energy: warm, hype, honest. Short sentences, casual, never preachy. Talks about strength and confidence, never about “fixing” bodies.',
    greeting: 'Hey!',
    signOff: '— Ayria',
    // DRAFT — replace with real lines from her videos.
    samples: [
      'Everyone starts somewhere. I started at 13 with zero clue.',
      'Hip thrusts are the GOAT for glutes. Squeeze at the top, every single rep.',
      'Clean reps first, then we add weight.',
      'Missed a day? Who cares. Just show up for the next one.',
      'Your glutes grow when you rest, not just when you lift.',
      'Headphones in, plan open, own your corner of the gym.',
      'We’re not chasing perfect. We’re chasing a little stronger than last week.',
    ],
  },

  copy: {
    meta: {
      title: 'Glute Era by Ayria Rutledge: your 8-week glute plan',
      description: 'A glute-focused gym plan from @ayria_rutledge. Take the 60-second quiz and see your personal plan.',
    },
    landing: {
      eyebrow: 'Glute Era by @ayria_rutledge',
      headline: 'Your glute era starts here.',
      promise: '8 weeks. 3 workouts a week. Built for the gym.',
      cta: 'Find my plan',
      ctaNote: '60-second quiz · no account needed',
      benefitsTitle: 'What you get',
      benefits: [
        {
          title: 'A plan made for you',
          body: 'Your goal, your days, your gym or your living room. You know exactly what to do before you walk in.',
          screen: 'plan',
        },
        { title: 'Every set, laid out', body: 'A demo, three quick cues and the weight to use. No standing around wondering what’s next.', screen: 'player' },
        { title: 'Watch your numbers climb', body: 'The app remembers every lift and tells you when it’s time to go heavier.', screen: 'progress' },
        { title: 'Me, in your pocket', body: 'A note from me every week and reminders on your training days. Never a guilt trip.', screen: 'today' },
      ],
      stepsTitle: 'How it works',
      steps: [
        { title: 'Take the quiz', body: 'Six quick taps about your goal, experience and schedule.' },
        { title: 'See your plan', body: 'Your program, your training days and week 1, before you pay anything.' },
        { title: 'Train and level up', body: 'Open the app at the gym, follow along, log your sets. It does the math.' },
      ],
      story: {
        title: 'Hey, I’m Ayria.',
        paragraphs: [
          'I started lifting at 13. I had no idea what I was doing. I copied people and hoped for the best.',
          'A lot of trial and error later, I know what actually works for glutes: a few great lifts, done well, getting a little heavier over time.',
          'Glute Era is exactly that, written down for you. The plan I wish I’d had on day one.',
        ],
      },
      finalCta: {
        headline: 'Your first workout could be tomorrow.',
        body: 'Take the 60-second quiz and see your plan. No account, no card needed to look.',
      },
      healthNote: 'Talk to your doctor before you start if you’re pregnant, injured or have a medical condition. Stop if something hurts.',
    },
    faq: [
      {
        q: 'Will I get bulky?',
        a: 'Not from this. Getting “bulky” takes years of training and eating specifically for it. This plan is about getting stronger and building shape at your own pace.',
      },
      {
        q: 'Gym or home?',
        a: 'Both work. You pick in the quiz. The gym plans use machines and free weights; the home plan only needs a pair of dumbbells and a mini band.',
      },
      {
        q: 'I’m a total beginner. Is this for me?',
        a: 'Yes, Foundations is built exactly for you. Every exercise has a demo and three simple cues, and the app suggests your starting weights.',
      },
      {
        q: 'How do I cancel?',
        a: 'In the app: Settings → Membership → Cancel membership. No emails, no calls. You keep access until the end of the period you paid for.',
      },
      {
        q: 'I’m under 18. Can I join?',
        a: 'You’ll need a parent or guardian to OK the purchase. Show them your plan. It’s built around good technique and slow, steady progress.',
      },
    ],
    quiz: {
      interstitials: [
        {
          after: 'experience',
          title: 'Love that.',
          body: 'Everyone starts somewhere. I started at 13 with zero clue what a hip thrust even was. Your plan meets you exactly where you are.',
        },
      ],
      email: {
        title: 'Where should I send your plan?',
        body: 'I’ll email you a link so you can come back to it anytime.',
        button: 'Show my plan',
        marketingConsent: 'Also send me tips, new programs and offers from Ayria. Unsubscribe anytime.',
        privacyNote: 'We only use your email for your plan and your account.',
      },
      building: ['Matching your goal and experience…', 'Picking your training days…', 'Lining up week 1…'],
    },
    reveal: {
      title: 'Your plan is ready.',
      outcomesTitle: 'What can honestly change in {{weeks}} weeks',
      cta: 'Start my plan',
      blockerLines: {
        plan: 'Every workout tells you exactly what to do, with a demo and the weight to use. No guessing.',
        anxiety: 'You’ll walk in knowing your next move. Every exercise has a demo, so you never stand around wondering.',
        results: 'The app tracks every lift and tells you when to go heavier. That’s how results actually happen.',
        consistency: 'Weekly goals, not daily streaks. Miss a day and your plan simply moves with you.',
        time: 'Each workout has an end time you can plan around, and finishers you can skip on busy days.',
      },
    },
    paywall: {
      title: 'Unlock {{program}}',
      reassurance: 'Cancel anytime in the app. No emails, no calls.',
      cta: 'Continue',
    },
    welcome: {
      title: 'Welcome to your glute era.',
      body: [
        'I’m so happy you’re here.',
        'Your first workout takes about {{minutes}} minutes. The first one is always the hardest. After that, it’s just what you do.',
      ],
      cta: 'Start your first workout',
    },
    templates: {
      firstWorkoutDone: '{{exercise}}: {{weight}} × {{reps}}. That’s your starting point.',
      workoutDone: 'Workout {{count}} done. Proud of you.',
      restDay: 'Rest day. Your glutes grow when you recover, so a walk or some stretching is a perfect bonus.',
      pickUp: 'Pick up where you left off. {{workout}} is next.',
      emptyProgress: 'Your lifts show up here after your first workout.',
      weeklySummary: 'This week: {{done}}/{{goal}} workouts{{highlight}}.',
      reminderPush: '{{workout}} today, about {{minutes}} min. Let’s go.',
      scheduleAsk: 'Want me to remind you on {{days}}?',
      programDone: 'You finished {{program}}. Look at where you started.',
      cancelConfirm: 'Done. You keep full access until {{date}}. You’re always welcome back.',
    },
    emails: {
      welcome: {
        subject: 'You’re in. Here’s your login link',
        preview: 'Your first workout is waiting',
        body: [
          'Hey!',
          'I’m so happy you’re here. Your plan is {{program}}, and your first workout takes about {{minutes}} minutes.',
          'Tap below to log in. No password needed.',
        ],
        cta: 'Open my plan',
      },
      planReady: {
        subject: 'Your Glute Era plan',
        preview: 'Here’s the plan you built',
        body: ['Hey!', 'Here’s the plan you just built: {{program}}, on {{days}}.', 'Come back to it anytime with the link below.'],
        cta: 'See my plan',
      },
      confirmMarketing: {
        subject: 'Confirm you want my emails',
        preview: 'One tap and you’re on the list',
        body: ['Hey!', 'You asked for tips, new programs and offers from me. Tap below to confirm.', 'If that wasn’t you, just ignore this email.'],
        cta: 'Yes, sign me up',
      },
      noWorkout24h: {
        subject: 'Quick one from me',
        preview: 'Your first workout is still waiting',
        body: [
          'Hey!',
          'You haven’t done your first workout yet. Totally normal, starting is the hardest part.',
          'It’s {{workout}}, about {{minutes}} minutes. Open it and do the first exercise. That’s it.',
        ],
        cta: 'Start workout 1',
      },
      day3Tip: {
        subject: 'How to pick the right weight',
        preview: 'The one tip I wish I’d known at the start',
        body: [
          'Hey!',
          'Pick a weight where the last two reps feel hard but your form stays clean.',
          'When you hit the top of the rep range on every set, the app tells you to go up. Trust it.',
        ],
        cta: 'Open the app',
      },
      trialEnding: {
        subject: 'Your free week ends on {{date}}',
        preview: 'Just a heads-up, no action needed',
        body: [
          'Hey!',
          'Your free trial ends on {{date}}. After that you’ll be charged {{price}} for {{plan}}.',
          'If it’s not for you, cancel in the app before then: Settings → Membership → Cancel membership. No hard feelings.',
        ],
        cta: 'Manage membership',
      },
      weeklySummary: {
        subject: 'Your week: {{done}}/{{goal}} workouts',
        preview: 'Your weekly recap',
        body: ['Hey!', 'This week: {{done}}/{{goal}} workouts{{highlight}}.', '{{nextLine}}'],
        cta: 'See my progress',
      },
      inactive5d: {
        subject: 'No pressure, just checking in',
        preview: 'Your plan didn’t go anywhere',
        body: ['Hey, it’s been a few days. Life happens!', 'Your plan didn’t go anywhere. {{workout}} is next, and you pick up right where you left off.'],
        cta: 'Pick up where I left off',
      },
    },
  },

  offer: {
    currency: 'usd',
    plans: [
      {
        id: 'annual',
        label: 'Yearly',
        interval: 'year',
        priceCents: 5999,
        stripeLookupKey: 'ayria_annual_v1',
        trialDays: 7,
        highlight: true,
        badge: 'Best value',
      },
      { id: 'monthly', label: 'Monthly', interval: 'month', priceCents: 1299, stripeLookupKey: 'ayria_monthly_v1', trialDays: 0 },
    ],
    oneTime: { enabled: false, programId: 'foundations', label: 'Foundations only (8 weeks)', priceCents: 3999, stripeLookupKey: 'ayria_foundations_once_v1' },
    pastDueGraceDays: 3,
    cancel: {
      reasons: [
        { id: 'price', label: 'It’s too expensive for me', offer: 'discount' },
        { id: 'time', label: 'I don’t have time right now', offer: 'pause' },
        { id: 'fit', label: 'The program isn’t right for me', offer: 'switch' },
        { id: 'injury', label: 'Injury or health reasons', offer: 'pause' },
        { id: 'other', label: 'Something else', offer: 'none' },
      ],
      pauseMonths: 1,
      discount: { percent: 50, months: 2 },
    },
    upsell: { monthlyToAnnualAfterDays: 60 },
  },

  programs: [foundations, growth, home],

  quiz: {
    questions: [
      {
        id: 'goal',
        prompt: 'What’s your #1 goal right now?',
        options: [
          { id: 'glutes', label: 'Grow my glutes' },
          { id: 'strength', label: 'Get stronger overall' },
          { id: 'confidence', label: 'Feel toned and confident' },
          { id: 'habit', label: 'Make the gym a habit' },
        ],
      },
      {
        id: 'experience',
        prompt: 'How long have you been lifting?',
        options: [
          { id: 'new', label: 'I’m brand new' },
          { id: 'under6', label: 'Less than 6 months' },
          { id: 'six12', label: '6–12 months' },
          { id: 'year', label: 'More than a year' },
        ],
      },
      {
        id: 'location',
        prompt: 'Where will you train?',
        options: [
          { id: 'gym', label: 'At the gym', hint: 'Machines, cables, free weights' },
          { id: 'home', label: 'At home', hint: 'A pair of dumbbells + a mini band' },
        ],
      },
      {
        id: 'days',
        prompt: 'How many days a week can you realistically train?',
        help: 'Be honest. Consistency beats ambition.',
        options: [
          { id: '2', label: '2 days' },
          { id: '3', label: '3 days' },
          { id: '4', label: '4 days' },
        ],
      },
      {
        id: 'session',
        prompt: 'How long can a workout be?',
        options: [
          { id: 'short', label: '30–45 minutes' },
          { id: 'normal', label: '45–60 minutes' },
          { id: 'long', label: 'An hour or more' },
        ],
      },
      {
        id: 'blocker',
        prompt: 'What’s held you back so far?',
        options: [
          { id: 'plan', label: 'Not knowing what to do' },
          { id: 'anxiety', label: 'Feeling awkward at the gym' },
          { id: 'results', label: 'Not seeing results' },
          { id: 'consistency', label: 'Staying consistent' },
          { id: 'time', label: 'Not enough time' },
        ],
      },
    ],
    schedules: {
      '2': ['mon', 'thu'],
      '3': ['mon', 'wed', 'fri'],
      '4': ['mon', 'tue', 'thu', 'fri'],
    },
    rules: [
      { when: { location: ['home'] }, program: 'home' },
      { when: { experience: ['six12', 'year'] }, program: 'growth' },
      {
        when: { experience: ['new', 'under6'], days: ['4'] },
        program: 'foundations',
        scheduleAs: '3',
        note: 'You said 4 days. I’m starting you on 3, and day 4 can be a long walk. Your glutes grow while you recover.',
      },
    ],
    defaultProgram: 'foundations',
    shortSessionAnswers: ['short'],
  },

  features: { challenges: false, nutrition: false, progressPhotos: false },

  // No real, consented results yet → the landing page hides the section.
  results: [],

  messages: [
    {
      week: '2026-10-12',
      title: 'Week one energy',
      body: 'If this is your first week: just show up. You don’t need to be good at it yet. Log what you lift, even if it feels light. That’s your baseline.',
    },
    {
      week: '2026-10-19',
      title: 'The squeeze matters',
      body: 'On every hip thrust this week, hold the top for a full second. Lighter weight with a real squeeze beats a heavy half rep.',
    },
    {
      week: '2026-10-26',
      title: 'Bad days count',
      body: 'Some days you’ll feel weak. Do the workout anyway, even lighter. Bad days you show up for are the ones that build the habit.',
    },
  ],

  exerciseOverrides: {},

  legal: {
    contractPartner: 'operator',
    operator: {
      name: '[Operator name / company]',
      address: ['[Street and number]', '[Postcode City]', 'Germany'],
      email: 'legal@ayria.example.com',
    },
    ageConfirmLabel: 'I’m 18 or older, or my parent/guardian agreed to this purchase.',
    withdrawalConsentLabel: 'I want my membership to start right away. I understand that I lose my 14-day right of withdrawal once it has started.',
    lastUpdated: '2026-10-16',
    draft: true,
  },
});
