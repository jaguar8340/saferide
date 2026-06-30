# Fahrschule Safe Ride – Product Requirements Document

## Original Problem Statement
> "Bau mir eine Website für die Fahrschule safe ride. https://www.fahrschule-saferide.ch/. Sie soll stylisch und modern sein und Kunden ansprechen. Bearbeitbar sollte sie via CMS sein das im Hintergrund läuft"

## User Choices
- Eingebautes CMS, **Wix-Stil**: Klick auf Text/Bild → direkt bearbeiten/ersetzen → sofort live
- Sprachen: Deutsch + Englisch
- Funktionen: Kontaktformular, Bildergalerie, Bewertungen
- Design: jung, modern, bold & dynamisch (kräftige Farben, grosse Typografie, viel Bewegung) – kein Black-Theme
- Kein Kundenlogin
- Echtes Datei-Upload für Galerie
- **Neue Unterseiten**: Ablauf zum Führerschein + VKU-Unterricht (Inhalte wie Referenzseite)
- **9 SEO-Landingpages** unter `/fahrschule-<slug>` (Einsiedeln, Siebnen, Lachen, Wädenswil, Horgen, Altendorf, Chur, Lenzerheide, Rapperswil) – nicht im Hauptmenü, aber im Admin findbar

## Architecture
- FastAPI + MongoDB backend, React 19 + Tailwind + Shadcn UI frontend
- Auth: Custom JWT bcrypt (Playbook via integration_playbook_expert_v2)
- File Storage: Emergent Object Storage
- Design: Cream-Theme (#fbf9f6) + Coral-Accent (#ff5a36), Display-Font + Serif-Italic-Highlights

## User Personas
- **Fahrschüler:in (17–30)** – browst Angebot/Preise/Bewertungen, sendet Kontaktanfrage, kommt per Google-Suche auf eine Standortseite (`/fahrschule-einsiedeln`)
- **Nadine Stäubli (Admin)** – meldet sich an, bearbeitet ALLES direkt auf der Live-Seite, inkl. der 9 Standort-Landingpages über `/admin → Seiten & Standorte`

## What's Implemented (2026-02)
- **Backend (`/app/backend/server.py`, `default_pages.py`)**
  - JWT-Auth, MongoDB-Collections: `users`, `site_content`, `testimonials`, `gallery`, `contact_submissions`, **`locations` (UNIQUE INDEX slug)**
  - Public Routes: `/api/content`, `/api/testimonials`, `/api/gallery`, `/api/contact`, **`/api/locations`, `/api/locations/{slug}`**
  - Admin Routes: Auth, Content (PUT + PATCH dot-notation), Testimonials/Gallery CRUD, Submissions, **`/api/upload`**, **Locations POST/PATCH/DELETE**
  - **Idempotenter Seed-Merge** für neue Top-Level- und Sub-Keys auf bestehenden Installationen
  - Default-Seed: Content + 6 Testimonials + 6 Gallery + **Ablauf/VKU-Inhalt + 9 Standort-Dokumente**
- **Frontend (`/app/frontend/src/`)**
  - `/` Public-Site: Hero, Marquee, About, Services, Fleet, Pricing, Gallery, Testimonials, Contact, Footer
  - **`/ablauf`** – Schritt-für-Schritt-Seite zum Führerausweis (4 Schritte + externe Antrags-Links + Outro-CTA)
  - **`/vku`** – Verkehrskundeunterricht (Preis CHF 210, Kurslokal Au/ZH, 8 Monatskarten, 4 Infos, CTA)
  - **`/fahrschule-<slug>`** – 9 Standort-Landingpages (Hero, Warum, Ideal-for, Prüfungsstrecken, Treffpunkt + Google Maps, Preise, Galerie, FAQ, CTA) mit eigenem PATCH-Endpoint und vollständigem Inline-Editing
  - DE/EN-Sprachkontext, dynamisches `document.title` pro Route
  - **`SubPageHeader`** für Sub-Pages mit aktiver Nav, **`SectionTitle`** behält Signatur-Italic-Highlight im View-Modus und wird ein editierbares Element im Edit-Modus
  - Wix-ähnliches Inline-CMS **erweitert**: ALLE bisher hardcoded Texte (Hero-Tags, "Call Nadine", Regions, Rating, About-Badge "Nadine Stäubli", alle Sektions-Overlines/Titel, "Beliebt"-Tag, CTA-Texte, Footer-Tagline) sind nun editierbar
  - `EditableImage`-Upload für ALLE Sub-Pages (Hero, About, Fleet, Standort-Galerie etc.)
  - Admin-Dashboard mit neuem Tab **"Seiten & Standorte"** (`PagesManager`) – listet Ablauf/VKU + alle 9 Standorte als Direkt-Links
- **Tested (2026-02)**: 
  - Backend pytest 46/47 (1 flaky fixture-race, pre-existing)
  - Frontend 100% – Inline-Edit Persistenz E2E verifiziert (badge_name + meet_address_de geschrieben und zurückgesetzt)
  - Alle 9 Standortseiten laden mit korrektem SEO-Title

## Test Credentials
Siehe `/app/memory/test_credentials.md` (admin@saferide.ch / SafeRide2026!)

## P1 / P2 / P3 Backlog
- **P1 – E-Mail-Benachrichtigungen** an Nadine bei Kontaktanfrage (Resend/SendGrid)
- **P1 – PATCH-Pfad-Allowlist** für `/api/content` und `/api/locations/{slug}` (Hardening)
- **P1 – Selbst-gehostete Hero-Bilder** für die 9 Standorte statt Unsplash (Permanenz)
- **P2 – sitemap.xml & robots.txt** mit allen 9 Standort-URLs für maximale SEO-Sichtbarkeit
- **P2 – Online-Buchung** (Kalender pro Service)
- **P2 – Online-Bezahlung** (Stripe für Pakete / Gutscheine)
- **P2 – Cache-Control-Header** auf `/api/locations/{slug}` (mostly-static)
- **P3 – Multi-Instructor-Teamseite**
- **P3 – Impressum / Datenschutz**
- **P3 – Routing-Refactor**: server.py in routers/auth, routers/content, routers/locations etc. aufteilen
