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
- ✅ **Location-Set Erweiterung & UX-Feinschliff (DONE 2026-07)**:
  - 3 neue Standorte hinzugefügt: Wetzikon (ZH), St. Gallen (SG), Domat/Ems (GR) → 14 total.
  - Elfsight Google-Reviews-Widget läuft global auf allen Location-Landingpages.
  - Footer breiter, kleinere Schrift → alle 14 Standorte auf einer Zeile.
  - Treffpunkte-Sektion: Karte + Foto nebeneinander (neues `meet_image_url` mit Upload-Overlay).
  - Neue `Speedo.jsx`-Komponente (SVG mit animiertem Nadel-Sweep via IntersectionObserver + easeOutCubic) ersetzt die 3 farbigen Stat-Rechtecke in der Über-mich-Sektion.
  - "11" → "14 Standorte" in Header, Seeds und DB.
- ✅ **VKU-Anmeldeformular + Preis-Konsolidierung + Location-Scoping (DONE 2026-07)**:
  - **VKU-Formular** ersetzt die alte "Achtung: Wichtige Infos"-Sektion auf `/vku-unterricht`. Felder: Vorname, Name, E-Mail, Telefon, Geburtsdatum, Kursauswahl (Dropdown auto-generiert aus `content.vku.months` – jede Session eine Option), Bemerkungen. POST an neues `/api/vku/registrations`.
  - **Backend**: `models/schemas.py` neue `VkuRegistration`/`VkuRegistrationCreate`, `routers/vku.py` mit POST (public) + GET/PATCH/DELETE (admin), registriert in `server.py`.
  - **Admin-Tab "VKU-Anmeldungen"** (`components/admin/VkuRegistrationsViewer.jsx`) – Liste mit Ungelesen-Zähler, Detail-Ansicht mit Kurs-Highlight, Löschen, Mark-as-read.
  - **Preis-Konsolidierung**: Startseite-Preise-Sektion und Buchung-Pakete lesen nun BEIDE aus derselben Quelle (`/api/packages`). `content.pricing.plans` wird ignoriert; nur noch Title/Subtitle/Note editierbar. LocationPage nutzt jetzt `<Pricing lockedCanton={loc.canton}>` statt der alten `<LocPrices>`.
  - **Kanonische Paketstruktur** (7 Pakete): `pkw-45` (ZH/SZ/SG 90), `pkw-60` (ZH/SZ/SG 120), `pkw-50-gr` (GR 110), `anhaenger-45` (alle 120), `5er-karte` (ZH/SZ/SG 440), `10er-karte` popular (ZH/SZ/SG 850), `vku-8h` (alle 240). Migration in `seeds/startup.py` wipe-t Legacy-Pakete einmalig.
  - **Kanton-Tabs** auf Startseite + Buchung (ZH/SZ/SG/GR). Location-Landingpages: locked auf loc.canton, keine Tabs. Cards zeigen Kanton-Badges.
  - **API-Filter** `/api/packages?canton=ZH` – leere `cantons` = überall verfügbar.
  - **Admin PackagesManager erweitert**: gruppiert nach Kanton-Signatur, Klick-zu-Toggeln Kanton-Pillen pro Paket, Filter-Bar (Alle/ZH/SZ/SG/GR). Zentrale Preisverwaltung ohne Umweg über Standort-spezifische Duplicate.
  - **3 neue Standorte** hinzugefügt in `/app/backend/default_pages.py`: Wetzikon (ZH), St. Gallen (SG), Domat/Ems (GR). Gesamtzahl jetzt 14. Idempotenter Seed fügt sie beim Backend-Start automatisch der Mongo-DB hinzu.
  - **Google-Reviews-Widget** (Elfsight) läuft auf allen Location-Landingpages automatisch via globales `content.reviews_embed_html` + `reviews_embed_enabled` (bereits im Code, verifiziert auf `/fahrschule-altendorf` mit echten Reviews).
  - **Footer** (`/app/frontend/src/components/site/Footer.jsx`): Standorte-Spalte von `md:col-span-5` → `md:col-span-6`, Brand von 4 → 3 Spalten reduziert, Text auf `text-[13px]` verkleinert, `whitespace-nowrap` erzwingt eine Zeile pro Standort. Alle 14 Standorte passen jetzt sauber in 3 Spalten × 5 Reihen.
  - **Treffpunkte** (`/app/frontend/src/components/location/LocMeetMap.jsx`): Layout umgebaut auf Info(4) + Map(4) + Foto(4). Neues Feld `meet_image_url` mit `EditableImage`-Upload-Overlay; Karte und Foto sind gleich gross und nebeneinander. Beide haben feste Corner-Labels ("Karte" / "Treffpunkt").
  - **Animierte Tacho-Statistiken** auf der Startseite: Neue Komponente `/app/frontend/src/components/site/Speedo.jsx` (Pure-SVG, ohne Extra-Abhängigkeit) mit 240°-Bogen, farbigem Fill, 11 Tick-Marks und Nadel, die per `IntersectionObserver` + `requestAnimationFrame` mit `easeOutCubic` auf ihren Zielwert sweept. In `About.jsx` ersetzen 3 Speedos die farbigen Rechtecke (Coral 86%, Blue 62%, Amber 74%).
  - "11 Standorte" → "14 Standorte" in `TopContactBar.jsx` (Header), `defaults.py` (Seeds für neue Installs) und DB (`homepage_faqs.0.answer_de/en`, `why_safe_ride.pillars.4.title_en`) via PATCH-API aktualisiert.
  - TikTok-Kachel-Layout adaptiv: 1 URL → zentriert, 2 URLs → 2 Spalten, mehr → 2/3-Spalten. Instagram bleibt 3-Spalten-Grid.
  - TikTok-Tile mit fixem `h-[560px]` (statt `aspect-[9/16]`), da TikTok-Embed Chrome (Username/Likes/Hashtags) enthält und sonst abgeschnitten wird.
  - **TikTok-Karte visuell an Instagram angeglichen (2026-07)**: Weisser Karten-Hintergrund statt Navy-Dark, Coral-Icon-Bubble, Coral-`Folgen`-Button, hell-graue Edit-Mode-Inputs — Instagram- und TikTok-Card sind nun optisch identisch.
  - Runtime-Error-Overlay-Suppression in `public/index.html` gehärtet: Capture-phase `stopImmediatePropagation`, `window.onerror`-Fallback, PLUS `MutationObserver` + periodisches `setInterval(500ms)`, das das webpack-dev-server-`<iframe id="webpack-dev-server-client-overlay">` per `contentDocument.body.textContent`-Check bei "Script error"/"ResizeObserver loop"-Meldungen entfernt (dev-only, Production unbetroffen).
