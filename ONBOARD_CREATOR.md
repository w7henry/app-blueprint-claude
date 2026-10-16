# Neue Creatorin onboarden

Ziel: eine neue Creatorin in Tagen live, **ohne Code-Änderung**. Alles, was zu ihr gehört, steht in `creators/<slug>/`.

## 1. Was du von ihr brauchst

| Asset | Format | Wohin |
|---|---|---|
| Hero-Foto (Hochformat, Gesicht gut sichtbar) | JPG, ≥ 1200 px breit | `public/creators/<slug>/hero.jpg` |
| Welcome-Foto | JPG | `public/creators/<slug>/welcome.jpg` |
| Story-Foto (gern im Gym) | JPG | `public/creators/<slug>/story.jpg` |
| Profilbild, quadratisch | JPG, ≥ 400 px | `public/creators/<slug>/avatar.jpg` |
| Übungs-Demos (5–10 s Loop, stumm) | MP4/H.264, ≤ 2 MB | eigener Speicher (z. B. Supabase Storage), URL in `exerciseOverrides` |
| 5–10 echte Sätze aus ihren Videos | Text | `voice.samples` |
| Ihre Story in 2–3 Absätzen | Text | `copy.landing.story` |
| Freigabe der Programme | — | `creators/<slug>/programs.ts` |
| Echte Ergebnisse (nur mit schriftlicher Einwilligung) | Name + Zitat | `results` (leer lassen, sonst wird der Abschnitt ausgeblendet) |
| Schriftliche Zustimmung zur Nutzung von Name, Bild und Stimme + Rev-Share-Vertrag | PDF | nicht ins Repo |

## 2. Config anlegen

1. Ordner kopieren: `cp -r creators/ayria creators/<slug>`
2. In `creators/index.ts` eine Zeile ergänzen: `import mia from './mia/config';` und im Objekt `{ ayria, nova, mia }`.
   *(Das ist die einzige „Code“-Stelle, und sie ist reine Registrierung.)*
3. `creators/<slug>/config.ts` ausfüllen:
   - `identity`: Name, Handle, `slug` (= Ordnername), App-Name, Domain, Support-Mail, Social-Links
   - `brand`: Farben, Fonts (selbst gehostet über `@fontsource/...`), Radius, Bilder
   - `voice` und `copy`: alle Texte in ihrer Stimme. `{{platzhalter}}` siehe Beispiele
   - `offer`: Pläne, Preise (Cent), Stripe-Lookup-Keys, Trial, Einmalkauf an/aus, Kündigungs-Angebote
   - `programs`: Programme → Phasen → Wochen → Workouts → Übungen (IDs aus `content/exercises.ts`)
   - `quiz`: 4–7 Fragen (Pflicht: `goal`, `experience`, `location`, `days`), Wochentags-Schema, Mapping-Regeln
   - `legal`: Betreiberdaten, Texte für Alters- und Widerrufs-Checkbox, `draft: true` bis der Anwalt geprüft hat
4. Prüfen: `CREATOR_SLUG=<slug> npm run check:config`
   Fehlende Felder, ungültige Farben, zu wenig Kontrast (WCAG AA), unbekannte Übungen oder Programme werden mit Pfad gemeldet.
5. Lokal ansehen (Demo-Modus, ohne Keys): `CREATOR_SLUG=<slug> npm run dev` und `http://localhost:5173` öffnen.
6. Echte App-Screens für die Landingpage erzeugen (Dev-Server läuft): `CREATOR_SLUG=<slug> npm run screens`

Übungen fehlen in der Bibliothek? In `content/exercises.ts` ergänzen, dann können alle Creatorinnen sie nutzen. Eigene Videos und Cues pro Creatorin kommen in `exerciseOverrides`.

## 3. Infrastruktur (einmal pro Creatorin)

**Supabase** (ein Projekt kann mehrere Creatorinnen tragen, `creator_slug` trennt die Daten):
1. Projekt anlegen (Region EU), SQL aus `supabase/migrations/` der Reihe nach im SQL-Editor ausführen.
2. Auth → URL Configuration: Site URL = App-Domain. Unter Redirect URLs `https://<domain>/login/callback` eintragen.
3. Auth → E-Mails: Custom SMTP mit Resend einrichten (für Supabase-eigene Mails).
4. `insert into creator_settings values ('<slug>', 40);` (Rev-Share laut Vertrag)

**Stripe:**
1. `STRIPE_SECRET_KEY=sk_test_… CREATOR_SLUG=<slug> npm run stripe:setup` legt Produkte und Preise an.
2. Webhook-Endpoint `https://<domain>/api/stripe/webhook` mit den Events, die das Skript ausgibt. Das Signing-Secret kommt nach `STRIPE_WEBHOOK_SECRET`.
3. Apple Pay und Google Pay sind in Stripe Checkout automatisch aktiv (Settings → Payment methods).
4. Customer Portal aktivieren (Settings → Billing → Customer portal).
5. Steuer: Stripe Tax oder Merchant of Record **mit Steuerberater** entscheiden (`STRIPE_TAX`).

**Resend:** Domain verifizieren (SPF/DKIM), `EMAIL_FROM` setzen.

**Railway:**
1. Neuer Service aus diesem Repo, Variablen aus `.env.example` setzen, inklusive `CREATOR_SLUG` und der `VITE_*`-Werte (werden beim Build eingebacken).
2. Build und Start stehen in `railway.json`.
3. Cron-Services mit demselben Repo und denselben Variablen:
   - stündlich: `npm run job:hourly` (Trainings-Erinnerungen, 24-h-Mail ohne Workout)
   - täglich: `npm run job:daily` (Tag-3-Tipp, Nachricht nach 5 Tagen Pause)
   - montags 8 Uhr: `npm run job:weekly` (Wochenrückblick)
4. Eigene Domain verbinden und `PUBLIC_APP_URL` setzen.

## 4. Vor dem Launch (Abnahme)

- [ ] `npm test` grün, `npm run build` ohne Fehler
- [ ] Testkauf im Stripe-Testmodus: Webhook kommt an, Zugriff ist frei, Login-Mail ist angekommen
- [ ] Kündigung im Testmodus: Zugriff bleibt bis Periodenende
- [ ] Durchlauf auf einem echten iPhone in Safari bis zur Paywall unter 90 Sekunden
- [ ] Erstes Workout in maximal 3 Taps nach dem Kauf
- [ ] Ein Offline-Workout (Flugmodus) synchronisiert danach ohne Duplikate
- [ ] Legal: Impressum, Datenschutz, AGB, Widerruf geprüft und `legal.draft = false`
- [ ] Creatorin hat Texte, Programme und Fotos schriftlich freigegeben
- [ ] `select * from analytics_funnel` zeigt die Testdurchläufe
