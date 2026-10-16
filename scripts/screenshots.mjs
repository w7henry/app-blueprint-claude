#!/usr/bin/env node
// Real app screens for the landing page ("What you get"), in the creator's theme.
// Seeds demo data on the device, opens the screens and saves JPEGs to
// public/creators/<slug>/screens/. Needs a running dev server:
//   CREATOR_SLUG=ayria npm run dev      (other terminal)
//   CREATOR_SLUG=ayria npm run screens
// Optional: BASE=http://127.0.0.1:5173 CHROME_PATH=/path/to/chrome

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const slug = process.env.CREATOR_SLUG ?? 'ayria';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const out = path.resolve('public/creators', slug, 'screens');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });

await page.goto(BASE + '/');
await page.evaluate(() => localStorage.clear());
const seed = await page.evaluate((slug) => {
  const DAY = 864e5;
  const now = Date.now();
  const iso = (t) => new Date(t).toISOString();
  const uuid = () => crypto.randomUUID();
  const answers = { goal: 'glutes', experience: 'new', location: 'gym', days: '3', session: 'normal', blocker: 'anxiety' };
  sessionStorage.setItem(`funnel:${slug}`, JSON.stringify({ answers, email: 'demo@example.com', revealSeen: true }));
  localStorage.setItem(
    `demo:subscription:${slug}`,
    JSON.stringify({
      kind: 'subscription',
      status: 'active',
      plan_id: 'annual',
      program_id: null,
      current_period_end: iso(now + 300 * DAY),
      cancel_at_period_end: false,
      trial_end: null,
    }),
  );
  return { answers, now };
}, slug);

// The app creates the profile from the quiz on first open; then add a little history.
await page.goto(BASE + '/app');
await page.waitForSelector('.week-strip', { timeout: 15000 });
await page.evaluate(
  ({ slug }) => {
    const key = `app:${slug}:demo`;
    const d = JSON.parse(localStorage.getItem(key));
    const DAY = 864e5;
    const now = Date.now();
    const started = now - 15 * DAY;
    d.profile.programStartedAt = new Date(started - DAY).toISOString();
    d.profile.remindersAsked = true;
    d.profile.installShown = true;
    const plan = [
      [
        'learn.w1.glutes-hams',
        'glutes-hams',
        'Glutes & Hamstrings',
        [
          ['hip-thrust', 20],
          ['rdl', 20],
        ],
      ],
      ['learn.w1.upper-core', 'upper-core', 'Upper Body & Core', [['lat-pulldown', 20]]],
      [
        'learn.w1.glutes-quads',
        'glutes-quads',
        'Glutes & Quads',
        [
          ['leg-press-wide', 40],
          ['bulgarian-split-squat', 4],
        ],
      ],
      [
        'learn.w2.glutes-hams',
        'glutes-hams',
        'Glutes & Hamstrings',
        [
          ['hip-thrust', 25],
          ['rdl', 22.5],
        ],
      ],
      ['learn.w2.upper-core', 'upper-core', 'Upper Body & Core', [['lat-pulldown', 22.5]]],
      [
        'learn.w2.glutes-quads',
        'glutes-quads',
        'Glutes & Quads',
        [
          ['leg-press-wide', 50],
          ['bulgarian-split-squat', 6],
        ],
      ],
    ];
    d.sessions = [];
    d.sets = [];
    plan.forEach(([slotKey, workoutId, name, lifts], i) => {
      const at = started + i * 2.2 * DAY;
      const id = crypto.randomUUID();
      d.sessions.push({
        id,
        programId: 'foundations',
        slotKey,
        workoutId,
        workoutName: name,
        startedAt: new Date(at).toISOString(),
        completedAt: new Date(at + 2700e3).toISOString(),
        status: 'completed',
        durationSec: 2700,
      });
      for (const [exerciseId, kg] of lifts) {
        for (let s = 0; s < 3; s++) {
          d.sets.push({
            id: crypto.randomUUID(),
            sessionId: id,
            exerciseId,
            slotExerciseId: exerciseId,
            setIndex: s,
            weightKg: kg,
            reps: exerciseId === 'hip-thrust' ? 12 : 12 - s,
            completed: true,
            unit: 'kg',
            range: [10, 12],
            prescribedSets: 3,
            loggedAt: new Date(at + s * 120e3).toISOString(),
          });
        }
      }
    });
    d.active = null;
    localStorage.setItem(key, JSON.stringify(d));
  },
  { slug },
);

async function capture(name, url, ready, prep) {
  await page.goto(BASE + url);
  await page.waitForSelector(ready, { timeout: 15000 });
  await page.addStyleTag({ content: '.demo-banner{display:none!important}' });
  if (prep) await prep();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 72 });
  console.log('✓', name);
}

await capture('plan', '/plan', '.reveal-title');
await capture('today', '/app', '.workout-card');
await capture('progress', '/app/progress', '.chart-card');
await capture('player', '/app', '.workout-card', async () => {
  const start = page.locator('.workout-card .btn').first();
  await start.click();
  await page.waitForSelector('.ex-name');
  await page.evaluate(() => window.scrollTo(0, 230));
});

await browser.close();
console.log(`\nSaved to ${path.relative(process.cwd(), out)}. Restart the dev server so the landing page picks them up.`);
void seed;
