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
  - Public Routes: `/api/content`, `/api/testimonials`, `/api/gallery`, `/api/contact`, `/api/locations`, `/api/locations/{slug}`, **`/api/sitemap.xml`**
  - Admin Routes: Auth, Content (PUT + PATCH dot-notation), Testimonials/Gallery CRUD, Submissions, `/api/upload`, Locations POST/PATCH/DELETE
  - **Idempotente Seed-Migration** für Locations: fügt neue Felder hinzu, hebt FAQs von 4 → 15 ohne Admin-Edits zu zerstören
  - `_public_base_url`-Helper für Sitemap: PUBLIC_SITE_URL → X-Forwarded-Host → request.base_url
  - Default-Seed: Content + Testimonials + Gallery + Ablauf/VKU + **11 Standort-Dokumente** (jetzt mit Pfäffikon SZ + Richterswil)
- **Frontend (`/app/frontend/src/`)**
  - `/` Public-Site mit dynamischem `document.title` und Hash-Scroll-Effekt für `/#section`-Links von Sub-Pages
  - `/ablauf`, `/vku` – statische Sub-Seiten mit identischem Header
  - **`/fahrschule-<slug>`** – 11 SEO-Landingpages mit:
    - Hero: H1 immer "Fahrschule {Ort}", City-Description als Pill-Badge darunter
    - Why-Sektion + Ideal-for-Punkte
    - Prüfungsstrecken (Add/Remove inline)
    - Treffpunkt + Google Maps iFrame
    - **NEU: "Warum Safe Ride die richtige Fahrschule in {Ort} ist"** (dunkler Hintergrund, 6 Punkte mit Check-Icons)
    - Preise
    - Galerie (Upload/Replace/Delete inline)
    - **NEU: Google Reviews CTA** mit Google G-Logo, 5,0★, 60+ Bewertungen, editierbarer per-Location Reviews-URL
    - **15 FAQs** (statt 4) mit Intro-Paragraph
    - Bottom-CTA
  - **Identisches Header-Menu** auf ALLEN Seiten (Über mich / Angebot / Preise / Galerie / Bewertungen / Ablauf / VKU + DE/EN + Anfragen)
  - **Google-Reviews-Integration** auf Startseite (Testimonials-Sektion mit Google G-Logo + "Auf Google ansehen"-CTA + "GOOGLE · Datum" pro Karte)
  - `SectionTitle`-Helper für Italic-Highlight im View-Modus, editierbar im Edit-Modus
  - Wix-Inline-CMS: ALLE Texte editierbar (Hero-Tags, "Call Nadine", Regions, Rating, Badge, Section-Overlines/Titles, "Beliebt", CTA-Texte, Footer-Tagline, Why-Punkte, Google-Reviews-Felder pro Standort)
  - `EditableImage`-Upload für alle Hero-Bilder und Galerie-Einträge
  - Admin-Dashboard mit **"Seiten & Standorte"**-Tab (`PagesManager`) – listet Ablauf/VKU + alle 11 Standorte
- **SEO**
  - `/api/sitemap.xml` mit 14 URLs (Home + Ablauf + VKU + 11 Standorte), public Base-URL aus X-Forwarded-Host
  - `/robots.txt` in `public/` mit Sitemap-Direktive (Cloudflare überschreibt das im Preview – in Production via DNS-Domäne kontrollierbar)
  - Dynamic `document.title` pro Route
  - SEO-Title und SEO-Description per Standort (z. B. "Fahrschule Einsiedeln – Safe Ride · Auto fahren lernen in Einsiedeln")
- **Tested (2026-02)**: 
  - Backend pytest 66/68 (2 pre-existing xdist fixture-races) + Iteration_5 Suite 21/21
  - Frontend 100% – 11 Standorte verifiziert, 15 FAQs, Hero-H1 exakt "Fahrschule {Ort}", Google-Reviews-CTA, identisches Header-Menu, Hash-Scroll von Sub-Page zu Home-Sektion

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
