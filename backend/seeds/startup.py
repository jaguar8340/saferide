"""Database seeding logic – idempotent. Runs once at app startup."""
import logging
import os
import uuid
from datetime import datetime, timezone

from core.db import db
from core.security import hash_password, verify_password
from core.storage import init_storage
from default_pages import (
    DEFAULT_BLOG_POSTS,
    DEFAULT_BOOKING_PACKAGES,
    DEFAULT_LOCATIONS,
)
from seeds.defaults import DEFAULT_CONTENT, DEFAULT_GALLERY, DEFAULT_TESTIMONIALS

log = logging.getLogger("saferide.seeds")


async def _has_been_seeded(collection_name: str) -> bool:
    """Return True when the initial seed for ``collection_name`` has already
    completed on this database. Used to prevent re-inserting default rows
    that the admin has deliberately deleted."""
    doc = await db["_seed_state"].find_one({"collection": collection_name})
    return doc is not None


async def _mark_seeded(collection_name: str, slugs: list[str]) -> None:
    """Persist a marker in ``_seed_state`` so future deploys know the
    initial seed of ``collection_name`` was completed."""
    await db["_seed_state"].update_one(
        {"collection": collection_name},
        {"$set": {
            "collection": collection_name,
            "seeded_at": datetime.now(timezone.utc).isoformat(),
            "seed_slugs": slugs,
        }},
        upsert=True,
    )


