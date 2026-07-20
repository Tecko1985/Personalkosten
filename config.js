const APP_VERSION = "1.0";

// Jahres-Faktor für Hochrechnung Monat -> Jahr (Sommerpause: 11 statt 12 Monate,
// wie in der Excel "Summe/Jahr" = Summe * 11).
const MONATE_PRO_JAHR = 11;

// Startsaison, falls im Gateway noch nichts liegt.
const DEFAULT_SEASON = "2026/27";

// Standard-Parametersätze (aus der bestehenden Excel "Parameter"-Tabelle).
// KEINE Personendaten — nur die €-Sätze. Personendaten kommen ausschließlich
// per einmaligem Cloud-Import (Seed) in die Nextcloud, nie ins Repo.
// value "" bedeutet "kein Zuschlag" (0 €) und ist als "—"-Option wählbar.
const DEFAULT_PARAMETER = {
  positionen: [
    { label: "Cheftrainer", betrag: 50 },
    { label: "Trainer", betrag: 50 },
    { label: "Co-Trainer", betrag: 30 },
    { label: "Betreuer", betrag: 30 }
  ],
  lizenzen: [
    { label: "ohne Lizenz", betrag: 0 },
    { label: "Basis", betrag: 0 },
    { label: "C", betrag: 25 },
    { label: "B", betrag: 50 },
    { label: "B Elite", betrag: 100 },
    { label: "A", betrag: 250 }
  ],
  landesebene: [
    { label: "nein", betrag: 0 },
    { label: "ja", betrag: 50 }
  ],
  jahrgangsleiter: [
    { label: "ja, bis E", betrag: 25 },
    { label: "ja, ab D", betrag: 50 }
  ]
};

// Die Datenbereiche der App (Reihenfolge = Tab-Reihenfolge).
const BEREICHE = [
  { id: "trainer", label: "Trainer", berechnet: true },
  { id: "schwerpunkt", label: "Schwerpunkttrainer", berechnet: false },
  { id: "foerderung", label: "Förderung", berechnet: false }
];

const APP_CHANGELOG = [
  {
    version: "1.0",
    groups: [
      {
        title: "Personalkosten",
        items: [
          "Löst die Excel „Personalkosten Mannschaften“ ab: Trainer, Schwerpunkttrainer und Förderung als bearbeitbare Tabellen.",
          "Kosten-Übersicht mit Summen je Bereich und je Mannschaft, monatlich und aufs Jahr hochgerechnet.",
          "Filterbare Tabellen (Suche + Mannschaft/Position/Lizenz) — auch fürs Handy."
        ]
      },
      {
        title: "Berechnung (Trainer)",
        items: [
          "Aufwandsentschädigung wird automatisch aus Position + Lizenz + Landesebene + Jahrgangsleiter berechnet und mit dem Stellenanteil multipliziert.",
          "Die €-Sätze pflegt der Admin im Bereich „Parameter“; ein manueller Überschreibwert je Person ist möglich.",
          "Beim Anlegen eines Trainers können Mannschaft und Lizenz optional aus dem zentralen Trainerprofil übernommen werden (einmalig, weiterhin frei änderbar)."
        ]
      },
      {
        title: "Export",
        items: [
          "Personalübersicht exportierbar — als Text (.txt) zum Weitergeben, als PDF zum Drucken/Ablegen oder als CSV (.csv) für Excel/Tabellenprogramme (Zahlenspalten direkt weiterrechenbar).",
          "Frei wählbar, welche Bereiche (Trainer, Schwerpunkttrainer, Förderung) und welche Angaben (Mannschaft, Position, Lizenz, AE/Monat, …) enthalten sein sollen."
        ]
      },
      {
        title: "Bearbeiten & Speicherung",
        items: [
          "Personen, Saisons und Parameter anlegen/ändern/löschen sowie der Import sind dem Bearbeiten-Recht der Gruppen-Verwaltung vorbehalten; mehrere Saisons sind planbar (Saison duplizieren als Startpunkt).",
          "Die Saison-Auswahl zum Ansehen bleibt für alle freigegebenen Nutzer möglich, nur Nutzer mit Bearbeiten-Recht setzen die geteilte Standard-Saison neu.",
          "Automatische Nextcloud-Synchronisierung über die zentrale Anmeldung (Tools-Übersicht) — kein separates Passwort.",
          "Sichtbar nur für die freigegebene Gruppe (sensible Kostendaten)."
        ]
      }
    ]
  }
];