- ✅ **Motorsport/Racing Design-Variante (DONE 2026-07)** unter `/preview/sport`:
  - Vollständig isolierte Alternative-Homepage, aktuelles Live-Design bleibt 100% unverändert.
  - Neuer Ordner `/app/frontend/src/components/sport/` (PreviewBanner, SportHeader, SportHero, SportMarquee, SportAbout, SportWhy, SportStatsBar, SportServices, SportFleet, SportPricing, SportContact, SportFooter) + Page `/app/frontend/src/pages/SportPreview.jsx`.
  - Scoped CSS in `/app/frontend/src/sport.css` (nur unter `.sport-root` aktiv): Font-Imports Bebas Neue + Outfit + JetBrains Mono, Carbon-Textur, Checker-Pattern, Speedlines, Skew-Buttons.
  - Palette: Deep-Obsidian `#09090b` + Racing-Red `#e11d48` + Pure-White. Diagonale Grid-Clip-Cards, Rev-Counter-Visual, Marquee mit Checkered-Flag-SVGs.
  - Sektions-Reihenfolge: Hero → Marquee → About (Pilot-Karte) → Why (Data-Cards) → Stats → Services → Fleet → Pricing (Race Packages) → Boxenstopp → Footer.
  - Nutzt CMS-Content read-only via `useEdit()`, Kontaktformular postet an gleichen `/api/contact`-Endpoint.
  - Fester Preview-Banner mit "Zur Live-Site"-Link + zusätzlicher Rück-Link im Sport-Footer. WhatsApp-FAB auf `/preview/*` deaktiviert.