async def run_startup_seeds() -> None:
    """Bring an empty/older database up to the current default state."""
    init_storage()

    # ----- Indexes -----
    await db.users.create_index("email", unique=True)
    await db.contact_submissions.create_index("created_at")

    # ----- Admin user -----
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@saferide.ch").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "SafeRide2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        log.info("Updated admin password for %s", admin_email)

    # Indices for voucher codes + student setup tokens (portal).
    await db.vouchers.create_index("code", unique=True)
    await db.students.create_index("setup_token", sparse=True)

    # ----- Site content (idempotent deep merge, level 1) -----
    content_doc = await db.site_content.find_one({"id": "main"})
    if not content_doc:
        await db.site_content.insert_one({"id": "main", **DEFAULT_CONTENT})
    else:
        missing = {}
        for k, v in DEFAULT_CONTENT.items():
            if k not in content_doc:
                missing[k] = v
            elif isinstance(v, dict) and isinstance(content_doc.get(k), dict):
                for sub_k, sub_v in v.items():
                    if sub_k not in content_doc[k]:
                        missing[f"{k}.{sub_k}"] = sub_v
        if missing:
            await db.site_content.update_one({"id": "main"}, {"$set": missing})

    # One-time migration: shorten why_safe_ride pillar bodies if they still
    # contain the previous long-form default text. Any body that has been
    # edited by the admin (differs from the previous default) is left alone.
    await _migrate_why_pillar_bodies_short()

    # One-time migration: rename hero CTA from "Probelektion" → "Lektion".
    await _migrate_hero_cta_primary()

    # One-time migration: add link fields to VKU FAQ (hf5) if still on default.
    await _migrate_vku_faq_link()

    # ----- Booking Settings (Phase 1) -----
    #   • pickup locations   – 3 default Swiss stations
    #   • pickup distances   – manual matrix (Pfäffikon↔Lachen 15min, both↔Chur ≈2h)
    #   • vehicles           – 3 default cars (Audi Automat, Opel Handschaltung, Range Rover Anhänger)
    #   • email templates    – 4 fixed kinds with default HTML/text
    # All seeds run ONCE per collection (guarded by _seed_state) so an admin
    # can safely delete rows without them re-appearing on next boot.
    await _seed_booking_defaults()

    # One-time migration: seed real UBS bank details for the QR-Bill.
    # Only fills in fields still on their placeholder value ("folgt" / "").
    await _migrate_business_bank_defaults()

    # ----- Fahrkontrolle master data (Kategorien, Unterpunkte, Strecken) -----
    from seeds.fahrkontrolle_seeds import seed_fahrkontrolle_defaults
    await db.students.create_index("last_name")
    await db.student_lessons.create_index([("student_id", 1), ("lesson_number", 1)])
    await db.student_assessments.create_index(
        [("student_id", 1), ("subitem_id", 1), ("lesson_id", 1)], unique=True
    )
    await seed_fahrkontrolle_defaults(db)

    # ----- Testimonials & Gallery -----
    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([dict(t) for t in DEFAULT_TESTIMONIALS])
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([dict(g) for g in DEFAULT_GALLERY])

    # ----- Location landing pages -----
    await db.locations.create_index("slug", unique=True)
    # One-time removal of the deprecated 'st-gallen' landing page (customer
    # requested Kaltbrunn instead). Only removes the SG capital city entry,
    # all Kanton-SG data on other pages remains untouched.
    await db.locations.delete_one({"slug": "st-gallen"})

    # Seed-once semantics: once the admin has customised the landing
    # pages (deleted / edited any of them), further deploys must NOT
    # re-insert the missing defaults. Existing docs still receive
    # schema migrations below.
    loc_already_seeded = await _has_been_seeded("locations")
    if not loc_already_seeded and await db.locations.count_documents({}) > 0:
        await _mark_seeded(
            "locations", [l["slug"] for l in DEFAULT_LOCATIONS]
        )
        loc_already_seeded = True

    for default_loc in DEFAULT_LOCATIONS:
        slug = default_loc["slug"]
        existing = await db.locations.find_one({"slug": slug})
        if not existing:
            if loc_already_seeded:
                # Admin deliberately deleted this location — respect that.
                continue
            doc = dict(default_loc)
            doc["id"] = str(uuid.uuid4())
            await db.locations.insert_one(doc)
        else:
            missing = {k: v for k, v in default_loc.items() if k not in existing}
            if missing:
                await db.locations.update_one({"slug": slug}, {"$set": missing})
            # Upgrade FAQs from older 4-entry default to 15-entry default.
            if len(existing.get("faqs", [])) < 15:
                await db.locations.update_one({"slug": slug}, {"$set": {"faqs": default_loc["faqs"]}})
            # Add description_de/en to existing exam_routes that don't have them yet.
            existing_routes = existing.get("exam_routes", [])
            if existing_routes and any(("description_de" not in r) for r in existing_routes):
                upgraded = [
                    {**r, "description_de": r.get("description_de", ""), "description_en": r.get("description_en", "")}
                    for r in existing_routes
                ]
                await db.locations.update_one({"slug": slug}, {"$set": {"exam_routes": upgraded}})
            # Migrate exam_routes → "Hier fahren wir" (features + places).
            # If the current title still equals the old "Typische Prüfungsstrecken"
            # we rewrite it and its intro to the new compact copy. Also seed
            # here_we_drive_features/places if they don't exist yet.
            title_update: dict = {}
            if existing.get("exam_routes_title_de") in (
                "Typische Prüfungsstrecken",
                "Prüfungsstrecken",
                None,
                "",
            ):
                title_update["exam_routes_title_de"] = default_loc.get("exam_routes_title_de", "Hier fahren wir")
                title_update["exam_routes_title_en"] = default_loc.get("exam_routes_title_en", "Where we drive")
                title_update["exam_routes_intro_de"] = default_loc.get("exam_routes_intro_de", "")
                title_update["exam_routes_intro_en"] = default_loc.get("exam_routes_intro_en", "")
                title_update["exam_routes_outro_de"] = default_loc.get("exam_routes_outro_de", "")
                title_update["exam_routes_outro_en"] = default_loc.get("exam_routes_outro_en", "")
            for k in (
                "here_we_drive_features",
                "here_we_drive_places",
                "here_we_drive_features_label_de",
                "here_we_drive_features_label_en",
                "here_we_drive_places_label_de",
                "here_we_drive_places_label_en",
            ):
                if k not in existing and k in default_loc:
                    title_update[k] = default_loc[k]
            if title_update:
                await db.locations.update_one({"slug": slug}, {"$set": title_update})

    if not loc_already_seeded:
        await _mark_seeded(
            "locations", [l["slug"] for l in DEFAULT_LOCATIONS]
        )

    # ----- Blog posts -----
    await db.blog_posts.create_index("slug", unique=True)
    await db.blog_posts.create_index("published_at")

    # Seed-once semantics: once the admin has customised the blog (deleted
    # or edited posts), further deploys must NOT re-insert the defaults.
    blog_already_seeded = await _has_been_seeded("blog_posts")
    if not blog_already_seeded and await db.blog_posts.count_documents({}) > 0:
        # Backfill: existing production DB → mark as already seeded so
        # any admin deletions stay respected from now on.
        await _mark_seeded(
            "blog_posts", [p["slug"] for p in DEFAULT_BLOG_POSTS]
        )
        blog_already_seeded = True

    for default_post in DEFAULT_BLOG_POSTS:
        slug = default_post["slug"]
        if not await db.blog_posts.find_one({"slug": slug}):
            if blog_already_seeded:
                # Admin deliberately deleted this post — do not re-insert.
                continue
            doc = dict(default_post)
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            doc["updated_at"] = doc["created_at"]
            await db.blog_posts.insert_one(doc)

    if not blog_already_seeded:
        await _mark_seeded(
            "blog_posts", [p["slug"] for p in DEFAULT_BLOG_POSTS]
        )

    # ----- Booking packages -----
    await db.booking_packages.create_index("slug", unique=True)
    # One-time migration to the canonical package set (with cantons).
    # If the legacy slug "einzellektion-50" still exists AND the new canonical
    # slug "pkw-45" does not, wipe the collection so the seed loop below
    # reinserts the canonical list cleanly.
    if (
        await db.booking_packages.find_one({"slug": "einzellektion-50"})
        and not await db.booking_packages.find_one({"slug": "pkw-45"})
    ):
        await db.booking_packages.delete_many({})
        log.info("Migrated booking_packages to canonical (v2) set")

    # Seed-once semantics: once the admin has customised the packages
    # (edited/deleted any of them) further deploys must NOT re-insert the
    # defaults. We use a marker in _seed_state to remember whether this
    # DB has ever completed the initial package seed.
    already_seeded = await _has_been_seeded("booking_packages")
    # Backfill for DBs that were seeded before this marker existed: if the
    # collection already contains packages, treat it as already seeded so
    # the admin's deletions in production stay respected.
    if not already_seeded and await db.booking_packages.count_documents({}) > 0:
        await _mark_seeded(
            "booking_packages",
            [p["slug"] for p in DEFAULT_BOOKING_PACKAGES],
        )
        already_seeded = True

    for default_pkg in DEFAULT_BOOKING_PACKAGES:
        slug = default_pkg["slug"]
        existing = await db.booking_packages.find_one({"slug": slug})
        if not existing:
            if already_seeded:
                # Admin deliberately deleted this package — do not re-insert.
                continue
            doc = dict(default_pkg)
            doc["id"] = str(uuid.uuid4())
            await db.booking_packages.insert_one(doc)
        else:
            # Schema-evolution only: add fields that got introduced later,
            # but never overwrite anything the admin edited.
            missing = {k: v for k, v in default_pkg.items() if k not in existing}
            if missing:
                await db.booking_packages.update_one({"slug": slug}, {"$set": missing})

    if not already_seeded:
        await _mark_seeded(
            "booking_packages",
            [p["slug"] for p in DEFAULT_BOOKING_PACKAGES],
        )

    # ----- Bookings (collection index only) -----
    await db.bookings.create_index("created_at")

    # ----- Certificates (first install only) -----
    if await db.certificates.count_documents({}) == 0:
        seeds = [
            {
                "id": str(uuid.uuid4()),
                "title_de": "Eidgenoessischer Fachausweis Fahrlehrer:in",
                "title_en": "Swiss Federal Diploma Driving Instructor",
                "image_url": "https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=900",
                "year": "2014",
                "order": 0,
            },
            {
                "id": str(uuid.uuid4()),
                "title_de": "Berufsbewilligung Strassenverkehrsamt SZ",
                "title_en": "Professional license SZ road traffic office",
                "image_url": "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=900",
                "year": "2014",
                "order": 1,
            },
            {
                "id": str(uuid.uuid4()),
                "title_de": "Weiterbildung ADHS & Neurodivergenz",
                "title_en": "Further training ADHD & neurodiversity",
                "image_url": "https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=900",
                "year": "2018",
                "order": 2,
            },
            {
                "id": str(uuid.uuid4()),
                "title_de": "Mental-Coaching Zertifikat",
                "title_en": "Mental coaching certificate",
                "image_url": "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=900",
                "year": "2020",
                "order": 3,
            },
        ]
        await db.certificates.insert_many(seeds)

    # ----- Partners (first install only) -----
    await db.partners.create_index("slug", unique=True)
    if await db.partners.count_documents({}) == 0:
        partner_seeds = [
            {
                "id": str(uuid.uuid4()),
                "slug": "driveswiss-ag",
                "name": "DRIVESWISS AG",
                "category_de": "Weiterbildung Fahrlehrer:innen",
                "category_en": "Driving instructor further training",
                "description_de": "Schweizweit fuehrender Anbieter fuer Weiterbildung von Fahrlehrer:innen. Safe Ride absolviert dort regelmaessig Module zur Verkehrspsychologie und Neurodivergenz.",
                "description_en": "Switzerland's leading provider for the continuing education of driving instructors. Safe Ride regularly completes modules on traffic psychology and neurodiversity here.",
                "logo_url": "",
                "website_url": "https://www.driveswiss.ch/",
                "order": 0,
            },
            {
                "id": str(uuid.uuid4()),
                "slug": "asa",
                "name": "asa - Vereinigung der Strassenverkehrsaemter",
                "category_de": "Behoerden-Partner",
                "category_en": "Authority partner",
                "description_de": "Die asa ist die offizielle Vereinigung der Schweizer Strassenverkehrsaemter und stellt sicher, dass alle Fahrlehrerbewilligungen und Pruefungen schweizweit einheitlichen Standards entsprechen.",
                "description_en": "The asa is the official Swiss association of road traffic offices, ensuring that all driving instructor licences and exams comply with nationwide standards.",
                "logo_url": "",
                "website_url": "https://www.asa.ch/",
                "order": 1,
            },
            {
                "id": str(uuid.uuid4()),
                "slug": "samariter-lachen",
                "name": "Samariterverein Lachen",
                "category_de": "Nothelferkurs-Partner",
                "category_en": "First-aid course partner",
                "description_de": "Zertifizierter Anbieter des gesetzlich vorgeschriebenen Nothelferkurses. Safe Ride vermittelt dich auf Wunsch direkt zu einem freien Kurstermin.",
                "description_en": "Certified provider of the legally required first-aid course. On request Safe Ride arranges a slot for you directly.",
                "logo_url": "",
                "website_url": "https://www.samariter-lachen.ch/",
                "order": 2,
            },
            {
                "id": str(uuid.uuid4()),
                "slug": "audi-zentrum",
                "name": "Audi Zentrum March",
                "category_de": "Fahrzeug-Partner",
                "category_en": "Vehicle partner",
                "description_de": "Service- und Wartungspartner fuer die Safe-Ride-Fahrzeuge. Garantiert technische Topqualitaet von Audi S3 und Co.",
                "description_en": "Service and maintenance partner for the Safe Ride fleet. Guarantees top technical quality for the Audi S3 and others.",
                "logo_url": "",
                "website_url": "https://www.audi.ch/",
                "order": 3,
            },
            {
                "id": str(uuid.uuid4()),
                "slug": "sfv",
                "name": "Schweizerischer Fahrlehrerverband SFV",
                "category_de": "Berufsverband",
                "category_en": "Professional association",
                "description_de": "Berufsverband der Schweizer Fahrlehrer:innen mit ueber 3'500 Mitgliedern. Safe Ride ist seit 2014 Mitglied und engagiert sich fuer hoechste Ausbildungsqualitaet.",
                "description_en": "Professional association of Swiss driving instructors with over 3,500 members. Safe Ride has been a member since 2014 and is committed to the highest training quality.",
                "logo_url": "",
                "website_url": "https://www.fahrlehrerverband.ch/",
                "order": 4,
            },
            {
                "id": str(uuid.uuid4()),
                "slug": "sgs",
                "name": "SGS Schweiz",
                "category_de": "Zertifizierungs-Partner",
                "category_en": "Certification partner",
                "description_de": "Unabhaengige Zertifizierungsstelle. Pruefte und auditierte die Mental-Coaching-Ausbildung von Safe Ride.",
                "description_en": "Independent certification body. Audited and certified Safe Ride's mental coaching qualification.",
                "logo_url": "",
                "website_url": "https://www.sgs.ch/",
                "order": 5,
            },
        ]
        await db.partners.insert_many(partner_seeds)



