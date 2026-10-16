// Express app: API + (optionally) the built frontend from dist/, so one Railway
// service per creator serves everything from one origin.

import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type Stripe from 'stripe';
import { handleStripeEvent } from './billing';
import type { Ctx } from './context';
import { runJob } from './jobs/run-jobs';
import { memberRoutes } from './routes/member';
import { publicRoutes } from './routes/public';

export function createApp(ctx: Ctx) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const origin = req.headers.origin;
    if (origin && ctx.env.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Stripe needs the raw body for the signature check — before express.json().
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    let event: Stripe.Event;
    try {
      event = ctx.stripe.webhooks.constructEvent(req.body as Buffer, String(req.headers['stripe-signature'] ?? ''), ctx.env.stripeWebhookSecret);
    } catch (e) {
      res.status(400).send(`Webhook signature error: ${(e as Error).message}`);
      return;
    }
    try {
      await handleStripeEvent(ctx, event);
      res.json({ received: true });
    } catch (e) {
      console.error('[webhook]', event.type, (e as Error).message);
      res.status(500).json({ error: 'processing failed' }); // Stripe retries
    }
  });

  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, creator: ctx.creator.identity.slug });
  });

  // Cron entry point for Railway (or any scheduler): POST /api/jobs/daily with the CRON_SECRET.
  app.post('/api/jobs/:job', async (req, res) => {
    if (!ctx.env.cronSecret || req.headers.authorization !== `Bearer ${ctx.env.cronSecret}`) {
      res.sendStatus(401);
      return;
    }
    const job = String(req.params.job);
    if (!['hourly', 'daily', 'weekly'].includes(job)) {
      res.sendStatus(404);
      return;
    }
    res.json(await runJob(ctx, job as 'hourly' | 'daily' | 'weekly'));
  });

  app.use('/api', publicRoutes(ctx));
  app.use('/api', memberRoutes(ctx));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Frontend (built with the same CREATOR_SLUG).
  const dist = path.resolve('dist');
  if (ctx.env.serveStatic && fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, file) {
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "font-src 'self'",
      `connect-src 'self' ${new URL(ctx.env.supabaseUrl).origin}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    app.get(/.*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Security-Policy', csp);
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
