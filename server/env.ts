// Server configuration. Missing required variables stop the server at start
// with a clear list instead of failing on the first request.

export interface Env {
  port: number;
  creatorSlug: string;
  appUrl: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeTax: boolean;
  resendApiKey: string;
  emailFrom: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  cronSecret: string;
  allowedOrigins: string[];
  serveStatic: boolean;
}

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'PUBLIC_APP_URL',
] as const;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const missing = REQUIRED.filter((k) => !source[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables:\n${missing.map((m) => `  • ${m}`).join('\n')}\nSee .env.example.`);
  }
  const appUrl = source.PUBLIC_APP_URL!.replace(/\/$/, '');
  return {
    port: Number(source.PORT ?? 8787),
    creatorSlug: source.CREATOR_SLUG ?? 'ayria',
    appUrl,
    supabaseUrl: source.SUPABASE_URL!,
    supabaseServiceKey: source.SUPABASE_SERVICE_ROLE_KEY!,
    stripeSecretKey: source.STRIPE_SECRET_KEY!,
    stripeWebhookSecret: source.STRIPE_WEBHOOK_SECRET!,
    stripeTax: source.STRIPE_TAX === 'true',
    resendApiKey: source.RESEND_API_KEY!,
    emailFrom: source.EMAIL_FROM!,
    vapidPublicKey: source.VAPID_PUBLIC_KEY ?? '',
    vapidPrivateKey: source.VAPID_PRIVATE_KEY ?? '',
    cronSecret: source.CRON_SECRET ?? '',
    allowedOrigins: (source.ALLOWED_ORIGINS ?? appUrl)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    serveStatic: source.SERVE_STATIC !== 'false',
  };
}
