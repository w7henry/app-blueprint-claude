# Paywall, Abo und Kündigung

## Ziel

Aus „das ist mein Plan“ wird ein Kauf, **ohne Reue danach**.

## Warum

Ein Kauf ist nur dann etwas wert, wenn er nicht in Rückerstattung, Chargeback oder sofortige Kündigung umschlägt.
Klare Preise und ein fairer Kündigungsweg erhöhen das Vertrauen und damit langfristig den Umsatz.

## Muss

### Paywall

- Kommt direkt nach dem Plan-Reveal und wiederholt den Kern des Plans (Programmname, Foto der Creatorin).
- **Maximal 2–3 Optionen.** Standard: Jahresabo hervorgehoben (mit Preis pro Monat) und Monatsabo.
  Optional Einmalkauf eines einzelnen Programms, gesteuert über die Config.
- Bei Trial: klar zeigen, **wann** wie viel abgebucht wird. Erinnerungs-E-Mail vor Trial-Ende.
- Die Zahlung läuft über Stripe mit Apple Pay und Google Pay.
- **Erst bezahlen, dann Account.** Login danach per Magic Link oder Einmal-Code über Resend, ohne Passwort.
- Nach dem Kauf direkt weiter ins Onboarding (`activation.md`), dazu ein Login-Link per E-Mail als Backup.

### Zugriffsrechte

- Stripe-Webhooks → Backend → Tabelle `subscriptions` in Supabase.
  Diese Tabelle ist die **einzige Quelle der Wahrheit** dafür, wer Zugriff hat.
- Gekündigte Abos behalten Zugriff bis zum Ende der bezahlten Periode.
- Webhooks sind idempotent: Doppelte Zustellung ändert nichts.

### Kündigung

- In den Einstellungen leicht auffindbar.
- Ein optionaler Zwischenschritt: kurze Frage nach dem Grund (Mehrfachauswahl), danach **ein** passendes Angebot
  (Pause für einen Monat, Programmwechsel oder Rabatt). Die Kündigung bleibt immer mit einem Tap erreichbar.
- Rechtliche Vorgaben zum Kündigungsweg beachten (siehe `legal.md`).

### Upsell-Momente

- Programmende → nächstes Programm oder Upgrade aufs Jahresabo.
- Monatsabo nach ca. 2 Monaten → Angebot fürs Jahresabo.

### App Stores

- Falls eine native iOS- oder Android-App kommt: Die Regeln für digitale Abos in Apps **vor der Einreichung** prüfen.
  In-App-Purchase-Pflichten und Ausnahmen unterscheiden sich nach Region und ändern sich.
- Standardstrategie: Verkauf im Web-Funnel, die App dient als Login für bestehende Abos.
  Die Entscheidung wird in `DECISIONS.md` dokumentiert.

## Freiraum

- Layout der Paywall, Hervorhebung, Badges.
- Höhe der Rabatte im Kündigungsflow (Default aus der Config).
- Stripe Checkout oder eingebettetes Payment Element.

## Nicht machen

- Versteckte Preise, vorausgewählte Add-ons, Kleingedrucktes zur Verlängerung.
- Kündigung nur per E-Mail oder Support.
- Schuldgefühle in der Copy („Are you sure you want to give up on yourself?“).

## Fertig wenn

- [ ] Ein Testkauf im Stripe-Testmodus funktioniert vollständig: Webhook, Zugriff freigeschaltet, Login-Mail angekommen.
- [ ] Kündigung entzieht den Zugriff erst am Periodenende.
- [ ] Trial-Erinnerung wird verschickt. Refund und fehlgeschlagene Zahlung sind getestet.
- [ ] Unit-Tests für die Logik der Zugriffsrechte.

## Events

`paywall_viewed`, `plan_selected`, `checkout_started`, `purchase_completed` (Plan, Preis, Quelle, serverseitig),
`trial_started`, `trial_converted`, `payment_failed`, `cancel_flow_started`, `cancel_reason_selected`,
`save_offer_accepted`, `subscription_canceled`, `subscription_upgraded`
