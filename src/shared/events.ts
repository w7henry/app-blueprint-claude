// Event catalog (blueprint/analytics.md). Server rejects names not listed here.
// Naming: object_action, past tense, snake_case.

export const EVENTS = [
  // Conversion
  'landing_viewed',
  'cta_clicked',
  'quiz_started',
  'quiz_answered',
  'quiz_completed',
  'email_submitted',
  'plan_revealed',
  // Paywall
  'paywall_viewed',
  'plan_selected',
  'checkout_started',
  'purchase_completed',
  'trial_started',
  'trial_converted',
  'payment_failed',
  'cancel_flow_started',
  'cancel_reason_selected',
  'save_offer_accepted',
  'subscription_canceled',
  'subscription_upgraded',
  // Activation
  'onboarding_started',
  'welcome_viewed',
  'first_workout_started',
  'first_workout_completed',
  'workout_scheduled',
  'push_prompt_shown',
  'push_permission_result',
  'install_prompt_shown',
  'install_accepted',
  'activation_email_sent',
  // Workout
  'workout_started',
  'set_logged',
  'exercise_swapped',
  'rest_timer_skipped',
  'workout_completed',
  'pr_achieved',
  'workout_abandoned',
  // Retention
  'progress_viewed',
  'photo_added',
  'weekly_summary_sent',
  'weekly_summary_opened',
  'program_completed',
  'next_program_started',
  'challenge_joined',
  'share_card_created',
  'share_card_shared',
  'reminder_sent',
  'reminder_opened',
  'reengagement_sent',
  'app_opened',
  // Added with this build (documented in the catalog in blueprint/analytics.md → docs/EVENTS.md)
  'login_link_requested',
  'settings_changed',
  'account_deleted',
] as const;

export type EventName = (typeof EVENTS)[number];

/** Events only the server may write (Stripe webhooks / jobs are the truth). */
export const SERVER_ONLY_EVENTS: ReadonlySet<string> = new Set([
  'purchase_completed',
  'trial_started',
  'trial_converted',
  'payment_failed',
  'subscription_canceled',
  'subscription_upgraded',
  'activation_email_sent',
  'weekly_summary_sent',
  'reminder_sent',
  'reengagement_sent',
  'account_deleted',
]);

export type EventProps = Record<string, string | number | boolean | null>;

const PII_KEYS = new Set([
  'email',
  'mail',
  'phone',
  'name',
  'first_name',
  'last_name',
  'full_name',
  'address',
  'body_weight',
  'bodyweight',
  'photo',
  'photo_url',
  'password',
  'token',
]);
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/** Removes anything that could be personal data. Applied on client and server. */
export function scrubProps(props: EventProps | undefined): EventProps {
  const out: EventProps = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props).slice(0, 20)) {
    if (PII_KEYS.has(k.toLowerCase())) continue;
    if (typeof v === 'string') {
      if (EMAIL_VALUE.test(v)) continue;
      out[k.slice(0, 40)] = v.slice(0, 120);
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      out[k.slice(0, 40)] = v;
    }
  }
  return out;
}

export function isEventName(s: string): s is EventName {
  return (EVENTS as readonly string[]).includes(s);
}
