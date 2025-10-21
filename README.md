# Fahrschule Saferide - Abrechnungssystem

Ein modernes und übersichtliches Abrechnungssystem für die Fahrschule Saferide.

## 🚀 Funktionen

### ✅ Transaktionsverwaltung
- Einnahmen und Ausgaben pro Monat erfassen
- Datum, Bezeichnung, Betrag, Konto-Auswahl
- Bemerkungsfeld für zusätzliche Notizen
- Datei-Upload (Foto oder PDF) pro Transaktion
- Transaktionen bearbeiten und löschen

### 📊 Berechnungen & Übersichten
- **Total Einnahmen**: Summe aller Einnahmen
- **Total Ausgaben**: Summe aller Ausgaben  
- **Total Einkommen**: Einnahmen - Ausgaben (grün wenn positiv, rot wenn negativ)
- **Monatsansicht**: Detaillierte Übersicht pro Monat mit Navigation
- **Jahresübersicht**: Monatliche Totals für das gesamte Jahr
- **Buchhaltung/Abschluss**: Konten-basierte Jahresübersicht

### 📄 PDF-Export
- Einzelne Monate als PDF exportieren
- Einfache Tabelle mit allen Transaktionen
- Automatische Berechnung der Totals

### 👥 Benutzerverwaltung
- **Admin-Rolle**: Voller Zugriff auf alle Funktionen
- **Benutzer-Rolle**: Kann Transaktionen verwalten, aber keine Konten anlegen
- Sichere Authentifizierung mit JWT
- Benutzername/Passwort-Anmeldung

### ⚙️ Kontenverwaltung (Admin only)
- Konten frei anlegen und verwalten
- Beispiele: "Einnahmen Fahrstunden", "Ausgaben Leasing", "Ausgaben Miete"
- Jedes Konto kann vom Typ "Einnahmen" oder "Ausgaben" sein

## 🔐 Anmeldedaten

### Standard-Admin:
- **Benutzername**: `admin`
- **Passwort**: `admin123`

## 📱 Benutzeroberfläche

Das System verfügt über ein modernes, übersichtliches Design mit:
- Hellen Farben mit Rot-Ton (Saferide Branding)
- Intuitive Navigation
- Responsive Design
- Klare Visualisierung der Finanzübersicht

### Verfügbare Seiten:
1. **Login**: Anmeldung
2. **Dashboard**: Monatsansicht mit Transaktionen
3. **Jahresübersicht**: Monatliche Zusammenfassung
4. **Buchhaltung/Abschluss**: Konten-basierte Übersicht
5. **Konten verwalten**: Konten anlegen/löschen (Admin)
6. **Benutzer verwalten**: Benutzer erstellen/löschen (Admin)

## 🛠️ Technologie-Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React
- **Datenbank**: MongoDB
- **PDF-Generation**: ReportLab
- **UI-Komponenten**: Shadcn UI
- **Authentifizierung**: JWT + bcrypt

## 📋 Vorinstallierte Konten

Das System kommt mit folgenden vordefinierten Konten:

**Einnahmen:**
- Einnahmen Fahrstunden
- Einnahmen Theorie

**Ausgaben:**
- Ausgaben Leasing
- Ausgaben Miete
- Ausgaben Benzin

Admins können weitere Konten nach Bedarf hinzufügen.

## 🎨 Design-Features

- Moderne Schriftarten (Manrope für Überschriften, Inter für Text)
- Farbcodierung: Grün für Einnahmen, Orange für Ausgaben
- Helles, freundliches Design mit Rot-Akzenten
- Klare visuelle Hierarchie
- Shadow- und Hover-Effekte für bessere Benutzererfahrung

## 📝 Workflow

1. **Anmelden** mit Benutzername und Passwort
2. **Monat auswählen** mit den Navigationspfeilen
3. **Transaktion hinzufügen**: Datum, Beschreibung, Typ, Betrag, Konto, Bemerkungen
4. **Datei hochladen** (optional): Rechnung oder Beleg anhängen
5. **Übersichten ansehen**: Monats-, Jahres- oder Konten-Übersicht
6. **PDF exportieren**: Monatsbericht als PDF herunterladen
7. **Verwaltung** (Admin): Konten und Benutzer verwalten

## 🔒 Sicherheit

- Passwörter werden mit bcrypt gehasht
- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle
- Sichere API-Endpoints

## 📊 Berichte

Das System bietet zwei Hauptberichte:

1. **Monatsansicht**: Detaillierte Transaktionsliste mit Totals
2. **Jahresübersicht**: Zusammenfassung aller Monate
3. **Buchhaltung/Abschluss**: Konten-basierte Analyse

Alle Berichte können als PDF exportiert werden.

---

**Viel Erfolg mit dem Abrechnungssystem!** 🚗💼
