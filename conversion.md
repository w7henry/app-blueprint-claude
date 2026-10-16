# Conversion: Landing, Quiz, Plan-Reveal

## Ziel

Eine Besucherin aus dem Link in Bio erreicht die Paywall mit dem Gefühl: **„Das ist mein Plan.“**

## Warum

Sie kommt aus Vertrauen zur Creatorin, mobil, mit wenig Zeit und aus einem Impuls heraus.
Jeder zusätzliche Schritt, jedes Formular und jede Unklarheit kostet Käufe.
Das Quiz hat zwei Aufgaben: Es personalisiert den Plan, und es lässt die Besucherin investieren, bevor sie den Preis sieht.

## Muss

### 1. Landingpage

- Above the fold auf 390 px sichtbar: Creatorin (Foto oder kurzer Loop), **ein konkretes Versprechen**
  (Programm + Zeitraum + Häufigkeit, z. B. „6 weeks. 3 workouts a week. Built for the gym.“) und **ein CTA** zum Quiz.
- Darunter, Reihenfolge frei:
  - Was sie bekommt (3–4 Punkte mit echten App-Screens)
  - Wie es funktioniert (3 Schritte)
  - Kurze Geschichte der Creatorin
  - Echte Ergebnisse, **nur wenn vorhanden**, sonst den Abschnitt weglassen
  - FAQ: Werde ich bulky? Gym oder zuhause? Für Anfängerinnen? Wie kündige ich?
  - Finaler CTA
- Ein Sticky-CTA auf Mobile.
- Herkunfts-Parameter (`?src=tiktok&kw=guide` o. ä.) werden gespeichert und bis zum Kauf mitgeführt.

### 2. Quiz

- 4–7 Fragen, **eine pro Screen**, Antworten per Tap statt Tippen.
- Pflichtinhalte: Ziel, Erfahrung, Ort (Gym/zuhause), Trainingstage pro Woche.
  Optional: Session-Länge, was sie bisher aufgehalten hat.
- Fortschrittsanzeige, Zurück-Navigation, Antworten überstehen einen Reload.
- Nach 2–3 Fragen ein kurzer Zwischen-Screen in der Stimme der Creatorin (Bestätigung, keine Werbung).
- Nach dem Quiz eine E-Mail-Abfrage vor dem Reveal („Where should I send your plan?“), damit Abbrecherinnen erreichbar sind.
  Marketing-Einwilligung **separat und optional** (siehe `legal.md`).

### 3. Plan-Reveal

- Ein personalisierter Plan aus den Quiz-Antworten:
  Programmname, Wochenrhythmus (z. B. Mo/Mi/Fr), Vorschau auf Woche 1 (Workout-Namen, Dauer) und was sich nach dem Programm ehrlicherweise verändert haben kann.
- Das Mapping von Quiz-Antworten auf ein Programm kommt aus der Config und ist deterministisch.
- Ein kurzer „Building your plan“-Moment ist erlaubt (max. 2–3 Sekunden), keine künstlich lange Wartezeit.
- Ein CTA zur Paywall.

## Freiraum

- Visuelles Design, Animationen, Wording in der Creator-Stimme.
- Ob das Quiz auf der Landingpage startet oder eine eigene Route hat.
- Weitere Zwischen-Screens, solange der Weg bis zur Paywall kurz bleibt.

## Nicht machen

- Account oder Passwort vor der Paywall verlangen.
- Pop-ups, Cookie-Walls oder Chat-Widgets im Funnel.
- Fake-Verknappung (Countdowns, die neu starten), erfundene Zahlen („10,000+ women“).
- Feature-Listen statt Ergebnis („8 programs, 200 exercises“).

## Fertig wenn

- [ ] Kompletter Durchlauf auf einem echten iPhone in Safari bis zur Paywall in **unter 90 Sekunden**.
- [ ] Ein Reload in jedem Schritt verliert keine Antworten.
- [ ] Die Landingpage ist auf mobilem Netz schnell benutzbar (Lighthouse Mobile Performance im grünen Bereich).
- [ ] Alle Events unten feuern genau einmal pro Aktion.

## Events

`landing_viewed`, `cta_clicked`, `quiz_started`, `quiz_answered` (Frage, Antwort), `quiz_completed`,
`email_submitted`, `plan_revealed` (Programm), `paywall_viewed`
