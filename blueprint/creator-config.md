# Creator-Config: eine App, viele Creatorinnen

## Ziel

Eine neue Creatorin startet in **Tagen statt Monaten**, ohne dass Code geändert werden muss.

## Warum

Das Geschäftsmodell funktioniert nur, wenn jede weitere Creatorin wenig Aufwand kostet.
Alles, was zur Creatorin gehört, ist deshalb **Daten**, nicht Code.

## Muss

- Eine zentrale Creator-Config mit mindestens folgenden Feldern:
  - `identity`: Name, Handle, Slug, Domain, Support-E-Mail, Social-Links
  - `brand`: Farben (Hintergrund, Fläche, Text, Akzent, Akzent-Kontrast), Fonts (Display, UI), Logo, Hero-Foto/-Video, Light- oder Dark-Basis
  - `voice`: kurze Beschreibung des Tons, Grußformel, 5–10 Beispielsätze in ihrer Stimme
  - `offer`: Programme im Verkauf, Stripe-Price-IDs, Trial ja/nein und Dauer, Einmalkauf ja/nein
  - `quiz`: Fragen, Antworten und das Mapping von Antworten auf Programme
  - `features`: Flags, z. B. `challenges`, `nutrition`, `progress_photos`
  - `legal`: Betreiberdaten für Impressum, AGB, Datenschutz (siehe `legal.md`)
- Inhalte als Daten mit diesem Grundmodell:
  `program → phases → weeks → workouts → exercises`
  Jede Übung hat: Name, Sätze, Wiederholungsbereich (z. B. 8–10), Pause, 2–3 Technik-Cues, Video-URL, Gewichts-Inkrement, Alternativen.
- Eine **gemeinsame Übungsbibliothek** für alle Creatorinnen. Jede Creatorin kann Videos und Cues überschreiben.
- Theming nur über Design-Tokens (CSS-Variablen), die aus `brand` erzeugt werden.
- Alle Texte, die nach der Creatorin klingen sollen (Welcome, Push, E-Mails, Leerzustände), als Vorlagen mit Platzhaltern plus optionalem Override pro Creatorin.

## Freiraum

- Config als TypeScript-Datei, JSON oder Supabase-Tabelle.
- Single-Tenant oder Multi-Tenant.
  Empfohlener Start: **eine Codebase, ein Deploy pro Creatorin** über `CREATOR_SLUG` als Umgebungsvariable.
  Multi-Tenant erst ab 3 oder mehr aktiven Creatorinnen.
- Wie Inhalte gepflegt werden. Am Anfang reicht der Supabase-Tabelleneditor oder JSON-Import.

## Nicht machen

- Farben, Namen, Preise oder Texte direkt in Komponenten schreiben.
- Ein Admin-Dashboard bauen, bevor es 3 Creatorinnen gibt.
- Annehmen, dass jede Creatorin Gym-Programme hat. Home-Programme ohne Geräte müssen genauso funktionieren.

## Fertig wenn

- [ ] Eine zweite Demo-Creatorin mit komplett anderem Look und anderen Programmen läuft, **ohne eine Zeile Code zu ändern**.
- [ ] Eine Schritt-für-Schritt-Anleitung `ONBOARD_CREATOR.md` existiert: welche Assets nötig sind, wo sie hinkommen, wie man deployt.
- [ ] Die Config wird beim Build oder Start validiert. Fehlende Pflichtfelder geben eine klare Fehlermeldung.