- ✅ **Elegant Premium Design-Variante (DONE 2026-07)** unter `/preview/elegant`:
  - Zweite vollständig isolierte Alternative, Live-Design unverändert.
  - Ordner `/app/frontend/src/components/elegant/` (ElegantPreviewBanner, ElegantHeader, ElegantHero, ElegantAbout, ElegantWhy, ElegantServices, ElegantFleet, ElegantPricing, ElegantContact, ElegantFooter) + Page `/app/frontend/src/pages/ElegantPreview.jsx`.
  - Scoped CSS in `/app/frontend/src/elegant.css` (nur unter `.elegant-root`): Playfair Display + Cormorant Garamond + Manrope, Champagne-Cream `#faf6f0` + Midnight-Navy `#0d1b2a` + Champagne-Gold `#c9a961`, gold-gerahmte Bilder, römische Nummerierung, Ornament-Divider.
  - Design-Sprache: Luxus-Automobilmarken-Feel, ruhige Motion, sehr grosszügige vertikale Rhythmik, italic Serif-Akzente auf goldenen Punkten & Wörtern.
  - Sektions-Reihenfolge: Hero → About (Portrait-Frame) → Why (Roman-Numeral-Pillars) → Services (Magazin-Index) → Fleet (Luxus-Cards) → Pricing (Featured Gold-Highlight) → Persönlicher Kontakt → Footer.
  - **User-Feedback 2026-07: Vom Nutzer abgelehnt** ("elegant fällt definitiv weg"). Variante bleibt für Referenz erhalten.
- ✅ **Vivid (jung, farbig, modern) Design-Variante (DONE 2026-07)** unter `/preview/vivid`:
  - Dritte vollständig isolierte Alternative, Live-Design unverändert.
  - Ordner `/app/frontend/src/components/vivid/` (VividPreviewBanner, VividHeader, VividHero, VividAbout, VividWhy, VividServices, VividFleet, VividPricing, VividContact, VividFooter) + Page `/app/frontend/src/pages/VividPreview.jsx`.
  - Scoped CSS `/app/frontend/src/vivid.css` (nur unter `.vivid-root`): Space Grotesk + Instrument Serif italic + Inter, Bright-Cream `#fef9f4` als Basis (kein Schwarz), Electric-Blue `#3b5bff` + Hot-Pink `#ff3b8b` + Lime-Punch `#c8ff4d` + Sunshine-Yellow `#ffd60a` + Mint & Lavender-Pastels.
  - Design-Sprache: Neo-Brutalism-Cards mit 2px schwarzem Border und harten Offset-Shadows, sticker-artige rotierte Pill-Badges, Marker-Highlight-Underlines auf Schlüsselwörtern, Blur-Blobs im Hintergrund, spielerische Micro-Rotations, italic Serif-Akzente auf Punkten & Highlight-Wörtern.
  - Sektions-Reihenfolge: Hero → About (Portrait mit Stickers) → Why (Kaleidoskop-Pillars) → Services (Farb-Grid) → Fleet (Play-Cards) → Pricing (Pink-Featured) → Contact (Lime-Panel) → Footer.
  - Auch hier: Fixer Preview-Banner (lime) + Rück-Link im Footer. WhatsApp-FAB auf `/preview/*` ausgeblendet.