# Previous (long) default bodies for the six why_safe_ride pillars. Used by the
# one-time migration below to detect "still on default seed" vs "user has
# edited" – we ONLY shorten if the current body_de matches the old default
# EXACTLY (i.e. was never touched by an admin).
_OLD_PILLAR_BODIES_DE = {
    "wp1": "Ich bin keine anonyme Fahrschule mit fünfzehn Lehrern und einer Hotline. Ich bin Nadine – und ich kenne jeden meiner Fahrschüler:innen mit Namen, weiss um deine Stärken und deine Baustellen, deine Lieblingsstrecken und deine Fahrlieder. Bei mir bekommst du keine Lehrer-Rotation, keine Sätze wie \"Hat dir das Kollege X nicht so erklärt?\" – sondern eine durchgehende Begleitung von der ersten Lektion bis zum Tag, an dem du den Ausweis in der Hand hältst. Das schafft Vertrauen. Und Vertrauen ist genau das, was hinter dem Steuer den Unterschied macht.",
    "wp2": "Fahrenlernen ist Kopfsache. Wer Angst hat oder gestresst ist, vergisst alles, was er gelernt hat – sobald die Prüferin neben dir sitzt. Genau deshalb verbinde ich klassische Fahrlehrer-Arbeit mit fundiertem Mental Coaching: Atemübungen, mentale Vorbereitung, Reframing von Fehlern und gezielte Visualisierung. Du lernst nicht nur, wie man rückwärts parkiert – du lernst auch, wie du dich VOR und WÄHREND der Prüfung in einen ruhigen, klaren Zustand bringst. Das ist ein Unterschied, der zählt: Schüler:innen, die mit mir arbeiten, schaffen die Prüfung im Schnitt nicht nur schneller, sondern auch entspannter.",
    "wp3": "Standard-Fahrschulen funktionieren für Standard-Schüler:innen. Wer im ADHS-Spektrum unterwegs ist oder Autismus hat, weiss: Reizüberflutung, Routinen, Verarbeitungstempo – das sind keine \"Macken\", sondern Tatsachen. Ich habe Weiterbildungen im neurodiversen Lernen gemacht und passe die Lektionen entsprechend an: kürzere, fokussiertere Einheiten, klarere Strukturen, vorhersehbare Abläufe, sensorisch entlastete Fahrzeuge. Das Ergebnis: Schüler:innen, die bei anderen Schulen frustriert aufgegeben haben, schaffen bei mir den Ausweis – und kommen freiwillig zurück, um Verwandte und Geschwister anzumelden.",
    "wp4": "Audi S3, Opel OPC, Range Rover Sport – das ist keine zufällige Sammlung, das ist eine Wahl. Drei verschiedene Konzepte, drei verschiedene Fahrgefühle, drei verschiedene Sitzpositionen. Du lernst nicht nur an einem einzigen Auto, du lernst SCHALTEN. Du spürst den Unterschied zwischen einem sportlichen Kompaktwagen und einem hochbeinigen SUV. Du verstehst, wieso eine kürzere Übersetzung in der Stadt mehr Spass macht und wieso ein langer Radstand auf der Autobahn entspannter ist. Die Fahrzeuge sind technisch top, regelmässig gewartet und – ehrlich gesagt – einfach schöner als das, was die meisten meiner Kolleg:innen anbieten.",
    "wp5": "Einsiedeln, Lachen, Siebnen, Pfäffikon SZ, Altendorf, Wädenswil, Horgen, Richterswil, Rapperswil, Chur und Lenzerheide – wo immer du wohnst, lernst oder arbeitest, ich komme zu dir. Du verlierst keine Zeit mit langen Anfahrten zu irgendeinem zentralen Fahrschulbüro. Wir starten dort, wo es für dich Sinn ergibt: am Bahnhof, vor deiner Schule, an deinem Arbeitsplatz. Das macht den Unterschied zwischen einer halben \"Lektion mit Stress weil ich noch zur Uni muss\" und einer richtigen 50-Minuten-Lektion, in der du wirklich etwas mitnimmst.",
    "wp6": "Was du auf der Preisseite siehst, ist das, was du zahlst. Kein Aufpreis für \"Wochenend-Lektionen\", keine versteckten Anfahrtspauschalen, keine teuren Pflicht-Pakete. Du bekommst eine ehrliche Rechnung mit allem, was du gefahren hast – inklusive Kilometerstand wenn du das willst. Wenn du eine Lektion absagst, bist du flexibel: 24 Stunden vorher reicht völlig. Ich verdiene mein Geld damit, dass meine Schüler:innen die Prüfung schaffen und mich weiterempfehlen – nicht damit, dass ich mehr Stunden draufpacke als nötig sind. Ehrlich gesagt: Wenn ich nach zehn Stunden sehe, dass du bereit bist, sage ich es dir.",
}


