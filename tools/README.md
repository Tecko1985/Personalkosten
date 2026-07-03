# tools

## Startbestand (Seed)

Der einmalige Startbestand (Trainer, Schwerpunkttrainer, Förderung der laufenden
Saison) wurde aus der bestehenden Excel `Personalkosten_Mannschaften_Formeln_filterbar.xlsx`
erzeugt und **direkt in die Nextcloud** eingespielt — über den Admin-Button
„Datendatei auswählen…" auf dem Trainer-Tab (liest eine `*.seed.json` und speichert
sie über das Login-Gateway).

Wichtig: Aus Datenschutzgründen liegen **keine echten Personendaten** (Namen, Beträge)
in diesem öffentlichen Repository. Die Seed-Datei und das Erzeugungs-Skript werden
außerhalb des Repos gehalten; die Daten leben ausschließlich in der Nextcloud und sind
nur für die freigegebene Gruppe sichtbar.

Format der Import-/Speicher-Datei (identisch zur Cloud-Ablage):

```json
{
  "meta": { "currentSeason": "2026/27" },
  "seasons": {
    "2026/27": { "trainer": [ … ], "schwerpunkt": [ … ], "foerderung": [ … ] }
  },
  "parameter": {
    "positionen": [ { "label": "Trainer", "betrag": 50 }, … ],
    "lizenzen": [ … ], "landesebene": [ … ], "jahrgangsleiter": [ … ]
  }
}
```

Hinweis zur PowerShell-Erzeugung: Das Seed-Skript muss als **UTF-8 mit BOM** gespeichert
werden, sonst liest Windows PowerShell 5.1 die Umlaute als ANSI (Mojibake).
