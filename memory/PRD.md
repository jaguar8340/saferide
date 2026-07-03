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

## What's Implemented (2026-02 / Updated 2026-06)
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
- **Pages-Inventar (Home)**
  - `Hero` → `Marquee` → `About` → **`WhySafeRide` (6 Pillars, ~800 Wörter)** → `Services` → `Fleet` → `Pricing` → `Gallery` → `Testimonials` → **`HomeFaq` (8 Accordion-FAQs)** → `Contact` ← NEU 2026-06
- **Blog (Variant B)**: `/blog` Liste mit Kategorie/Tag-Filter (URL-deeplinkable), Featured-Post + Grid; `/blog/{slug}` Detail mit inline-editierbarem Titel/Excerpt/Body/Kategorien/Tags/Author-Bio + Reading-Time + Publish-/Scheduled-Date-Pickers + Status (Draft/Geplant/Veröffentlicht). Auto-Publish wenn `status='scheduled' + scheduled_publish_at<=now` ← NEU 2026-06
- **Buchung**: `/buchung` mit 4 Paketen (Probelektion, 5er, 10er, VKU) als Auswahl-Cards; Booking-Form (Name, E-Mail, Tel, Wunschdatum/-zeit, Standort, Nachricht) speichert pending Booking auf Backend mit Package-Snapshot ← NEU 2026-06

## Tested (2026-06)
- iteration_13: Backend 11/11 (100%) + Frontend 98% (TopContactBar, Diplome-Lightbox, /partner CRUD inline-edit, Admin-Dashboard 5 neue Tabs)
- iteration_12: Backend 9/9 + Frontend 100% (Kantonswappen, Buchung inline-edit, Galerie uniform, Diplome-Modal)
- iteration_11: Backend 19/20 + Frontend 100% (Why-Section, Home-FAQ, Blog, Buchung)
- iteration_10: Backend 15/15 + Frontend 100% (BrandLogo, Footer 11-Links, OtherLocations upload)
- iteration_9: Backend 13/13 + Frontend 9/9 (Legal Pages, Route Aliases, Sitemap)
- iteration_8: Backend 21/21 + Frontend 100% (LocationPage refactor, Nadine global)

## NEU 2026-06 (Iteration 13)
- **TopContactBar**: Sticky Navy-Bar OBEN AUF JEDER SEITE mit Telefon-Nummer (One-Tap-Anruf via `tel:`-Link), Öffnungszeiten und Standorte-Übersicht. Bleibt sichtbar beim Scrollen
- **Diplome-Lightbox**: Klick auf Diplom-Bild öffnet Vollbild-Overlay mit Prev/Next-Pfeilen, Tastatur-Navigation (Esc/Arrows), Counter
- **`/partner` Seite**: 6 Default-Partner (DRIVESWISS, asa, Samariter Lachen, Audi Zentrum, SFV, SGS) als Cards. Vollständig inline-editierbar (Name, Kategorie, Beschreibung, Website-URL, Logo-Upload). Admin-Button „+ Neuer Partner". Header-Link „Partner" + Sitemap-Eintrag
- **Admin-Dashboard 5 neue Tabs**: Blog, Buchungen, Pakete, Diplome, Partner
  - Blog: Liste mit Status-Select (Draft/Geplant/Veröffentlicht), Öffnen-Button, Löschen
  - Buchungen: Split-View mit Liste links + Detail-Panel rechts; Status-Workflow (Offen/Bestätigt/Storniert), Telefon/E-Mail tappable, Paket-Snapshot
  - Pakete: Liste mit Aktiv/Inaktiv-Toggle + Löschen (Edit verweist auf /buchung Inline-Editor)
  - Diplome: Grid-Übersicht mit Löschen (Upload verweist auf About-Bereich Modal)
  - Partner: Liste mit Logo, Kategorie, Name, Website (Edit verweist auf /partner Inline-Editor)
  - Fixed: +Paket onClick refactored to named `handleAddPackage()` with explicit error logging (POST /api/packages now fires reliably; manual verification 2026-06)
  - Improved: CantonWappen now detects MULTIPLE canton codes in one label ("Kanton ZH / SZ" → renders BOTH ZH + SZ shields)
