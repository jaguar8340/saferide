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
  - JWT-Auth, MongoDB-Collections: `users`, `site_content`, `testimonials`, `gallery`, `contact_submissions`, `locations` (UNIQUE INDEX slug), `files`
  - Public Routes: `/api/content`, `/api/testimonials`, `/api/gallery`, `/api/contact`, `/api/locations`, `/api/locations/{slug}`, `/api/sitemap.xml`
  - Admin Routes: Auth, Content (PUT + PATCH dot-notation), Testimonials/Gallery CRUD, Submissions, `/api/upload` (Bild + Video mp4/mov/webm, 60 MB), Locations POST/PATCH/DELETE
  - **Idempotente Seed-Migration** für Locations: fügt neue Felder hinzu, hebt FAQs auf 15, ergänzt `description_de/en` auf existierenden `exam_routes` ohne Admin-Edits zu zerstören
  - **One-time Unsplash→Pexels Migration** für `hero_image_url` (preserves /api/files/ Admin-Uploads) ← NEU 2026-06
  - Default-Seed: Content + Testimonials + Gallery + Ablauf/VKU + 11 Standorte + Impressum (5 Sektionen) + Datenschutz (6 Sektionen) + **`logo_url`** ← NEU 2026-06
- **Frontend (`/app/frontend/src/`)**
  - **`BrandLogo`** Komponente – Safe Ride Chrome-Logo (Customer-Asset) auf Navy-Hintergrund, Header (eingebettet in Navy-Badge auf Cream-BG) und Footer (direkt auf Navy-BG). Admin kann Logo via Upload-Button global ersetzen ← NEU 2026-06
  - **Footer komplett neu**: 4-Spalten-Grid mit Logo + Tagline + Social, Kontakt-Spalte, **11 Standort-Links** (`footer-location-{slug}`), Bottom-Bar mit Impressum/Datenschutz/Admin ← NEU 2026-06
  - `/` Homepage mit Hash-Scroll-Effekt; dynamisches `document.title` pro Route
  - `/ablauf` + `/ablauf-zum-fuehrerschein` (canonical → lange URL) ← Canonical NEU 2026-06
  - `/vku` + `/vku-unterricht` (canonical → lange URL) ← Canonical NEU 2026-06
  - `/impressum`, `/datenschutz` – editierbare Rechtsseiten via gemeinsame `LegalPage.jsx`
  - `/fahrschule-<slug>` – 11 SEO-Landingpages (10 Sub-Komponenten in `/components/location/`):
    - Hero, Why-Ideal, NadineIntroCard (GLOBAL), Routes, Treffpunkt+Map, WhySafeRide, Preise, Gallery, GoogleReviews, FAQ-Accordion, CTA
    - **OtherLocationsSection: jede Karte hat Inline-Upload-Button im Edit-Modus** → Admin kann alle 11 Standortbilder von einer Seite aus austauschen, PATCHes `/api/locations/{slug}` ← NEU 2026-06
  - Google-Reviews-Integration auf Startseite
  - **`CanonicalLink`** Komponente für SEO Canonical Tags ← NEU 2026-06
- **SEO**
  - `/api/sitemap.xml` mit 16 URLs (homepage, ablauf-zum-fuehrerschein, vku-unterricht, impressum, datenschutz, 11 Locations)
  - Canonical Tags auf Ablauf/VKU verweisen auf die SEO-freundlichen langen URLs
  - Dynamic `document.title`, SEO-Title/Description per Standort
- **Tested (2026-06)**:
  - iteration_10: Backend 15/15 + Frontend 100% (BrandLogo, Footer-11-Links, Inline-Upload, Pexels-Migration, Canonical Tags) ✓
  - iteration_9: Backend 13/13 + Frontend 9/9 (Legal Pages, Route Aliases, Sitemap)
  - iteration_8: Backend 21/21 + Frontend 100% (LocationPage refactor, Nadine global)

## Test Credentials
admin@saferide.ch / SafeRide2026!

## P1 / P2 / P3 Backlog
- **P1 – E-Mail-Benachrichtigungen** an Nadine bei Kontaktanfrage (Resend/SendGrid)
- **P1 – PATCH-Pfad-Allowlist** für `/api/content` und `/api/locations/{slug}` (Hardening)
- **P1 – Selbst-gehostete Hero-Bilder** für die 11 Standorte statt Pexels/Unsplash (Permanenz) – Admin kann jetzt einfach via Inline-Upload austauschen
- **P2 – Online-Buchung** (Kalender pro Service)
- **P2 – Online-Bezahlung** (Stripe für Pakete / Gutscheine)
- **P2 – Cache-Control-Header** auf `/api/locations/{slug}` (mostly-static)
- **P2 – Native `confirm()` ersetzen** durch Radix AlertDialog (LegalPage, LocFaq) für bessere UX/Testbarkeit
- **P2 – Locations in Footer cachen** statt N Requests pro Session (React Query oder shared Context)
- **P3 – Multi-Instructor-Teamseite**
- **P3 – Routing-Refactor**: server.py in `routers/auth`, `routers/content`, `routers/locations` etc. aufteilen
- **P3 – Layout-level CanonicalLink** statt pro-Seite (verhindert stale Tags bei Route-Wechsel)
