# Workout-Erlebnis: der Kern der App

## Ziel

Training ohne Nachdenken. **Jede Session hinterlässt eine Zahl**, und die App sagt, was beim nächsten Mal zu tun ist.

## Warum

Das ist der Teil, den ein PDF nicht kann: automatische Progression, gespeicherte Werte, sichtbarer Fortschritt.
Wenn sich das Training in der App schlechter anfühlt als ein Zettel, kündigt sie.

## Muss

### Home: „Today“

- Genau ein Haupt-CTA: das heutige Workout.
- Ruhetag: freundlicher Hinweis plus optionale Alternative (Spaziergang, Mobility).
- Verpasste Workouts: Der Plan verschiebt sich. Keine roten „Missed“-Markierungen, sondern „Pick up where you left off“.

### Workout-Player

- Eine Übung pro Screen mit Demo-Video oder Loop, Sätzen, Wiederholungsbereich und 2–3 Technik-Cues.
- Pro Satz Gewicht und Wiederholungen über **große Stepper**, vorbefüllt mit dem letzten Wert.
- Satz abhaken → Pausentimer startet automatisch.
  Der Timer basiert auf Zeitstempeln und stimmt auch, wenn der Bildschirm aus war oder die App im Hintergrund lief.
- Übung tauschen: Alternativen kommen aus den Daten (z. B. „No Smith machine?“).
- Logging ist optional. Ein Satz lässt sich auch ohne Werte abhaken.
- Bildschirm bleibt während des Workouts an (Wake Lock, wo unterstützt).
- Einheiten **kg oder lbs** in den Einstellungen (englischsprachige Zielgruppe).

### Progression

- Standard ist Double Progression:
  Erreicht sie in allen Sätzen das obere Ende des Bereichs, schlägt die App beim nächsten Mal mehr Gewicht vor
  (Inkrement pro Übung aus den Daten). Sonst gleiches Gewicht, Ziel mehr Wiederholungen.
- Der Vorschlag ist sichtbar und begründet („Last time: 40 kg × 10, 10, 10 → try 42.5 kg today“).
- Phasen des Programms (z. B. Foundation, Build, Peak) kommen aus den Daten und können Sätze und Intensität ändern.

### Abschluss

- Dauer, abgeschlossene Sätze, neue Bestleistungen, nächstes Workout.

### Offline

- Ein Workout läuft komplett ohne Netz (Gyms haben oft keinen Empfang).
  Daten werden lokal gespeichert und später synchronisiert, ohne Duplikate.

## Freiraum

- Visuelle Gestaltung des Players, Gesten (z. B. Wischen zwischen Übungen), Haptik und Sound.
- Wie Warm-ups eingebunden werden.
- Darstellung von Bestleistungen.

## Nicht machen

- Pflichtfelder beim Loggen.
- Social Feed, Leaderboards, Badges für alles.
- Kleine Eingabefelder, die eine Tastatur brauchen, wo ein Stepper reicht.

## Fertig wenn

- [ ] Ein komplettes Workout ist einhändig bedienbar.
- [ ] Der Pausentimer stimmt nach 2 Minuten mit ausgeschaltetem Bildschirm.
- [ ] Ein Offline-Workout synchronisiert danach korrekt und ohne Duplikate.
- [ ] Unit-Tests für die Progressionslogik, inklusive Grenzfälle (Satz übersprungen, Übung getauscht, Einheit gewechselt).

## Events

`workout_started`, `set_logged`, `exercise_swapped`, `rest_timer_skipped`, `workout_completed` (Dauer, Sätze),
`pr_achieved` (Übung), `workout_abandoned` (bei welcher Übung)
