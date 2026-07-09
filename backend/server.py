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
    auth,
    blog,
    bookings,
    contact,
    content,
    entities,
    fahrkontrolle,
    fahrkontrolle_pdf,
    gallery,
    locations,
    sitemap,
    students,
    testimonials,
    uploads,
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
api.include_router(fahrkontrolle.router)
api.include_router(fahrkontrolle_pdf.router)

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