async def _migrate_why_pillar_bodies_short() -> None:
    """Shorten why_safe_ride pillar body_de / body_en for pillars still using
    the previous long-form default text. Any pillar that was edited by the
    admin is left untouched (identity comparison on body_de)."""
    doc = await db.site_content.find_one({"id": "main"}, {"why_safe_ride": 1})
    if not doc:
        return
    pillars = (doc.get("why_safe_ride") or {}).get("pillars") or []
    if not pillars:
        return

    # Build a lookup of the NEW short bodies from DEFAULT_CONTENT.
    new_pillars_by_id = {
        p["id"]: p
        for p in ((DEFAULT_CONTENT.get("why_safe_ride") or {}).get("pillars") or [])
    }

    changed = False
    for p in pillars:
        pid = p.get("id")
        old_default = _OLD_PILLAR_BODIES_DE.get(pid)
        new_p = new_pillars_by_id.get(pid)
        if not old_default or not new_p:
            continue
        if p.get("body_de") == old_default:
            p["body_de"] = new_p["body_de"]
            p["body_en"] = new_p["body_en"]
            changed = True

    if changed:
        await db.site_content.update_one(
            {"id": "main"}, {"$set": {"why_safe_ride.pillars": pillars}}
        )
        log.info("Shortened why_safe_ride pillars to compact defaults")


