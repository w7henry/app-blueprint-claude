# Event-Katalog (umgesetzt)

Ergänzt `blueprint/analytics.md`. Quelle der Wahrheit im Code: `src/shared/events.ts`.
**S** = nur serverseitig (Stripe-Webhooks/Jobs), **C** = Client über `track()`.

| Event | Wo | Properties |
|---|---|---|
| `landing_viewed` | C · Landing, 1× pro Besuch | `path` |
| `cta_clicked` | C · Hero, Sticky, Final | `location` |
| `quiz_started` | C · erster Quiz-Screen, 1× pro Besuch | – |
| `quiz_answered` | C · jede Antwort | `question`, `answer`, `step` |
| `quiz_completed` | C · letzte Frage, 1× pro Besuch | `program` |
| `email_submitted` | C · E-Mail-Screen | `marketing_consent` (nie die Adresse) |
| `plan_revealed` | C · Reveal, 1× pro Plan | `program`, `days` |
| `paywall_viewed` | C · Paywall, 1× pro Besuch | `program` |
| `plan_selected` | C · Wechsel der Option | `plan` |
| `checkout_started` | C · Checkout-Button | `plan`, `program` |
| `purchase_completed` | **S** · Checkout fertig | `plan`, `program`, `price_cents`, `currency`, `src`, `kw` |
| `trial_started` | **S** | `plan` |
| `trial_converted` | **S** · trialing → active | `plan` |
| `payment_failed` | **S** · invoice.payment_failed | `plan`, `attempt` |
| `cancel_flow_started` | C · Kündigungsseite (S bei öffentlichem Formular) | `reason` / `channel` |
| `cancel_reason_selected` | C | `reason` |
| `save_offer_accepted` | C (+ S bei Pause) | `offer`, `program` |
| `subscription_canceled` | **S** · cancel_at_period_end oder sofort beendet | `plan`, `at_period_end` |
| `subscription_upgraded` | **S** · monatlich → jährlich | `from`, `to` |
| `onboarding_started`, `welcome_viewed` | C · Welcome nach Kauf | `program` |
| `first_workout_started`, `first_workout_completed` | C | `program`, `duration_min` |
| `workout_scheduled` | C · „Schedule it“ / Kalender | `weekday`, `days_ahead` / `method` |
| `push_prompt_shown`, `push_permission_result` | C | `supported` / `result` |
| `install_prompt_shown`, `install_accepted` | C · nach dem ersten Workout | `platform` |
| `activation_email_sent` | **S** · Jobs | `kind` (`no_workout_24h`, `day3_tip`) |
| `workout_started` | C | `program`, `workout`, `week` |
| `set_logged` | C | `exercise`, `set`, `has_values` |
| `exercise_swapped` | C | `from`, `to` |
| `rest_timer_skipped` | C | `exercise`, `remaining_sec` |
| `workout_completed` | C | `program`, `workout`, `duration_min`, `sets` |
| `pr_achieved` | C | `exercise` |
| `workout_abandoned` | C | `program`, `workout`, `exercise_index`, `exercise` |
| `progress_viewed` | C | – |
| `program_completed`, `next_program_started` | C | `program`, `workouts` / `program`, `previous` |
| `share_card_created`, `share_card_shared` | C | `kind`, `method` |
| `weekly_summary_sent` | **S** · Job | `done`, `goal` |
| `weekly_summary_opened`, `reminder_opened` | C · App über `?ref=` geöffnet | – |
| `reminder_sent`, `reengagement_sent` | **S** · Jobs | `channel` / `days_idle` |
| `app_opened` | C · 1× pro Besuch | `ref` |
| `photo_added`, `challenge_joined` | – | vorgesehen, Features per Flag aus |

**Neu in diesem Build:**

| Event | Wo | Warum |
|---|---|---|
| `login_link_requested` | C · Login-Seite | Zeigt Login-Probleme, z. B. wenn Leute die Mail nicht finden |
| `settings_changed` | C · Einstellungen | `setting`, `value` (Einheit, Tage, Erinnerungen) |
| `account_deleted` | **S** | Für die Löschquote, ohne Personenbezug |

Garantien: kein Event doppelt bei Reload oder Doppel-Tap (Once-Keys plus Client-UUID als Primärschlüssel), keine personenbezogenen Daten (`scrubProps` auf Client und Server), Tracking-Fehler blockieren nie einen Flow.
