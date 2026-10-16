# Analytics: messen, bevor gebaut wird

## Ziel

Jede wichtige Frage zum Funnel lässt sich mit **einer Abfrage** beantworten.

## Warum

Ohne Daten wird geraten. Bei der letzten App gab es viele Registrierungen, aber kaum Käufe,
und niemand konnte sagen, an welchem Schritt die Leute ausgestiegen sind. Das passiert nicht noch einmal.

## Muss

- Eine eigene Tabelle `events` in Supabase. Kein Google Analytics und keine Drittanbieter-Tracker.
- Schema mindestens:
  `id`, `created_at`, `event_name`, `user_id` (nullable), `anon_id` (nullable), `session_id`, `creator_slug`, `src`, `properties` (jsonb)
- Ein Frontend-Helper `track(event, props)`.
  Kauf- und Abo-Events werden **serverseitig** aus den Stripe-Webhooks geschrieben, denn die sind die Wahrheit.
- Vor dem Login anonyme Events, nach dem Login Verknüpfung mit `user_id`.
  Ob eine anonyme ID im Browser ohne Einwilligung gespeichert werden darf, **rechtlich prüfen** (siehe `legal.md`).
  Fallback: Events vor dem Login nur pro Session, ohne dauerhafte ID.
- **Keine personenbezogenen Inhalte** in `properties`: keine E-Mail-Adressen, keine Fotos, kein Körpergewicht.
- Event-Namen in `snake_case` als `objekt_aktion` in der Vergangenheit (z. B. `workout_completed`).
  Neue Events werden im Katalog unten ergänzt.
- SQL-Views:
  - Funnel: `landing_viewed → quiz_started → quiz_completed → paywall_viewed → purchase_completed`, gesamt und pro `src`
  - Aktivierung: erstes Workout innerhalb von 24 h nach dem Kauf
  - Woche 1 aktiv: mindestens 2 Workouts in den ersten 7 Tagen
  - Kohorten-Retention pro Kaufwoche
  - Umsatz pro Quelle
- Monatlicher Creator-Report: Käufe, Umsatz, Kündigungen, Rev-Share-Betrag. Grundlage für die Abrechnung mit der Creatorin.

## Freiraum

- Darstellung der Zahlen: interne Seite, Supabase-SQL oder einfache Tabelle.
- Batching und Retry-Logik beim Senden der Events.

## Nicht machen

- Events, die bei jedem Re-Render doppelt feuern.
- Tracking-Code, der die Seite verlangsamt oder bei Fehlern die App blockiert.

## Fertig wenn

- [ ] Ein Testdurchlauf von Landing bis erstes Workout erzeugt eine lückenlose Event-Kette.
- [ ] Der Funnel-View zeigt die Conversion pro Schritt.
- [ ] Keine Duplikate bei Reload oder doppeltem Klick.
- [ ] Ein Ausfall des Trackings bricht keinen Nutzer-Flow.

## Event-Katalog

| Bereich | Events |
|---|---|
| Conversion | `landing_viewed`, `cta_clicked`, `quiz_started`, `quiz_answered`, `quiz_completed`, `email_submitted`, `plan_revealed` |
| Paywall | `paywall_viewed`, `plan_selected`, `checkout_started`, `purchase_completed`, `trial_started`, `trial_converted`, `payment_failed`, `cancel_flow_started`, `cancel_reason_selected`, `save_offer_accepted`, `subscription_canceled`, `subscription_upgraded` |
| Activation | `onboarding_started`, `welcome_viewed`, `first_workout_started`, `first_workout_completed`, `workout_scheduled`, `push_prompt_shown`, `push_permission_result`, `install_prompt_shown`, `install_accepted`, `activation_email_sent` |
| Workout | `workout_started`, `set_logged`, `exercise_swapped`, `rest_timer_skipped`, `workout_completed`, `pr_achieved`, `workout_abandoned` |
| Retention | `progress_viewed`, `photo_added`, `weekly_summary_sent`, `weekly_summary_opened`, `program_completed`, `next_program_started`, `challenge_joined`, `share_card_created`, `share_card_shared`, `reminder_sent`, `reminder_opened`, `reengagement_sent`, `app_opened` |
