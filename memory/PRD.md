# Fahrschule Safe Ride – Product Requirements Document

## Original Problem Statement
> "Bau mir eine Website für die Fahrschule safe ride. https://www.fahrschule-saferide.ch/. Sie soll stylisch und modern sein und Kunden ansprechen. Bearbeitbar sollte sie via CMS sein das im Hintergrund läuft"

## User Choices (verbatim from clarification)
- Eingebautes CMS (built-in admin panel)
- Sprachen: Deutsch + Englisch
- Funktionen: Kontaktformular, Bildergalerie, Bewertungen (Testimonials)
- Sportliches Design
- Kein Kundenlogin

## Architecture
- **Stack**: FastAPI + MongoDB (motor) backend, React 19 + Tailwind + Shadcn UI frontend
- **Auth**: Custom JWT Bearer auth (admin seeded from env on startup) – playbook by `integration_playbook_expert_v2`
- **Design system**: Dark theme, Cabinet Grotesk + Manrope fonts, Adrenaline Red (#FF2E00) accent on Carbon Black (#0A0A0A) base – per `/app/design_guidelines.json`

## User Personas
- **Driving school student (17–30 y/o)** – visits the public site, browses services / pricing / reviews, submits a contact form
- **Nadine Stäubli (admin)** – logs into `/admin`, manages all website content via the CMS

## Core Requirements (static)
- Modern, sporty marketing site with DE/EN language toggle
- Full bilingual content for every section
- Built-in admin CMS at `/admin` (no headless service)
- Contact form storing submissions in DB and viewable in admin
- Gallery + testimonial CRUD
- All public endpoints unauthenticated; all admin endpoints require JWT

## What's Implemented (2026-02)
- **Backend (`/app/backend/server.py`)**
  - JWT auth with bcrypt hashing, admin seeded from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
  - MongoDB collections: `users`, `site_content`, `testimonials`, `gallery`, `contact_submissions`
  - Public routes: `/api/`, `/api/content`, `/api/testimonials`, `/api/gallery`, `/api/contact`
  - Admin routes: `/api/auth/login`, `/api/auth/me`, content PUT, testimonials CRUD, gallery CRUD, submissions GET/PATCH/DELETE
  - Default seed for content + 6 testimonials + 6 gallery images on first run
- **Frontend (`/app/frontend/src/`)**
  - `/` public site: Hero (full-bleed sports car), kinetic Marquee, About Nadine, Services (6 cards), Fleet (Audi S3 / Opel OPC / Range Rover Sport), Pricing (4 plans), Gallery, Testimonials, Contact form, Footer
  - DE/EN language context with full translations
  - `/admin/login` JWT login screen
  - `/admin` dashboard with 4 tabs: Content Editor (full visual editor for hero/about/services/fleet/pricing/contact), Testimonials Manager, Gallery Manager, Submissions Viewer
- **Tested**: 16/16 backend pytest cases, 100% on frontend critical flows

## Test Credentials
See `/app/memory/test_credentials.md` (admin@saferide.ch / SafeRide2026!)

## P0 / P1 / P2 Backlog
- **P1 – Email notifications**: send an email to Nadine on every new contact submission (Resend / SendGrid integration)
- **P1 – Image upload**: replace URL-based gallery upload with native file upload via object storage
- **P2 – Online booking**: calendar-based booking flow per service (extend pricing CTA)
- **P2 – Online payment**: Stripe integration for lesson packages / vouchers
- **P2 – Blog / news section**: editable from CMS for SEO
- **P3 – Multi-instructor support**: add team page with separate profiles
- **P3 – Imprint / privacy pages**: editable legal pages
