# Fahrschule Safe Ride – Product Requirements Document

## Original Problem Statement
> "Bau mir eine Website für die Fahrschule safe ride. https://www.fahrschule-saferide.ch/. Sie soll stylisch und modern sein und Kunden ansprechen. Bearbeitbar sollte sie via CMS sein das im Hintergrund läuft"

## User Choices (verbatim from clarification)
- Eingebautes CMS (Wix-ähnlich: Klick auf Text/Bild → direkt bearbeiten/ersetzen → sofort live)
- Sprachen: Deutsch + Englisch
- Funktionen: Kontaktformular, Bildergalerie, Bewertungen
- Design: jung, modern, bold & dynamisch (kräftige Farben, grosse Typografie, viel Bewegung) – **kein** Black-Theme
- Kein Kundenlogin
- Echtes Datei-Upload für Galerie (nicht URL-basiert)

## Architecture
- **Stack**: FastAPI + MongoDB (motor) backend, React 19 + Tailwind + Shadcn UI frontend
- **Auth**: Custom JWT Bearer auth, Admin aus env geseedet – playbook via `integration_playbook_expert_v2`
- **File Storage**: Emergent Object Storage – playbook via `integration_playbook_expert_v2`
- **Design**: Cream-Theme (#fbf9f6) + Coral-Accent (#ff5a36), Display-Font + Serif-Italic-Highlights

## User Personas
- **Fahrschüler:in (17–30)** – besucht öffentliche Seite, browst Angebot/Preise/Bewertungen, sendet Kontaktanfrage
- **Nadine Stäubli (Admin)** – meldet sich an, bearbeitet alle Inhalte direkt auf der Live-Seite (Wix-Style)

## Core Requirements (static)
- Moderne, sportliche Marketing-Seite mit DE/EN-Switcher
- Vollständig bilingualer Content je Sektion
- Inline-CMS direkt auf der Live-Seite (Wix-like)
- Klassisches `/admin`-Dashboard als Backup für Bulk-Management
- Kontaktformular speichert in DB, sichtbar in Admin
- Galerie & Testimonials CRUD
- Alle öffentlichen Endpunkte unauthentifiziert, alle Admin-Endpunkte erfordern JWT

## What's Implemented (2026-02)
- **Backend (`/app/backend/server.py`)**
  - JWT-Auth mit bcrypt, Admin aus env geseedet (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
  - MongoDB-Collections: `users`, `site_content`, `testimonials`, `gallery`, `contact_submissions`
  - Public Routes: `/api/`, `/api/content`, `/api/testimonials`, `/api/gallery`, `/api/contact`
  - Admin Routes: `/api/auth/login`, `/api/auth/me`, `/api/content` (PUT + **PATCH dot-notation `$set`**), Testimonials/Gallery CRUD, Submissions GET/PATCH/DELETE, **`/api/upload` (multipart → Emergent Object Storage)**
  - Seed bei Erststart: Content, 6 Testimonials, 6 Galerie-Bilder
- **Frontend (`/app/frontend/src/`)**
  - `/` Public-Site: Hero, Marquee, About, Services (6), Fleet, Pricing (4), Gallery, Testimonials, Contact, Footer
  - DE/EN-Sprachkontext
  - `/admin/login` redirected nach `/` (Inline-CMS)
  - **Wix-ähnliches Inline-CMS**:
    - `EditContext` mit debounced PATCH und optimistic update
    - `Editable`-Wrapper: macht jedes Text-Element mit `data-edit-path` contentEditable
    - `EditableImage`-Wrapper: Hover-Overlay mit "Bild ersetzen" → File-Picker → Upload → PATCH
    - `AdminToolbar` (fixed bottom): Bearbeiten/Vorschau-Toggle, Speicher-Status, Verwaltung, Anfragen, Logout
    - Gallery inline: Add/Replace/Delete + Caption-Edit
    - Testimonials inline: Add/Edit (text/name/date)/Delete
    - Marquee inline: Input statt animiertem Banner
    - Vorschau-Modus blendet alle Edit-Affordances aus
  - `/admin`-Dashboard mit 4 Tabs (Content/Testimonials/Gallery/Submissions) bleibt für Bulk-Operationen verfügbar
- **Tested**: 27/27 backend pytest (Regression + Upload + PATCH-Dot-Notation), 100% Frontend-Critical-Flows (siehe `/app/test_reports/iteration_3.json`)

## Test Credentials
Siehe `/app/memory/test_credentials.md` (admin@saferide.ch / SafeRide2026!)

## P1 / P2 / P3 Backlog
- **P1 – E-Mail-Benachrichtigungen**: Mail an Nadine bei jeder neuen Anfrage (Resend / SendGrid)
- **P1 – PATCH-Pfad-Allowlist**: nur erlaubte Pfade dürfen via PATCH `/api/content` gesetzt werden
- **P1 – Optimistic-Update-Rollback**: bei PATCH-Fehler lokalen State zurückrollen
- **P2 – Online-Buchung**: Kalender-Buchungsflow pro Service
- **P2 – Online-Bezahlung**: Stripe für Lektionspakete / Gutscheine
- **P2 – Blog / News**: editierbare Sektion für SEO
- **P2 – Orphan-File-Reaping**: alte Uploads aufräumen bei Bild-Ersatz / -Löschung
- **P3 – Multi-Instructor**: Teamseite mit mehreren Profilen
- **P3 – Impressum / Datenschutz**: editierbare Legal-Pages