# ---------------------------------------------------------------------------
# One-time migration: seed real UBS bank details for the Swiss QR-Bill.
# The admin can override each field via the "Fahrschul-Daten"-Tab; we only
# populate fields that are still on a placeholder value.
# ---------------------------------------------------------------------------
_BANK_DEFAULTS = {
    "iban": "CH45 0021 4214 1301 7040 Q",
    "bic": "UBSWCHZH80A",
    "bank": "UBS AG, 8098 Zürich",
    "account_holder": "Nadine Stäubli",
}
_BANK_PLACEHOLDERS = {"", "folgt"}


async def _migrate_business_bank_defaults() -> None:
    doc = await db.business_settings.find_one({"id": "default"}, {"_id": 0})
    if not doc:
        return
    updates = {}
    for k, new_val in _BANK_DEFAULTS.items():
        current = (doc.get(k) or "").strip()
        if current in _BANK_PLACEHOLDERS:
            updates[k] = new_val
    if updates:
        await db.business_settings.update_one(
            {"id": "default"}, {"$set": updates}
        )
        log.info("Seeded UBS bank details for QR-Bill: %s", list(updates.keys()))

    # Invalidate archived invoice PDFs so the next download regenerates
    # them with the freshly-configured QR-Bill on page 2.
    if updates:
        result = await db.student_invoices.update_many(
            {"archive_url": {"$ne": ""}},
            {"$set": {"archive_url": "", "archive_path": "", "archived_at": ""}},
        )
        if result.modified_count:
            log.info(
                "Invalidated %s archived invoice PDFs (bank details changed)",
                result.modified_count,
            )



