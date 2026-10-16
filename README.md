# Glute Era by Ayria: Creator Fitness App

Landingpage, Quiz, Paywall und Workout-Web-App im Namen einer Creatorin, gebaut nach dem Blueprint in [`blueprint/`](blueprint/README.md).
Erste Creatorin: **Ayria Rutledge** ([@ayria_rutledge](https://www.tiktok.com/@ayria_rutledge)). Produkt: **Glute Era**, ein glute-fokussiertes Gym-Programm für Einsteigerinnen.
Warum genau diese Nische: [`docs/CREATOR_RESEARCH.md`](docs/CREATOR_RESEARCH.md).

> **Status: Pitch-fertiger Prototyp.** Der komplette Flow läuft lokal im Demo-Modus.
> Für einen echten Launch fehlen: Ayrias Zustimmung und Fotos/Videos, deine Betreiberdaten, die Prüfung der Rechtstexte und die Keys für Supabase, Stripe und Resend.

## In 2 Minuten starten (Demo-Modus, ohne Keys)

```bash
npm install
npm run dev              # http://localhost:5173  (Ayria)
CREATOR_SLUG=nova npm run dev   # zweite, fiktive Demo-Creatorin mit dunklem Theme
```

Ohne Supabase-Variablen läuft alles lokal: Quiz, Plan, simulierter Kauf (es wird nichts abgebucht), Workouts, Fortschritt, Kündigung.
Oben in der App steht deutlich „Demo mode“.

**Bilder von Ayria:** Bis ihre eigenen Fotos in `public/creators/ayria/` liegen, lädt die Seite ihr öffentliches TikTok- bzw. Instagram-Profilbild über unavatar.io.
Mit `npm run assets:fetch ayria` landen die Bilder lokal im Projekt. **Live nur mit ihrer schriftlichen Zustimmung** (siehe Research-Doku).

## Was drin ist

| Blueprint-Teil | Umsetzung |
|---|---|
| `analytics.md` | `track()` mit Batching, Retry, Once-Keys und PII-Filter. `events`-Tabelle, Funnel-, Aktivierungs-, Woche-1-, Kohorten- und Umsatz-Views, Creator-Monatsreport. Kauf-Events nur serverseitig. [Katalog](docs/EVENTS.md) |
| `creator-config.md` + `design.md` | Alles Creator-Spezifische in `creators/<slug>/`, validiert beim Build und Serverstart (inkl. WCAG-AA-Kontrast). Design-Tokens aus `brand`. Gemeinsame Übungsbibliothek mit Overrides. Zweite Demo-Creatorin ohne Code-Änderung |
| `conversion.md` | Landing (Versprechen und CTA above the fold, echte App-Screens, Story, FAQ, Sticky-CTA), Quiz mit 6 Fragen und Zwischen-Screen in ihrer Stimme, E-Mail mit separatem Marketing-Opt-in, deterministischer Plan-Reveal |
| `paywall.md` | Jahr hervorgehoben (mit Preis pro Monat) und Monat, Trial mit Datum und Betrag, Stripe Checkout (Apple/Google Pay), erst zahlen, dann Account (passwortlos), idempotente Webhooks, Kündigung mit einem Angebot, Kündigungsseite ohne Login, Upgrade aufs Jahresabo |
| `activation.md` | Welcome der Creatorin, erstes Workout in ≤ 3 Taps, „Schedule it“, Push-Frage mit Kontext und .ics als Alternative, Feier-Screen mit Startwert, Installations-Hinweis erst danach, E-Mails an Tag 0, nach 24 h und an Tag 3 |
| `workout.md` | Today mit genau einem Haupt-CTA, Player mit großen Steppern, Pausentimer über Zeitstempel, Übung tauschen, Wake Lock, kg/lbs, Double Progression mit sichtbarer Begründung, offline-fähig mit Sync |
| `retention.md` | Wochen-Streak, Graphen der Hauptübungen, Bestleistungen, Wochenrückblick (App + Mail), Programmende mit Vorher/Nachher und nächstem Programm, 9:16-Teilen-Karte, Erinnerungen (höchstens 1 pro Tag), Nachricht der Creatorin pro Woche |
| `legal.md` | Impressum, Datenschutz, AGB, Widerruf als **Entwurf** (Banner), Alters- und Widerrufs-Checkbox, Kündigungsbutton, Account-Löschung, Double-Opt-in, keine Drittanbieter-Tracker, selbst gehostete Fonts |

## Projektstruktur

```
creators/            Config pro Creatorin (ayria = echt, nova = fiktive Demo) + Schema/Validierung
content/             gemeinsame Übungsbibliothek
src/                 Frontend (React)
  pages/             Landing, Quiz, Reveal, Paywall, Legal (Funnel, schnell geladen)
  app/               alles nach dem Kauf (lazy geladen): Store, Sync, Player, Fortschritt, Einstellungen
  shared/            reine Logik für Browser und Server: Progression, Zugriffsrechte, Quiz-Mapping, Streak
server/              Express-API für Railway: Checkout, Webhooks, Login, Mitglieder-Aktionen, Jobs
supabase/migrations/ Schema, RLS, Analytics-Views
scripts/             Vite-Plugin, Config-Check, Stripe-Setup, Screenshots, Bilder laden
tests/               Unit- und Integrationstests (inkl. echter Postgres-Prüfung der Views)
```

## Befehle

| | |
|---|---|
| `npm run dev` | Frontend (Demo-Modus, solange keine Supabase-Keys gesetzt sind) |
| `npm run dev:server` | Backend lokal (braucht `.env`, siehe `.env.example`) |
| `npm test` | 93 Tests: Progression, Zugriffsrechte, Streak, Quiz, Config, Billing/Webhooks, API, Jobs, SQL-Views |
| `npm run typecheck` / `npm run build` | Typecheck und Produktions-Build |
| `npm run check:config` | alle Creator-Configs validieren |
| `npm run stripe:setup` | Stripe-Produkte und -Preise aus der Config anlegen |
| `npm run screens` | echte App-Screens für die Landingpage erzeugen |
| `npm run preview:file` | die ganze App (Demo-Modus) als **eine** HTML-Datei → `dist-preview/<slug>-preview.html`, öffnet ohne Server (z. B. in der Vorschau der Claude-App) |
| `npm start` | API und gebautes Frontend ausliefern (Railway) |

## Live gehen

Schritt für Schritt in [`ONBOARD_CREATOR.md`](ONBOARD_CREATOR.md): Supabase, Stripe, Resend, Railway, Cron-Jobs und die Abnahme-Checkliste.
Begründete Entscheidungen stehen in [`DECISIONS.md`](DECISIONS.md).

## Was geprüft ist, und was noch nicht

| Abnahme aus dem Blueprint | Stand |
|---|---|
| Geschäftslogik mit Unit-Tests (Progression inkl. Grenzfälle, Zugriffsrechte, Abo-Status) | ✅ `npm test` |
| Webhooks idempotent, Kündigung entzieht Zugriff erst am Periodenende | ✅ Integrationstests mit Fakes |
| Funnel-View zeigt Conversion pro Schritt | ✅ gegen echtes Postgres (PGlite) getestet |
| Events genau einmal pro Aktion, auch bei Reload/Doppeltipp, kein PII | ✅ automatisierter Browser-Durchlauf |
| Reload in jedem Quiz-Schritt verliert nichts | ✅ Browser-Durchlauf |
| Lighthouse Mobile Performance grün | ✅ 100 (Accessibility 100) auf dem Produkt-Build |
| Zwei sehr verschiedene Creator-Themes ohne Code-Änderung | ✅ Ayria (hell/warm) und Nova (dunkel/kühl) |
| Pausentimer stimmt nach Reload/Bildschirm aus | ✅ zeitstempelbasiert, im Browser geprüft |
| Durchlauf bis Paywall < 90 s auf echtem iPhone, Safe Areas, Tastatur | ⏳ auf echtem Gerät prüfen |
| Testkauf im Stripe-Testmodus inkl. Login-Mail, Trial-Erinnerung, Refund | ⏳ braucht deine Stripe-, Supabase- und Resend-Keys |
| Offline-Workout synchronisiert ohne Duplikate | ⏳ Logik vorhanden (Client-UUIDs, Upserts), mit echtem Supabase testen |
