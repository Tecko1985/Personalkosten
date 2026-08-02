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
          "Planung und Auswertung der Aufwandsentschädigungen aller Mannschaften — an Stelle der bisherigen Excel-Tabelle.",
          "Drei Bereiche als bearbeitbare Tabellen: Trainer, Schwerpunkttrainer und Förderung.",
          "Kosten-Übersicht mit Summen je Bereich und je Mannschaft, monatlich und aufs Jahr hochgerechnet.",
          "Tabellen mit Suche und Filter nach Mannschaft, Position und Lizenz.",
          "Mehrere Saisons planbar; eine bestehende Saison lässt sich als Startpunkt duplizieren."
        ]
      },
      {
        title: "Wie die Aufwandsentschädigung berechnet wird",
        items: [
          "Der Betrag ergibt sich aus Position, Lizenz, Landesebene und Jahrgangsleiter-Funktion und wird mit dem Stellenanteil multipliziert.",
          "Die Euro-Sätze dahinter stehen im Bereich „Parameter“ und sind dort pflegbar.",
          "Je Person lässt sich der berechnete Wert von Hand überschreiben, wenn eine Vereinbarung davon abweicht.",
          "Beim Anlegen eines Trainers können Mannschaft und Lizenz aus dem zentralen Trainerprofil übernommen werden — einmalig beim Anlegen, danach frei änderbar."
        ]
      },
      {
        title: "Wer darf was",
        items: [
          "Das Werkzeug ist nur für die freigegebene Gruppe sichtbar, weil es sensible Kostendaten enthält.",
          "Sehen: alle Tabellen und Summen, schreibgeschützt. Die Saison lässt sich zum Ansehen wechseln.",
          "Bearbeiten: Personen und Parameter anlegen, ändern und löschen. Dazu der Export und das Setzen der gemeinsamen Standard-Saison.",
          "Administrieren: zusätzlich Saisonverwaltung und Daten-Import im Reiter „Einstellungen“.",
          "Der Reiter „Info“ ist für alle sichtbar."
        ]
      },
      {
        title: "Export",
        items: [
          "Die Personalübersicht lässt sich in drei Formaten ausgeben: als Text zum Weitergeben, als PDF zum Drucken oder Ablegen und als CSV für Excel.",
          "Im CSV sind die Zahlenspalten echte Zahlen und lassen sich direkt weiterrechnen.",
          "Frei wählbar, welche Bereiche und welche Spalten enthalten sein sollen."
        ]
      },
      {
        title: "Bedienung am Handy",
        items: [
          "Die Ansicht ist für das Handy gebaut; Suche und Filter helfen dort mehr als die breite Tabelle.",
          "Eingabefelder sind mindestens 16 Pixel groß, damit der iPhone-Browser beim Antippen nicht ungefragt in die Seite hineinzoomt und verschoben stehen bleibt."
        ]
      },
      {
        title: "Daten & Speicherung",
        items: [
          "Gespeichert wird in der Vereins-Nextcloud über die zentrale Anmeldung der Tools-Übersicht — ein eigenes Passwort braucht es nicht.",
          "Ändern zwei Geräte gleichzeitig denselben Stand, erkennt die App das, lädt den fremden Stand nach und sagt Bescheid."
        ]
      }
    ]
  }
];
