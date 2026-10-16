# Entscheidungen

Freiraum-Entscheidungen aus dem Blueprint, jeweils mit kurzer Begründung. Neue Entscheidungen unten anhängen.

## Produkt

**Nische: „Glute Era“, glute-fokussiertes Gym-Programm für Einsteigerinnen.**
Ayrias Content dreht sich um Glute-Training im Gym, sie verkauft noch kein eigenes Programm, und ihre junge Community ist im Gym oft unsicher. Herleitung: `docs/CREATOR_RESEARCH.md`.

**Drei Programme statt eines:** Foundations (Gym, Einsteigerinnen), Growth (Gym, 6+ Monate), Home (Kurzhanteln + Band).
Das Quiz kann so wirklich unterschiedliche Pläne ausgeben, und Home deckt alle ohne Gym-Mitgliedschaft ab.

**Der Plan ist eine Reihenfolge, kein Kalender.** Workouts werden der Reihe nach abgearbeitet, die Trainingstage bestimmen nur den Rhythmus.
Ein verpasster Tag „scheitert“ nie, der Plan wartet („Pick up where you left off“). Bei 2 Tagen pro Woche dauert das Programm ehrlich länger, und der Reveal zeigt das auch so an.

**Optionale Workouts** (z. B. Growth Tag 4) erscheinen nur, wenn sie mehr Tage wählt als es Kern-Workouts gibt. Bei kurzen Sessions entfallen die „Finisher“.

**Altersabfrage an der Paywall** („18+ oder Eltern stimmen zu“).
Ein großer Teil der Follower ist minderjährig. Abos mit Minderjährigen sind ohne Zustimmung der Eltern unwirksam bzw. anfechtbar und führen zu Rückbuchungen. Formulierung mit Anwalt prüfen.

**Pause = kein Zugriff, keine Abbuchung.** Das Pausen-Angebot im Kündigungsflow nutzt Stripe `pause_collection`. Während der Pause ist die App gesperrt, mit „Resume now“.

## Technik

**Stack:** React 19 + Vite, Supabase (Postgres, Auth, RLS), Stripe Checkout, Resend, Express-Backend auf Railway.

**Ein Railway-Service pro Creatorin liefert API und Frontend aus** (`npm run build && npm start`).
Dadurch gibt es nur einen Origin: kein CORS, ein Deploy, eine Domain pro Creatorin. Alternativ kann das Frontend statisch woanders liegen (`VITE_API_URL`, `ALLOWED_ORIGINS`).

**Config als TypeScript + zod, validiert beim Build und beim Serverstart.**
Typsicherheit beim Schreiben, klare Fehlermeldungen mit Pfad, und WCAG-AA-Kontraste werden automatisch geprüft. Der Browser bekommt nur das validierte JSON, zod landet nicht im Bundle.

**Stripe Lookup Keys statt Price-IDs in der Config.** `npm run stripe:setup` legt Produkte und Preise an.
Dieselbe Config funktioniert dadurch im Test- und Live-Modus, und Preisänderungen laufen über einen neuen Key (`_v2`).

**Eigener Mini-Router (~60 Zeilen) statt React Router.** Spart Bytes auf der Landingpage. Bei ca. 15 Routen reicht das.

**Fonts selbst gehostet (@fontsource), kein Google-Fonts-CDN.** Das ist schneller, und das Einbinden von Google Fonts ohne Einwilligung ist in Deutschland abgemahnt worden (LG München, 2022).

**Funnel-Daten in `sessionStorage`.** Antworten überstehen Reloads, auf dem Gerät bleibt aber nach dem Besuch nichts zurück.
Für Analytics gibt es vor dem Login nur eine Session-ID und keine dauerhafte ID (Fallback aus `analytics.md`, bis die Rechtsprüfung etwas anderes erlaubt). Über den „Your plan“-Link in der E-Mail kommt sie auf jedem Gerät zurück zu ihrem Plan.

**Events laufen über das eigene Backend (`/api/events`), nicht direkt mit dem Anon-Key in Supabase.**
Der Server prüft Event-Namen gegen den Katalog, entfernt personenbezogene Daten, verknüpft nach dem Login die `user_id` und ignoriert Duplikate (Client-UUID als Primärschlüssel). Kauf- und Abo-Events schreibt nur der Server aus Stripe-Webhooks.

**Fulfilment doppelt abgesichert:** Webhook *und* Success-Seite rufen dieselbe idempotente Funktion auf.
Kommt der Webhook später als die Käuferin, ist sie trotzdem sofort drin. Der Login nach dem Kauf läuft über die (geheime, einmal nutzbare) Checkout-Session-ID, und eine Magic-Link-Mail geht als Backup raus.

**Offline-first im Workout:** Alle Trainingsdaten liegen zuerst lokal (localStorage) und werden per Upsert mit Client-UUIDs synchronisiert.
Ohne Netz läuft das Workout vollständig, und Re-Syncs erzeugen keine Duplikate. Ein Service Worker cached die App-Dateien, wird aber erst *nach* dem Kauf registriert, damit Landing-Besucherinnen kein Datenvolumen dafür bezahlen.

**Pausentimer über Zeitstempel** (`restEndsAt`), nicht über einen Zähler. Er stimmt nach Bildschirm-Sperre, App-Wechsel und Reload.

**Gewichte intern in kg.** Wechselt die Einheit, rastet der nächste Vorschlag auf das Hantel-Raster der neuen Einheit ein (z. B. 40 kg → 90 lbs → +5 = 95 lbs).

**Demo-Modus ohne Keys.** Ohne Supabase-Variablen läuft der komplette Flow lokal (simulierter Kauf, keine Zahlung, deutlich markiert).
So kannst du die App ohne Infrastruktur zeigen, z. B. im Pitch an die Creatorin.

## App Stores (paywall.md)

**Verkauf ausschließlich im Web-Funnel.** Die Web-App ist als PWA installierbar („Add to Home Screen“).
Eine native App käme später nur als Login für bestehende Abos. Die Regeln für digitale Käufe in Apps (Apple/Google, je Region unterschiedlich und im Wandel) werden **vor** einer Einreichung neu geprüft.

## Offen / bewusst nicht im ersten Release

- Challenges, Fortschrittsfotos, Ernährung: per Feature-Flag vorbereitet, aber aus (`features` in der Config). Fotos brauchen privaten Storage und eine eigene Rechtsprüfung.
- Win-back-Mails an Gekündigte: Leads mit Double-Opt-in werden gespeichert, der Versand ist eine manuelle Kampagne (z. B. Resend Broadcasts).
- Admin-Dashboard: laut Blueprint erst ab 3 Creatorinnen. Bis dahin reichen die SQL-Views in Supabase.
- Rev-Share-Basis: Der Report rechnet mit Umsatz nach Erstattungen und ohne Steuer, Stripe-Gebühren werden nicht abgezogen. Muss zum Vertrag passen.
