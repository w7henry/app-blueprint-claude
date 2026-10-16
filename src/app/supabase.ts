// Supabase client, loaded only inside the app (never on the landing page).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import creator from '../creator';
import { DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/env';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (DEMO) throw new Error('Supabase is not configured (demo mode)');
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: `sb-${creator.identity.slug}`,
    },
  });
  return client;
}
