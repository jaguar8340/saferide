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
  - Admin Routes: Auth, Content (PUT + PATCH dot-notation), Testimonials/Gallery CRUD, Submissions, `/api/upload` (Bild **+ Video** mp4/mov/webm, 60 MB), Locations POST/PATCH/DELETE
  - **Idempotente Seed-Migration** für Locations: fügt neue Felder hinzu, hebt FAQs auf 15, ergänzt `description_de/en` auf existierenden `exam_routes` ohne Admin-Edits zu zerstören
  - Default-Seed: Content + Testimonials + Gallery + Ablauf/VKU + 11 Standorte
- **Frontend (`/app/frontend/src/`)**
  - `/` Homepage mit Hash-Scroll-Effekt; dynamisches `document.title` pro Route
  - `/ablauf`, `/vku` – statische Sub-Seiten mit identischem Header
  - **`/fahrschule-<slug>` – 11 SEO-Landingpages** mit:
    - Hero: H1 immer "Fahrschule {Ort}", City-Pill, links Probelektion-CTA + Tel-Link, **rechts `NadineIntroCard` (Foto ODER Video Upload, "Ich bin Nadine" Intro, 2 Stats)**
    - "Warum {Ort}?" + Ideal-for-Punkte
    - **Prüfungsstrecken: Titel + Beschreibung pro Strecke (inline editierbar) + Outro-Paragraph darunter**
    - Treffpunkt + Google Maps iFrame
    - "Warum Safe Ride die richtige Fahrschule in {Ort} ist" (6 Punkte)
    - Preise
    - Galerie (Upload/Replace/Delete)
    - Google Reviews CTA (G-Logo + 5,0★ + 60+ Reviews + editierbarer per-Location-URL)
    - **"Ausserdem in folgenden Regionen für dich da" – Cards-Grid mit den 10 anderen Standorten** und Hover-Effekt
    - **15 FAQs als TRUE Accordion** (nur eine Antwort gleichzeitig offen, auch im Edit-Modus)
    - Bottom-CTA
  - Header identisch auf allen Seiten (7 Items + DE/EN + Anfragen)
  - Google-Reviews-Integration auf Startseite (Cards mit "GOOGLE · Datum"-Badge + Auf-Google-ansehen-CTA)
  - **`EditableMedia`** – Image-+-Video-Upload-Widget mit Foto/Video-Toggle
  - **`NadineIntroCard`** – wiederverwendbarer Personal-Intro-Block (Hero-Rechts, alle Landingpages)
  - **`OtherLocationsSection`** – filtert current slug aus, rendert Rest als Cards
  - Admin-Dashboard mit "Seiten & Standorte"-Tab
- **SEO**
  - `/api/sitemap.xml` mit 14 URLs, public Base-URL aus X-Forwarded-Host
  - `/robots.txt` (von Cloudflare im Preview überschrieben – in Production via DNS-Domain kontrollierbar)
  - Dynamic `document.title` pro Route, SEO-Title/Description per Standort
- **Tested (2026-02)**: 
  - iteration_6: Backend 10/10 + Frontend 100% (Nadine-Card mit img/video render, Routes-Outro, OtherRegions-10-Cards, FAQ-Accordion 0→1→1)
  - iteration_5: 21/21 neue Feature-Tests
  - Regression-Total: ~76/78 (2 bekannte xdist-Fixture-Races)
  - Migration-Safety verifiziert (existierende Daten bleiben erhalten)

## Test Credentials
admin@saferide.ch / SafeRide2026!

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