- ✅ **Livery (Fahrzeug-Wrap inspiriert) Design-Variante (DONE 2026-07)** unter `/preview/livery`:
  - Vierte vollständig isolierte Alternative, Live-Design unverändert.
  - Ordner `/app/frontend/src/components/livery/` (LiveryPreviewBanner, LiveryHeader, LiveryHero, LiveryAbout, LiveryWhy, LiveryServices, LiveryFleet, LiveryPricing, LiveryContact, LiveryFooter) + Page `/app/frontend/src/pages/LiveryPreview.jsx`.
  - Scoped CSS `/app/frontend/src/livery.css` (nur unter `.livery-root`): Anton (komprimierte Renn-Display-Typo) + Caveat (handgeschriebener "safe ride"-Script wie auf den Auto-Wraps) + Manrope (Body). Warm-Newsprint-Base `#f2ede4`, Wrap-Red `#c9302c` + Wrap-Navy `#1a2332` + Safety-Yellow `#f2c94c` (Farbcodes direkt aus den echten Audi/Opel/Range-Rover-Wraps abgeleitet).
  - Design-Sprache: Rally-Team-Livery meets Editorial-Magazin — gelb-schwarze Sicherheits-Tape-Streifen, runde Rennnummer-Badges mit Hard-Offset-Shadow (N°1, 01–06, P1–P4, GO), wrap-cut-diagonale CTA-Buttons, "Grid P1"-Sticker, rally-Stripe-Divider, foto-forward Fleet-Rows im Team-Roster-Layout, alternierende Rot/Navy/Weiss-Reihen die die Wrap-Farbpalette der drei Fahrzeuge zitieren.
  - Sektions-Reihenfolge: Hero (mit realem Audi-S3-Photo + Race-#01) → About (Portrait mit Rot-Offset-Frame + N°1) → Why (Rot/Navy/Weiss-Pillars mit Tape-Ecken) → Services (Spec-Sheet mit Riesen-Zahlen) → Fleet (Full-Width-Team-Rows) → Pricing (P1–P4-Cards) → Contact (Navy-Panel mit "GO"-Sticker) → Footer (Deep-Navy mit Riesen-Script-Signature).

- ✅ **P0-Bugfixes: Spacebar-CMS + Info-Box + Blog-Add (DONE 2026-02-07, Iteration 21)**:
  - **Spacebar-Bug behoben** in `/app/frontend/src/components/site/EditablePackageCard.jsx`: Der äussere Card-Container hatte `role="button"` + `onKeyDown` der Space & Enter mit `preventDefault()` fürs Card-Select behandelte. Da onKeyDown bubbelt, fraß dies Leerzeichen in verschachtelten contentEditable-Feldern (Titel, Subtitel, Feature, Highlight). Fix: `if (e.target !== e.currentTarget) return;` Guard – nur direkt auf der Card gedrückte Tasten triggern jetzt Select.
  - **Versicherungspauschale-Info-Box** in `Pricing.jsx`: alte 1-zeilige `<p class="text-sm">` durch grosse `border-2 border-[#ff5a36]`-Box mit ShieldCheck-Icon-Bubble, "WICHTIGER HINWEIS"-Label und `text-lg`-Body ersetzt. Erscheint auf Homepage `/`, `/buchung` und allen 14 Location-Landingpages (via geteilter `<Pricing lockedCanton>`-Komponente). data-testid=`pricing-insurance-box`.
  - **Blog-Add im Admin-Dashboard**: `BlogManager` in `/app/frontend/src/components/admin/EntityManagers.jsx` erweitert um Inline-Formular mit "+ Neuer Beitrag"-Toggle. Nur zwei Pflichtfelder (Titel DE / Titel EN optional), Slug wird automatisch aus Titel + kurzem Timestamp-Suffix generiert. POST an `/api/blog`. Inhalte (Text, Bild, Tags) werden danach direkt auf der Website via Inline-CMS bearbeitet, konsistent mit dem Wix-Style-Editing-Konzept. `Wrapper`-Komponente um `right`-Slot erweitert. data-testid: `admin-blog-add-toggle`, `admin-blog-add-form`, `admin-blog-add-title-de/en`, `admin-blog-add-submit`.
  - **Dead-Code entfernt**: `/app/frontend/src/components/location/LocPrices.jsx` gelöscht (wurde nirgends importiert; Location-Seiten nutzen `<Pricing lockedCanton>` seit dem Preis-Konsolidierungs-Refactor).
  - **Backend-Regression-Suite**: neue Datei `/app/backend/tests/test_p0_fixes.py` (9 Tests, 100% grün) für Blog-CRUD-Roundtrip, Package-PATCH-mit-Leerzeichen, unauth-403 und `/api/content` Insurance-Text-Presence.
  - Verifiziert per `testing_agent_v3_fork` (iteration_21): 3/3 CMS-Felder Space-typing OK, Info-Box auf Home + allen 14 Locations sichtbar, Blog-Create-Flow inkl. Öffnen/Löschen funktional.

## P0/P1/P2 Backlog Update (2026-02-07)
- ✅ Alle 3 P0-Bugs aus User-Nachricht vom 07.02.2026 gefixt und getestet.
- ✅ **UX-Batch 07.02.2026 (Iteration 22) — 5 Änderungen (DONE, 26/26 Backend + 5/5 Frontend green):**
  - **Marquee/Laufschrift**: `bg-black text-white`, keine Farben, kein Coral-Border mehr (`Marquee.jsx`).
  - **Hero-Highlight ("Anders. Besser. Mutiger.")**: Farbe von `#ff5a36` → `#dc2626` (Rot statt Orange, `Hero.jsx`).
  - **About-Speedos editierbar**: `Speedo` akzeptiert jetzt optional `children`. In `About.jsx` sind Wert & Label mit `<Editable>` umschlossen (Pfade `about.stat{n}_value`, `about.stat{n}_label_{de|en}`).
  - **WhySafeRide-Grid**: Asymmetrisches 12-col-Layout ersetzt durch `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (alle 6 Cards gleich breit, `Δ < 0.02px`). Padding von `p-7/p-9` → `p-6/p-7`. Pillar-Bodies via einmalige Migration `_migrate_why_pillar_bodies_short()` in `startup.py` gekürzt (nur wenn body_de exakt altem Default entsprach; wp5 zusätzlich per API-PATCH weil vom Kunden bereits editiert).
  - **4 Kantonswappen auf wp5**: Neue conditional Rendering-Zeile in `WhySafeRide.jsx` (`p.icon === "MapPin"` → 4 `<CantonWappen>` ZH/SZ/SG/GR zwischen Titel und Body). testid `why-pillar-4-wappen`.

- ✅ **Iteration 24 (07.02.2026) — Couture Design-Variante unter `/preview/couture` (DONE)**:
  - Fünfte vollständig isolierte Design-Vorschau. Live-Design bleibt zu 100% unangetastet.
  - Ein einzelnes Page-File `/app/frontend/src/pages/CouturePreview.jsx` (~750 LOC) mit allen 8 Sektionen inline (Preview-Banner, Header, Hero, Marquee, About, Why, Fleet, Pricing, Contact, Footer). Scoped CSS `/app/frontend/src/couture.css` (alle Regeln unter `.couture-root`).
  - **Design-Sprache**: Editorial × Motorsport (Vogue-Magazin trifft F1-Pit-Lane). Deep-Noir `#0b0b0f` + Cream-Parchment `#f2ecdf` + Champagner-Gold `#c9a961` + Racing-Rot `#e6122e` + Hot-Pink `#ff2b6b`.
  - **Typografie**: Playfair Display Italic (elegant serif) für Titel + Cormorant Garamond (elegant serif) für Body + Bebas Neue (kondensiert uppercase) für Labels/Buttons/Nav.
  - **Elegant edel**: Ausgabenreferenz "Nr. 01 · Feb 2026 · The Driving Issue · CHF 0.00", champagnerfarbene Haarlinien-Divider, Italic-Serif-Pull-Quotes, Portrait-Frame mit Fine-Gold-Rand, editorial "0X." Nummerierung, magazine-cover Layout.
  - **Sportlich frech**: Race-Number-Badges (01, 02, P1, P2, CTA) mit Hard-Offset-Scarlet-Shadow, diagonaler Rot-Sash "FRESH · FEARLESS · FAST", roter Attitude-Underline-Stroke, bold uppercase "Anders · Besser · Mutiger.", Racing-Red-CTA-Buttons.
  - Route in `App.js` unter `/preview/couture` registriert. Alle bestehenden Preview-Routen (/preview/sport, /vivid, /livery, /elegant) funktionieren unverändert.
  - Portrait-Fallback nutzt echtes hochgeladenes Hero-Bild via `content.hero.image_url`.
  - testids: `couture-preview-page`, `couture-preview-banner`, `couture-preview-back-to-original`, `couture-header`, `couture-hero`, `couture-hero-title/subtitle/cta-*`, `couture-about`, `couture-about-stat-{0,1,2}`, `couture-why`, `couture-why-pillar-{0..5}`, `couture-fleet`, `couture-fleet-{0,1,2}`, `couture-pricing`, `couture-plan-{0,1,2}`, `couture-contact`, `couture-contact-phone/email`, `couture-footer`.


- ✅ **Iteration 23 (07.02.2026) — Lernfahrerausweis-Upload + Originale Kantonswappen (DONE, 36/36 Backend + 5/5 Frontend green):**
  - **Originale Kantonswappen ZH/SZ/SG/GR** ersetzen die selbst gebauten stilisierten SVGs. 4 Wikimedia-Commons Public-Domain SVGs unter `/app/frontend/public/wappen/{ZH,SZ,SG,GR}.svg` (ZH 1KB, SZ 2.5KB, SG 1.3KB, GR 4.3KB). `CantonWappen.jsx` rendert nun `<img src="/wappen/{code}.svg" loading="lazy" decoding="async" data-testid="canton-wappen-{code}">`. Multi-Code Regions (z.B. "Kanton ZH / SZ") werden weiterhin unterstützt.
  - **Lernfahrerausweis-Upload im VKU-Formular** (`VkuRegistrationForm.jsx`): Neuer Upload-Button vor "Bemerkungen". Hidden `<input type="file">` + Dashed-Border-Button. Akzeptiert JPG/PNG/WebP/PDF bis 8 MB. Sobald eine Datei gewählt wird, POST an `/api/vku/permit-upload` sofort; Button wird durch grünen "Datei angehängt"-Pill mit X-Button ersetzt. testids: `vku-form-permit-input`, `vku-form-permit-upload-btn`, `vku-form-permit-uploaded`, `vku-form-permit-clear`.
  - **Backend**: Neuer PUBLIC-Endpunkt `POST /api/vku/permit-upload` in `routers/vku.py` (kein Auth). Payload multipart `file`. Validiert MIME zuerst (400) dann Size (413, max 8 MB). Speichert unter `saferide/vku-permits/{uuid}.{ext}` via `put_object`. Returns `{path, url:"/api/files/<path>", filename, kind:"image"|"pdf"}`.
  - **Schema**: `VkuRegistrationCreate` erweitert um `permit_file_url:str=""` und `permit_file_name:str=""` (beide optional).
  - **Storage**: `core/storage.py` erweitert um `ALLOWED_DOCUMENT_TYPES={"application/pdf":"pdf"}` und `MAX_DOCUMENT_BYTES=8*1024*1024` (getrennt von IMAGE 10 MB / VIDEO 60 MB).
  - **Admin-Viewer**: `VkuRegistrationsViewer.jsx` zeigt bei ausgewählter Anmeldung eine neue "Lernfahrerausweis"-Sektion mit Öffnen-Link (`vku-registration-permit-link`) sobald `permit_file_url` gesetzt.
  - Verifiziert per Playwright E2E: anonymous Formular ausfüllen → PNG hochladen → Success → Admin sieht Row mit funktionierendem Datei-Link.
- P2: CSV-Export für Admin-Tabs (VKU-Anmeldungen, Kontaktanfragen, Buchungen).
- P2: Stripe-Integration für Pakete/Gutscheine (Online-Zahlung, vom User bereits einmal deferred).
- P3: Rich-Text-Toolbar im Inline-Editor (aktuell nur Plain-Text via contentEditable).