- iteration_11: Backend 19/20 + Frontend 100% (Why, FAQ, Blog, Buchung)
- iteration_10: Backend 15/15 + Frontend 100% (BrandLogo, Footer-11-Links, Inline-Upload, Pexels-Migration, Canonical)
- iteration_9: Backend 13/13 + Frontend 9/9 (Legal Pages, Route Aliases, Sitemap)
- iteration_8: Backend 21/21 + Frontend 100% (LocationPage refactor, Nadine global)

## NEU 2026-06 (Iteration 12)
- **Kantonswappen** als Inline-SVG (SZ, ZH, SG, GR) auf Homepage-Pricing, LocPrices und OtherLocationsSection — Multi-Canton-Detection rendert mehrere Schilder bei kombinierten Labels
- **Buchung-Seite VOLLSTÄNDIG inline-editierbar**: Hero overline/title/intro (Content-Keys `buchung_overline_de/en`, `buchung_title_de/en`, `buchung_intro_de/en`); Paket-Titel/Subtitle/Preis/Old-Price/Highlight/Features-Liste/Popular-Flag/Delete (via PATCH /api/packages/{slug}); +Paket-Button (POST /api/packages)
- **Galerie auf Homepage** in uniformes `aspect-square` Grid (2/3/4 Spalten responsive) statt Mosaic
- **Diplome & Zertifikate**: Neue Collection `certificates`, GET public + POST/PATCH/DELETE admin; `<CertificatesDialog/>` Modal via Button "Alle Diplome & Zertifikate ansehen" unter About-Stats; 4 Default-Zertifikate seeded; Admin kann hochladen/umbenennen/Jahr setzen/löschen direkt im Modal

## Test Credentials
admin@saferide.ch / SafeRide2026!

## P1 / P2 / P3 Backlog
- **P1 – Stripe-Integration** für direkte Bezahlung der Pakete und Probelektion (Pakete sind bereits modelliert)
- **P1 – E-Mail-Benachrichtigungen** an Nadine bei Kontaktanfrage UND bei neuer Buchung + Bestätigung an Schüler:in (Resend/SendGrid)
- **P1 – Admin-Dashboard-Tabs** für Blog (Drafts/Veröffentlicht), Buchungen (Pending/Bestätigt), Pakete
- **P1 – PATCH-Pfad-Allowlist** für `/api/content` und `/api/locations/{slug}` (Hardening)
- **P1 – Bookings-Status-Enum** als Pydantic Literal (verhindert beliebige Status-Strings)
- **P1 – Selbst-gehostete Hero-Bilder** für die 11 Standorte statt Pexels (Permanenz) – Admin kann via Inline-Upload austauschen
- **P2 – Hydration-Warning beheben**: `<option>`-Children werden vom Visual-Editor mit `<span>` umschlossen (React-Warnung im Console, keine Funktionsstörung)
- **P2 – Shadcn-Calendar** statt nativem `<input type="date">` auf der Buchungsseite
- **P2 – Blog-RSS-Feed** + Share-Buttons + verwandte Beiträge
- **P2 – Booking-Package-Snapshot vervollständigen** (features_de, duration_minutes)
- **P2 – Cache-Control-Header** auf `/api/locations/{slug}` (mostly-static)
- **P2 – Native `confirm()` ersetzen** durch Radix AlertDialog (LegalPage, LocFaq, BlogPost-Delete)
- **P2 – Locations in Footer cachen** statt N Requests pro Session
- **P2 – aria-pressed** auf Buchungs-Paket-Cards (a11y)
- **P3 – Multi-Instructor-Teamseite** + Author-Profile auf Blog
- ✅ **P2 – Routing-Refactor (DONE 2026-06, Iteration 15)**: `server.py` von 1580 → 76 Zeilen geschrumpft. Aufgesplittet in `core/` (db, security, storage), `models/schemas.py`, `seeds/` (defaults, startup), `routers/` (11 fokussierte Router: auth, content, testimonials, gallery, contact, uploads, locations, blog, bookings, entities, sitemap). 36/36 Backend-Tests grün, keine Verhaltensänderungen.
- ✅ **P2 – Comprehensive SEO Upgrade (DONE 2026-06, Iteration 16)**:
  - `public/index.html`: `<html lang="de">`, echter Title + Description, Open Graph (8 Tags), Twitter Card, Favicon (Brand-Logo), Theme-Color, Preconnect, statische `LocalBusiness` JSON-LD mit Phone/Hours/Rating
  - `public/robots.txt`: absolute Sitemap-URL, explizites Allow für GPTBot/ChatGPT-User/ClaudeBot/PerplexityBot/Google-Extended (Sichtbarkeit in AI-Suchen)
  - Neue `<Seo />` React-Komponente (`/components/site/Seo.jsx`): verwaltet imperativ `<title>`, `<meta description>`, OG, Twitter, Canonical, hreflang (de/en/x-default), `<html lang>` reaktiv und JSON-LD pro Seite. Konvertiert relative og:image-URLs automatisch zu absolute https.
  - JSON-LD pro Seite: `FAQPage` (Home + Locations), `LocalBusiness` mit Adresse + Canton (Locations), `BreadcrumbList` (Locations + BlogPost), `HowTo` (Ablauf), `Course` (VKU), `Blog` (BlogList), `BlogPosting` mit Author/Publisher/Image (BlogPost), `ItemList` mit Product+Offer (Buchung), `Organization` mit subOrganization (Partner)
  - Alle 9 Pages (Home, LocationPage, AblaufPage, VkuPage, LegalPage, BlogList, BlogPost, BuchungPage, PartnerPage) verwenden jetzt `<Seo />`
  - Frontend Tests: 75/75 (100%) durch `testing_agent_v3_fork` verifiziert