# ---------------------------------------------------------------------------
# One-time migration: rename Hero CTA from "Probelektion" → "Lektion".
# Only overwrites values that still exactly match the previous default so
# any admin customisation is preserved.
# ---------------------------------------------------------------------------
_OLD_HERO_CTA_VALUES = {
    "cta_primary_de": {"Jetzt Probelektion anfragen", "Jetzt Probe­lektion anfragen"},
    "cta_primary_en": {"Book trial lesson", "Request trial lesson"},
}
_NEW_HERO_CTA_VALUES = {
    "cta_primary_de": "Jetzt Lektion anfragen",
    "cta_primary_en": "Request a lesson",
}


async def _migrate_hero_cta_primary() -> None:
    doc = await db.site_content.find_one({"id": "main"}, {"hero": 1})
    if not doc:
        return
    hero = doc.get("hero") or {}
    updates = {}
    for key, old_values in _OLD_HERO_CTA_VALUES.items():
        current = (hero.get(key) or "").strip()
        if current in old_values:
            updates[f"hero.{key}"] = _NEW_HERO_CTA_VALUES[key]
    if updates:
        await db.site_content.update_one({"id": "main"}, {"$set": updates})
        log.info("Migrated Hero CTA labels: %s", list(updates.keys()))


# ---------------------------------------------------------------------------
# One-time migration: add internal VKU link to FAQ hf5. The Editable widget
# renders plain text, so we can't inject HTML anchors – instead we extend the
# FAQ schema with optional `link_url`, `link_de`, `link_en` fields which
# HomeFaq.jsx renders as a proper <Link>. This migration only fills the
# fields when they are still missing (never overwrites admin edits).
# ---------------------------------------------------------------------------
async def _migrate_vku_faq_link() -> None:
    doc = await db.site_content.find_one({"id": "main"}, {"homepage_faqs": 1})
    if not doc:
        return
    faqs = doc.get("homepage_faqs") or []
    if not faqs:
        return
    changed = False
    for f in faqs:
        if f.get("id") == "hf5" and not f.get("link_url"):
            f["link_url"] = "/vku"
            f["link_de"] = "→ Mehr zum VKU erfahren"
            f["link_en"] = "→ Learn more about the VKU"
            changed = True
    if changed:
        await db.site_content.update_one(
            {"id": "main"}, {"$set": {"homepage_faqs": faqs}}
        )
        log.info("Added VKU link to FAQ hf5")


