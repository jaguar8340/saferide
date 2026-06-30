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

    # ----- Testimonials & Gallery -----
    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([dict(t) for t in DEFAULT_TESTIMONIALS])
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([dict(g) for g in DEFAULT_GALLERY])

    # ----- Location landing pages -----
    await db.locations.create_index("slug", unique=True)
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