- ✅ **UX / Content Polish (DONE 2026-07, Iteration 17)**:
  - Emergent Badge (unten rechts) entfernt aus `public/index.html`
  - Top-Menü ohne "Bewertungen" und "Galerie" (Sections existieren weiter, sind nur nicht mehr im Nav verlinkt)
  - "Probelektion" komplett ersetzt durch "Lektion" (11 Content-Keys, 3 EN-Literale in WhatsAppFab/HomeFaq/BuchungPage, 7 JSX-Code-Änderungen in Location/Ablauf/Blog/Buchung, FAQ[6] in allen 11 Location-Docs, Booking-Package umbenannt: `probelektion-50` → `einzellektion-50` "Einzellektion"/"Single lesson")
  - **Mehr Farbe** an den Fahrschulautos (coral/orange/rot) orientiert: neue CSS-Tokens `--sr-blush`, `--sr-peach`, `--sr-amber`, `--sr-fire`, `--sr-sunset-a/b/c`; neue Utility-Classes `.bg-blush-soft`, `.bg-sunset-band`, `.bg-sunset-soft`, `.icon-bubble-accent`. WhySafeRide-Section jetzt mit Sunset-Soft-Gradient-BG; Services-Icons + WhySafeRide-Pillars mit Coral-Gradient-Bubbles; Pricing "Beliebt"-Card mit warmem Sunset-Gradient statt Dark-Navy.
  - **Neue Social-Feed-Section** (`SocialFeed.jsx`) unten auf der Homepage vor Contact: Zwei Karten (Instagram + TikTok), jede mit 6 bzw. 3 CMS-editierbaren Foto-Kacheln, Follow-Buttons zu den echten Profilen. Voll editierbar über Wix-Style CMS (Kachel-Bild + Link-URL). Keine externen Widget-Abos nötig.
- ✅ **Social-Feed-Polish (DONE 2026-07)**:
  - TikTok-Kachel-Layout adaptiv: 1 URL → zentriert, 2 URLs → 2 Spalten, mehr → 2/3-Spalten. Instagram bleibt 3-Spalten-Grid.
  - TikTok-Tile mit fixem `h-[620px]` (statt `aspect-[9/16]`), da TikTok-Embed Chrome (Username/Likes/Hashtags) enthält und sonst abgeschnitten wird.
  - Runtime-Error-Overlay-Suppression in `public/index.html` gehärtet: `stopImmediatePropagation` in Capture-Phase + legacy `window.onerror`-Fallback fangen alle Cross-Origin-"Script error."-Meldungen von Elfsight/Instagram/TikTok-Embeds ab.