# ---------------------------------------------------------------------------
#  Booking Settings seeds (Phase 1)
# ---------------------------------------------------------------------------
_DEFAULT_PICKUP_LOCATIONS = [
    {"name": "Pfäffikon SZ Bahnhof", "address": "Bahnhofstrasse, 8808 Pfäffikon SZ", "order": 0},
    {"name": "Lachen SZ Bahnhof",    "address": "Bahnhof Lachen, 8853 Lachen SZ",    "order": 1},
    {"name": "Chur GR Bahnhof",      "address": "Bahnhof Chur, 7000 Chur GR",        "order": 2},
]

# Distance matrix in minutes for the 3 default stations (unordered pairs).
# Pfäffikon SZ ↔ Lachen SZ ≈ 15 min  (short A3 hop)
# Pfäffikon SZ ↔ Chur GR   ≈ 120 min (A3 → A13, ~130 km)
# Lachen SZ    ↔ Chur GR   ≈ 115 min
_DEFAULT_DISTANCE_MATRIX = [
    ("Pfäffikon SZ Bahnhof", "Lachen SZ Bahnhof", 15),
    ("Pfäffikon SZ Bahnhof", "Chur GR Bahnhof",   120),
    ("Lachen SZ Bahnhof",    "Chur GR Bahnhof",   115),
]

_DEFAULT_VEHICLES = [
    {
        "name": "Audi S3",
        "transmission": "Automat",
        "category": "B",
        "allowed_durations": [45, 90, 135],
        "order": 0,
    },
    {
        "name": "Opel OPC",
        "transmission": "Handschaltung",
        "category": "B",
        "allowed_durations": [45, 90, 135],
        "order": 1,
    },
    {
        "name": "Range Rover Sport",
        "transmission": "Anhänger",
        "category": "BE",
        "allowed_durations": [90, 135],   # Anhänger-Stunde min. 90 min
        "order": 2,
    },
]

_DEFAULT_TEMPLATES = [
    {
        "kind": "requested",
        "label_de": "Anfrage erhalten",
        "subject": "Buchungsanfrage erhalten – Fahrschule Safe Ride",
        "body_html": (
            "<p>Hallo {name},</p>"
            "<p>vielen Dank für Deine Buchungsanfrage bei <strong>Fahrschule Safe Ride</strong>!</p>"
            "<p>Dein Wunschtermin:<br>"
            "<strong>{datum}</strong> um <strong>{uhrzeit}</strong> ({dauer} Min)<br>"
            "Fahrzeug: {fahrzeug}<br>"
            "Abholort: {abholort}</p>"
            "<p>Ich melde mich zeitnah mit einer Bestätigung.</p>"
            "<p>Liebe Grüsse<br>{fahrlehrerin}</p>"
        ),
        "body_text": (
            "Hallo {name},\n\n"
            "vielen Dank für Deine Buchungsanfrage bei Fahrschule Safe Ride!\n\n"
            "Dein Wunschtermin: {datum} um {uhrzeit} ({dauer} Min)\n"
            "Fahrzeug: {fahrzeug}\n"
            "Abholort: {abholort}\n\n"
            "Ich melde mich zeitnah mit einer Bestätigung.\n\n"
            "Liebe Grüsse\n{fahrlehrerin}"
        ),
    },
    {
        "kind": "confirmed",
        "label_de": "Buchung bestätigt",
        "subject": "Deine Fahrstunde ist bestätigt ✓",
        "body_html": (
            "<p>Hallo {name},</p>"
            "<p>Deine Buchung wurde <strong>bestätigt</strong>. Ich freue mich auf Dich!</p>"
            "<p><strong>{datum}</strong> um <strong>{uhrzeit}</strong> ({dauer} Min)<br>"
            "Fahrzeug: {fahrzeug}<br>"
            "Abholort: {abholort}</p>"
            "<p>Bitte sei 5 Minuten vor Beginn am Abholort. Bei Verhinderung melde Dich mindestens "
            "24 Stunden im Voraus.</p>"
            "<p>Liebe Grüsse<br>{fahrlehrerin}</p>"
        ),
        "body_text": (
            "Hallo {name},\n\n"
            "Deine Buchung wurde bestätigt. Ich freue mich auf Dich!\n\n"
            "{datum} um {uhrzeit} ({dauer} Min)\n"
            "Fahrzeug: {fahrzeug}\n"
            "Abholort: {abholort}\n\n"
            "Bitte sei 5 Minuten vor Beginn am Abholort. Bei Verhinderung melde Dich mindestens 24 "
            "Stunden im Voraus.\n\n"
            "Liebe Grüsse\n{fahrlehrerin}"
        ),
    },
    {
        "kind": "rescheduled",
        "label_de": "Buchung verschoben",
        "subject": "Deine Fahrstunde wurde verschoben",
        "body_html": (
            "<p>Hallo {name},</p>"
            "<p>Deine Fahrstunde wurde auf einen neuen Termin <strong>verschoben</strong>:</p>"
            "<p><strong>{datum}</strong> um <strong>{uhrzeit}</strong> ({dauer} Min)<br>"
            "Fahrzeug: {fahrzeug}<br>"
            "Abholort: {abholort}</p>"
            "<p>Falls der neue Termin nicht passt, melde Dich bitte kurz.</p>"
            "<p>Liebe Grüsse<br>{fahrlehrerin}</p>"
        ),
        "body_text": (
            "Hallo {name},\n\n"
            "Deine Fahrstunde wurde auf einen neuen Termin verschoben:\n\n"
            "{datum} um {uhrzeit} ({dauer} Min)\n"
            "Fahrzeug: {fahrzeug}\n"
            "Abholort: {abholort}\n\n"
            "Falls der neue Termin nicht passt, melde Dich bitte kurz.\n\n"
            "Liebe Grüsse\n{fahrlehrerin}"
        ),
    },
    {
        "kind": "cancelled",
        "label_de": "Buchung storniert",
        "subject": "Deine Fahrstunde wurde storniert",
        "body_html": (
            "<p>Hallo {name},</p>"
            "<p>Deine Buchung wurde <strong>storniert</strong>:</p>"
            "<p>{datum} um {uhrzeit}<br>"
            "Fahrzeug: {fahrzeug}<br>"
            "Abholort: {abholort}</p>"
            "<p>Melde Dich gerne für einen neuen Termin.</p>"
            "<p>Liebe Grüsse<br>{fahrlehrerin}</p>"
        ),
        "body_text": (
            "Hallo {name},\n\n"
            "Deine Buchung wurde storniert:\n\n"
            "{datum} um {uhrzeit}\n"
            "Fahrzeug: {fahrzeug}\n"
            "Abholort: {abholort}\n\n"
            "Melde Dich gerne für einen neuen Termin.\n\n"
            "Liebe Grüsse\n{fahrlehrerin}"
        ),
    },
]


