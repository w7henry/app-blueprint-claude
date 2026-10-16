# Activation: vom Kauf zum ersten Workout

## Ziel

Jede neue Käuferin schließt innerhalb von **24 Stunden** ihr erstes Workout ab.

## Warum

Wer früh trainiert, bleibt. Wer nach dem Kauf nichts tut, kündigt oder will sein Geld zurück.
Die Zeit direkt nach dem Kauf ist der Moment mit der höchsten Motivation. Er darf nicht mit Setup verschwendet werden.

## Muss

- **Quiz-Daten übernehmen.** Nichts aus dem Quiz wird noch einmal abgefragt.
- Nach dem Kauf: kurzer Welcome-Screen der Creatorin (Video bis ca. 30 Sekunden oder Foto plus 2–3 Sätze in ihrer Stimme),
  dann direkt „Your first workout“. **Maximal 3 Taps**, bis das Workout läuft.
- Ist heute laut Plan kein Trainingstag: zwei Optionen, „Start now anyway“ oder „Schedule it“ (Tag wählen, Erinnerung setzen).
- Push-Erlaubnis **nicht** beim ersten Öffnen abfragen, sondern mit Kontext
  („Want me to remind you on Mon, Wed and Fri?“). Wird abgelehnt: Kalendereintrag (.ics) als Alternative.
- Nach dem ersten Workout: Feier-Screen mit einer konkreten Zahl
  („Hip thrust: 40 kg × 10. That's your starting point.“) und Ausblick auf das nächste Workout.
- Erst **nach** dem ersten Workout: Hinweis zur Installation (App Store oder „Add to Home Screen“).
- E-Mail-Sequenz:
  - Tag 0: Willkommen und Login-Link
  - Nach 24 h ohne Workout: kurze, persönliche Erinnerung in der Stimme der Creatorin
  - Tag 3: ein hilfreicher Tipp (Technik oder Gewichtswahl)

## Freiraum

- Video oder Text beim Welcome.
- Ob Startfotos oder Maße angeboten werden (optional, privat, siehe `retention.md` und `legal.md`).
- Gestaltung des Feier-Screens.

## Nicht machen

- Lange Profil-Formulare, Tutorials mit 5+ Slides, Tour durch alle Features.
- Den ersten Screen mit Optionen überladen. Es gibt genau eine Aufgabe: das erste Workout.

## Fertig wenn

- [ ] Quiz-Antworten landen ohne erneute Eingabe im Profil.
- [ ] Vom Kauf bis zum ersten Satz sind es höchstens 3 Taps.
- [ ] Die Erinnerungs-Mail geht nur raus, wenn wirklich noch kein Workout abgeschlossen wurde.
- [ ] Die Aktivierungsrate (erstes Workout innerhalb von 24 h) ist im Dashboard sichtbar.

## Events

`onboarding_started`, `welcome_viewed`, `first_workout_started`, `first_workout_completed`,
`workout_scheduled`, `push_prompt_shown`, `push_permission_result`, `install_prompt_shown`, `install_accepted`,
`activation_email_sent`
