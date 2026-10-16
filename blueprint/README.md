# Creator Fitness App: Blueprint

Dieser Ordner beschreibt, **was** die App erreichen muss und **woran** man erkennt, dass ein Teil fertig ist.
Das **Wie** entscheidest du als KI-Agent selbst. Ausnahme sind Punkte, die als *Muss* markiert sind.

## So nutzt du diese Dateien

1. Lies vor jeder Aufgabe diese README, `design.md`, `creator-config.md` und die Datei zum aktuellen Teil.
2. **Muss** ist verbindlich. Wenn ein Muss mit dem bestehenden Code kollidiert, umgeh es nicht still. Melde den Konflikt und schlag eine Lösung vor.
3. **Freiraum** heißt: Entscheide selbst und begründe die Entscheidung in 1–2 Sätzen im Commit oder in der PR.
4. **Nicht machen** sind bekannte Fehler, die Conversion oder Vertrauen kosten.
5. **Fertig wenn** ist die Abnahme. Ein Teil ist erst fertig, wenn alle Punkte erfüllt und getestet sind.
6. Jede neue Nutzer-Aktion bekommt ein Event (siehe `analytics.md`).
7. Lieber weniger Features, dafür sauber, als viele halbe.

## Das Produkt in einem Satz

Eine Fitness-App im Namen einer Creatorin. Sie verkauft deren Programm, bringt Käuferinnen schnell zum ersten Erfolg und hält sie über sichtbaren Fortschritt und die Nähe zur Creatorin im Abo.

## Zielgruppe

- Frauen, ca. 18–35, folgen der Creatorin auf TikTok oder Instagram.
- Anfängerin bis leicht fortgeschritten, trainieren im Gym oder zuhause, oft unsicher, was sie tun sollen.
- Kommen fast immer **mobil** über Link in Bio oder DM, mit wenig Zeit und aus einem Impuls heraus.
- Die App-Texte sind **Englisch**. Code-Kommentare in beliebiger Sprache.

## Der Funnel

```
Link in Bio → Landing → Quiz → Plan-Reveal → Paywall → Kauf → Login
→ erstes Workout → Woche 1 geschafft → Programm geschafft → nächstes Programm / Verlängerung
```

**Nordstern-Metrik:** Anteil der zahlenden Nutzerinnen, die in ihrer ersten Woche mindestens 2 Workouts abschließen.
Diese Zahl sagt Retention besser voraus als jede andere.

## Build-Reihenfolge

| # | Datei | Warum an dieser Stelle |
|---|-------|------------------------|
| 1 | `analytics.md` | Ohne Messung wird jede spätere Entscheidung geraten |
| 2 | `creator-config.md` + `design.md` | Fundament: nichts Creator-Spezifisches im Code |
| 3 | `conversion.md` | Landing, Quiz, Plan-Reveal |
| 4 | `paywall.md` | Kauf, Abo, Kündigung |
| 5 | `activation.md` | Vom Kauf zum ersten Workout |
| 6 | `workout.md` | Das Kernerlebnis |
| 7 | `retention.md` | Fortschritt, Programme, Creator-Präsenz |
| – | `legal.md` | Läuft parallel, Pflicht vor jedem Launch |

## Globale Regeln

- **Mobile first.** 390 px Breite ist das Hauptlayout. Desktop muss nur ordentlich aussehen.
- **Nichts hardcoden**, was zur Creatorin gehört: Name, Farben, Texte, Programme und Preise kommen aus der Config.
- **Keine erfundenen Beweise.** Keine Fake-Testimonials, Fake-Nutzerzahlen, Fake-Countdowns oder Ergebnisgarantien.
- **Schnell.** Die Landingpage muss auf mobilem Netz sofort benutzbar sein. Keine schweren Libraries für Kleinigkeiten.
- **Barrierearm.** Kontrast mindestens WCAG AA, Tap-Targets mindestens 44 px, alle Inputs mit Label.
- **Stack:** Nutze den bestehenden Stack des Projekts (React/Vite, Supabase, Stripe, Backend auf Railway, Resend für E-Mails).
  Neue Abhängigkeiten nur, wenn sie klar Zeit sparen, mit kurzer Begründung.
- **Tests:** Geschäftslogik (Progression, Zugriffsrechte, Abo-Status) bekommt Unit-Tests. UI wird auf echtem Gerät geprüft.
