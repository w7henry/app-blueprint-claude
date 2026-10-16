# Retention: warum sie im Abo bleibt

## Ziel

Nutzerinnen **sehen ihren Fortschritt**, **spüren die Creatorin** und haben **immer einen nächsten Schritt**.

## Warum

Ein Abo wird gekündigt, sobald es sich nicht mehr lohnt oder sie vergessen hat, warum sie es hat.
Jede Säule unten beantwortet eine dieser Fragen.

## Muss

### 1. Sichtbarer Fortschritt

- Verlauf der Hauptübungen als einfacher Graph pro Übung, dazu eine Liste der Bestleistungen.
- **Wochen-Streak** statt Tages-Streak: Eine Woche zählt, wenn das Wochenziel erreicht wurde. Ein verpasster Tag bricht nichts.
- Optionaler Fotovergleich (z. B. Woche 1, 3, 6) nebeneinander, **privat** (siehe `legal.md`).
- Wochenrückblick in der App und per E-Mail: „This week: 3/3 workouts, hip thrust +5 kg.“

### 2. Immer ein nächster Schritt

- Programme haben ein Enddatum.
- Eine Woche vor Ende: Vorschau auf das nächste Programm.
- Programmende ist ein großer Moment: Start vs. Ende im Vergleich, teilbare Karte, nächstes Programm mit einem Tap startbar.
- Optional per Flag: Challenges mit festem Startdatum (z. B. am 1. jedes Monats), echte Teilnehmerzahl.
  Das gibt der Creatorin regelmäßig einen Anlass zum Posten.

### 3. Präsenz der Creatorin

- Wöchentliche Nachricht oder kurzes Video der Creatorin, vorab planbar über die Daten.
- Bereich „New this month“ für neue Inhalte.
- Pushes und E-Mails in ihrer Stimme (Vorlagen aus der Config).

### 4. Erinnerungen

- Push oder E-Mail an Trainingstagen zur gewählten Uhrzeit.
- Nach ca. 5 Tagen Inaktivität: eine freundliche Nachricht ohne Schuldgefühle.
- Frequenz begrenzen (z. B. höchstens ein Push pro Tag). Jederzeit abschaltbar.

### 5. Teilbare Fortschrittskarten

- Ein Bild im 9:16-Format mit Ergebnis, Branding und Handle der Creatorin, über das native Teilen-Menü.
- Das ist Werbung für die Creatorin durch ihre eigene Community.

### 6. Win-back

- Gekündigte Nutzerinnen bekommen eine E-Mail bei neuem Programm oder Challenge-Start (nur mit Einwilligung).

## Freiraum

- Darstellung der Graphen und Karten.
- Inhalt und Timing der Nachrichten innerhalb der Grenzen oben.
- Später per Flag: Rezepte oder Meal-Ideen. **Nicht im ersten Release.**

## Nicht machen

- Streaks, die bei einem verpassten Tag auf null fallen.
- Körpergewicht als zentrale Erfolgszahl. Der Fokus liegt auf Kraft, Gewohnheit und Wohlbefinden.
- Leaderboards und Vergleiche zwischen Nutzerinnen.
- Push-Spam.

## Fertig wenn

- [ ] Der Wochenrückblick wird automatisch erstellt und verschickt.
- [ ] Der Flow zum Programmende ist durchgetestet, inklusive Start des nächsten Programms.
- [ ] Die Share-Karte rendert korrekt im Branding von zwei verschiedenen Creatorinnen.
- [ ] Opt-out für Pushes und E-Mails wirkt sofort.

## Kennzahlen

- Woche 1 aktiv (≥ 2 Workouts), Retention Woche 4, Programm-Abschlussrate, Verlängerung im zweiten Monat.

## Events

`progress_viewed`, `photo_added` (nur Zeitpunkt, kein Inhalt), `weekly_summary_sent`, `weekly_summary_opened`,
`program_completed`, `next_program_started`, `challenge_joined`, `share_card_created`, `share_card_shared`,
`reminder_sent`, `reminder_opened`, `reengagement_sent`, `app_opened`
