"""Fahrschule Safe Ride – FastAPI entry point.

This file is intentionally slim. All business logic lives in dedicated
modules:
  * `core/`     – db, security, storage helpers
  * `models/`   – Pydantic request/response models
  * `seeds/`    – default content + idempotent startup seeding
  * `routers/`  – grouped route handlers (auth, content, blog, …)
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from core.db import client
from seeds.startup import run_startup_seeds
from routers import (
    accounting,
    admin_documents,
    auth,
    backup,
    backup_scripts,
    blog,
    bookings,
    business_settings,
    booking_settings,
    calendar as calendar_router,
    contact,
    content,
    entities,
    fahrkontrolle,
    fahrkontrolle_ai,
    fahrkontrolle_pdf,
    gallery,
    gps,
    invoice_email,
    invoice_pdf,  # noqa: F401 – imported for side-effect / registration only
    locations,
    mail,
    portal_auth,
    portal_data,
    public_booking,
    booking_admin,
    rating_scale,
    sitemap,
    student_activities,
    student_documents,
    student_invoices,
    students,
    terms,
    testimonials,
    uploads,
    users,
    vouchers,
    vku,
)


app = FastAPI(title="Fahrschule Safe Ride API")
api = APIRouter(prefix="/api")

# Mount routers under the /api prefix (kubernetes ingress requirement).
api.include_router(auth.router)
api.include_router(content.router)
api.include_router(testimonials.router)
api.include_router(gallery.router)
api.include_router(contact.router)
api.include_router(uploads.router)
api.include_router(locations.router)
api.include_router(blog.router)
api.include_router(bookings.router)
api.include_router(entities.router)
api.include_router(sitemap.router)
api.include_router(vku.router)
api.include_router(students.router)
api.include_router(student_invoices.router)
api.include_router(student_invoices.accounting_router)
api.include_router(accounting.router)
api.include_router(student_documents.router)
api.include_router(admin_documents.router)
api.include_router(student_activities.router)
api.include_router(business_settings.router)
api.include_router(business_settings.assets_router)
api.include_router(booking_settings.router)
api.include_router(public_booking.router)
api.include_router(booking_admin.router)
api.include_router(rating_scale.router)
api.include_router(backup.router)
api.include_router(backup_scripts.router)
api.include_router(fahrkontrolle.router)
api.include_router(fahrkontrolle_ai.router)
api.include_router(fahrkontrolle_pdf.router)
api.include_router(vouchers.router)
api.include_router(vouchers.portal_router)
api.include_router(gps.router)
api.include_router(gps.portal_router)
api.include_router(portal_auth.router)
api.include_router(portal_auth.admin_router)
api.include_router(portal_data.router)
api.include_router(terms.router)
api.include_router(terms.admin_router)
api.include_router(mail.router)
api.include_router(users.router)
api.include_router(invoice_email.invoice_router)
api.include_router(invoice_email.settings_router)
api.include_router(calendar_router.router)
api.include_router(calendar_router.ical_router)
api.include_router(calendar_router.student_summary_router)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
logger = logging.getLogger("saferide")


@app.on_event("startup")
async def startup_event():
    await run_startup_seeds()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
