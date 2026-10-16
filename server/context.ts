// Shared clients for the server, created once at start.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { loadCreator, type CreatorBundle } from '../creators';
import { readEnv, type Env } from './env';

export interface Ctx extends CreatorBundle {
  env: Env;
  db: SupabaseClient;
  stripe: Stripe;
  resend: Resend;
}

let ctx: Ctx | null = null;

export function getCtx(): Ctx {
  if (ctx) return ctx;
  const env = readEnv();
  const bundle = loadCreator(env.creatorSlug); // throws with a readable list if the config is broken
  ctx = {
    ...bundle,
    env,
    db: createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    stripe: new Stripe(env.stripeSecretKey),
    resend: new Resend(env.resendApiKey),
  };
  return ctx;
}
