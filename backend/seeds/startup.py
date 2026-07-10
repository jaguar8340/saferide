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

    for default_loc in DEFAULT_LOCATIONS:
        slug = default_loc["slug"]
        existing = await db.locations.find_one({"slug": slug})
        if not existing:
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
            # One-time fix: replace any remaining broken/unrelated Unsplash
            # hero images with the curated Pexels fallback.
            current_hero = existing.get("hero_image_url", "")
            if "images.unsplash.com" in current_hero and default_loc.get("hero_image_url") != current_hero:
                await db.locations.update_one(
                    {"slug": slug},
                    {"$set": {"hero_image_url": default_loc["hero_image_url"]}},
                )
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

    # ----- Blog posts -----
    await db.blog_posts.create_index("slug", unique=True)
    await db.blog_posts.create_index("published_at")
    for default_post in DEFAULT_BLOG_POSTS:
        slug = default_post["slug"]
        if not await db.blog_posts.find_one({"slug": slug}):
            doc = dict(default_post)
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = datetime.now(timezone.utc).isoformat()
            doc["updated_at"] = doc["created_at"]
            await db.blog_posts.insert_one(doc)

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
    for default_pkg in DEFAULT_BOOKING_PACKAGES:
        slug = default_pkg["slug"]
        existing = await db.booking_packages.find_one({"slug": slug})
        if not existing:
            doc = dict(default_pkg)
            doc["id"] = str(uuid.uuid4())
            await db.booking_packages.insert_one(doc)
        else:
            missing = {k: v for k, v in default_pkg.items() if k not in existing}
            if missing:
                await db.booking_packages.update_one({"slug": slug}, {"$set": missing})

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
