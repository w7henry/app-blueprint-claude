# Legal-Checkliste

> **Kein Rechtsrat.** Diese Liste sorgt dafür, dass nichts vergessen wird.
> Die Umsetzung vor jedem Launch mit Steuerberater, IHK oder Anwalt klären.
> Der Betreiber sitzt in Deutschland, die Käuferinnen sind international. Das betrifft Steuern und Verbraucherrecht.

## Vor dem Build klären

- [ ] **Wer ist Vertragspartner** der Käuferinnen: der Betreiber (Gewerbe) oder die Creatorin?
      Das bestimmt Impressum, AGB, Rechnungen und Steuer.
- [ ] **Umsatzsteuer** bei digitalen Leistungen an Verbraucher im Ausland (EU-OSS und Nicht-EU-Länder).
      Optionen: Stripe Tax oder ein Merchant-of-Record-Anbieter, der die Steuer übernimmt. Mit Steuerberater entscheiden.
- [ ] **Rev-Share-Vertrag** mit der Creatorin: Anteil, Auszahlung, Laufzeit, Rechte an Inhalten, Exit, **Promo-Pflichten**.

## Pflicht in der App bzw. auf der Website

- [ ] Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung, pro Creator-Deploy.
- [ ] **Widerrufsrecht bei digitalen Inhalten und Abos:** Beim Checkout die nötige Zustimmung und Bestätigung einholen.
      Formulierung prüfen lassen.
- [ ] **Kündigungsbutton** für Abos, die online mit Verbrauchern abgeschlossen werden (in Deutschland § 312k BGB). Kein versteckter Weg.
- [ ] **Account-Löschung** direkt in der App. Bei Apps mit Accounts verlangt das auch der App Store.
- [ ] **E-Mails:** Transaktionale Mails (Login, Trial-Erinnerung, Rechnung) sind okay.
      Marketing nur mit separater Einwilligung, in Deutschland üblicherweise per Double Opt-in.
- [ ] **Tracking:** Mit dem Setup aus `analytics.md` prüfen, was ohne Einwilligung zulässig ist (TDDDG, DSGVO).

## Inhalte und Gesundheit

- [ ] Keine Heilversprechen, keine garantierten Ergebnisse.
- [ ] Hinweis, vor dem Start bei Schwangerschaft, Verletzungen oder Erkrankungen ärztlich abzuklären. Bei Schmerzen abbrechen.
- [ ] Testimonials und Vorher/Nachher-Bilder nur echt und mit schriftlicher Einwilligung.

## Fotos und sensible Daten

- [ ] Fortschrittsfotos sind privat: Zugriff nur für die Nutzerin selbst, nicht für die Creatorin, Löschfunktion.
- [ ] Körperdaten (Gewicht, Maße) sind optional, minimal und gehören nicht in Analytics.
- [ ] Auftragsverarbeitungsverträge mit Dienstleistern (Supabase, Stripe, Resend, Hosting) prüfen.

## App Stores

- [ ] Regeln zu digitalen Käufen und Abos in Apps vor der Einreichung prüfen und Entscheidung in `DECISIONS.md` festhalten
      (siehe `paywall.md`).