async def _seed_booking_defaults() -> None:
    now = datetime.now(timezone.utc).isoformat()

    # 1) Pickup locations
    if not await _has_been_seeded("pickup_locations"):
        for loc in _DEFAULT_PICKUP_LOCATIONS:
            await db.pickup_locations.insert_one({"id": str(uuid.uuid4()), **loc})
        await _mark_seeded("pickup_locations", [l["name"] for l in _DEFAULT_PICKUP_LOCATIONS])
        log.info("Seeded pickup_locations: %s", [l["name"] for l in _DEFAULT_PICKUP_LOCATIONS])

    # 2) Distance matrix (linked by NAME → resolved to IDs now that locations exist).
    if not await _has_been_seeded("pickup_distances"):
        locs = await db.pickup_locations.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
        id_by_name = {l["name"]: l["id"] for l in locs}
        for a_name, b_name, travel in _DEFAULT_DISTANCE_MATRIX:
            a_id = id_by_name.get(a_name)
            b_id = id_by_name.get(b_name)
            if not a_id or not b_id:
                continue
            a_id, b_id = (a_id, b_id) if a_id <= b_id else (b_id, a_id)
            await db.pickup_distances.insert_one({
                "id": str(uuid.uuid4()),
                "from_id": a_id,
                "to_id": b_id,
                "travel_min": travel,
            })
        await _mark_seeded("pickup_distances", ["seeded"])
        log.info("Seeded pickup_distances (%d entries)", len(_DEFAULT_DISTANCE_MATRIX))

    # 3) Vehicles
    if not await _has_been_seeded("vehicles"):
        for veh in _DEFAULT_VEHICLES:
            await db.vehicles.insert_one({"id": str(uuid.uuid4()), "active": True, **veh})
        await _mark_seeded("vehicles", [v["name"] for v in _DEFAULT_VEHICLES])
        log.info("Seeded vehicles: %s", [v["name"] for v in _DEFAULT_VEHICLES])

    # 4) Email templates (one doc per kind; each seeded independently so an
    #    admin can safely edit any template without the others resetting).
    for t in _DEFAULT_TEMPLATES:
        existing = await db.booking_email_templates.find_one({"kind": t["kind"]}, {"_id": 0})
        if existing:
            continue
        await db.booking_email_templates.insert_one({
            "id": t["kind"],
            "updated_at": now,
            **t,
        })
        log.info("Seeded email template: %s", t["kind"])
