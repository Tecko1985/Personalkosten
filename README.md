# Personalkosten Mannschaften (v1.0)

Interne Web-App des **1. SC 1911 e.V. Heilbad Heiligenstadt** zur Planung der
Personalkosten / Aufwandsentschädigungen (AE) im Nachwuchsbereich. Löst die bisherige
Excel-Planung ab und speichert die Daten zentral in der Vereins-Nextcloud über das
gemeinsame Login-Gateway der [ToolsUebersicht](https://tecko1985.github.io/ToolsUebersicht/).

## Bereiche

- **Übersicht** — Summen je Bereich und je Mannschaft, monatlich und aufs Jahr hochgerechnet.
- **Trainer** — AE wird automatisch aus Position + Lizenz + Landesebene + Jahrgangsleiter
  berechnet und mit dem Stellenanteil multipliziert; manueller Überschreibwert je Person möglich.
  Mannschaft und Lizenz können beim Anlegen optional aus dem zentralen Trainerprofil übernommen werden.
- **Schwerpunkttrainer** / **Förderung** — Beträge werden direkt gepflegt.
- **Parameter** (nur Admin) — die €-Sätze der Berechnung.
- **Export** — Personalübersicht als Text (.txt) oder PDF (über den Druckdialog),
  Bereiche und Spalten frei wählbar.
- Mehrere Saisons planbar; filterbare Tabellen.

## Technik

Reines HTML/CSS/Vanilla-JS ohne Build-Step. Persistenz ausschließlich über das
ToolsUebersicht-Gateway (`db.js`); es werden **keine Personendaten im Repository** abgelegt
(siehe `tools/README.md`). Sichtbar nur für die freigegebene Gruppe.

Lokaler Test: `E:\.claude\launch.json` → Eintrag `personalkosten` (Port 8781).
