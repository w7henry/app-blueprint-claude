# Design

## Ziel

Die App fühlt sich an wie **die Marke der Creatorin**: hochwertig, persönlich, ruhig.
Nicht wie ein generisches SaaS-Template.

## Prinzipien

- **Die Creatorin steht im Vordergrund.** Ihr Gesicht, ihre Farben, ihre Stimme. Die App-Oberfläche tritt zurück.
- **Editorial statt Dashboard.** Große Typografie, viel Weißraum, wenige Elemente pro Screen.
- **Ein Haupt-CTA pro Screen.** Wenn es zwei gleich laute Buttons gibt, ist der Screen noch nicht fertig gedacht.
- **Alles aus Tokens.** Farben, Fonts, Radien, Abstände kommen aus der Creator-Config (`creator-config.md`).
  Die Marke entscheidet, ob die Basis hell oder dunkel ist.
- **Typografie:** eine markante Display-Schrift für Überschriften, eine gut lesbare Sans für UI und Zahlen.
  Zahlen im Workout (Gewicht, Wiederholungen, Timer) groß und mit Tabular Figures.
- **Bewegung:** dezent und schnell (ca. 150–250 ms), nur wo sie etwas bedeutet, z. B. Satz abgehakt oder Bestleistung erreicht.
  `prefers-reduced-motion` respektieren.
- **Bilder:** echte, hochwertige Fotos und Videos der Creatorin. Platzhalter sind klar als Platzhalter erkennbar.
- **Copy:** kurz, direkt, „you“, in der Stimme der Creatorin.
  Keine abwertende Sprache über Körper, keine Schuldgefühle, keine Heilsversprechen.

## Freiraum

- Komponentenbibliothek oder eigene Komponenten.
- Layout und Komposition jedes Screens.
- Mikrointeraktionen, Haptik, Sound.

## Nicht machen

- Default-Look einer Komponentenbibliothek (graue Karten, violette Verläufe, Standard-Schatten).
- Emoji als Gestaltungsmittel, Stockfotos, mehr als ein Akzentton.
- Kleine Tap-Targets oder grauer Text auf grauem Grund.
- Modale Pop-ups, die den Funnel unterbrechen.

## Fertig wenn

- [ ] Dieselben Screens in zwei sehr verschiedenen Creator-Themes (z. B. hell/warm und dunkel/kühl) sehen beide gewollt aus.
- [ ] Alle Text-/Hintergrund-Kombinationen erfüllen WCAG AA.
- [ ] Auf einem echten iPhone geprüft: Safe Areas, Tastatur überdeckt keine Inputs, kein horizontales Scrollen.
