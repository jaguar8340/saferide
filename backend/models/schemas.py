"""All Pydantic request/response models used across the API."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Contact ----------
class ContactSubmissionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    message: str = Field(default="", max_length=2000)


class ContactSubmission(ContactSubmissionCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read: bool = False


# ---------- Testimonials ----------
class TestimonialCreate(BaseModel):
    name: str
    rating: int = Field(ge=1, le=5)
    date: str
    text_de: str
    text_en: str = ""


class Testimonial(TestimonialCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


# ---------- Gallery ----------
class GalleryItemCreate(BaseModel):
    image_url: str
    caption_de: str = ""
    caption_en: str = ""


class GalleryItem(GalleryItemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


# ---------- Locations ----------
class LocationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)


class LocationPatch(BaseModel):
    """Partial update for a location document (dot-notation paths)."""
    model_config = ConfigDict(extra="allow")


# ---------- Blog ----------
class BlogPostCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=120)
    title_de: str = Field(min_length=1, max_length=240)
    title_en: str = Field(min_length=1, max_length=240)


class BlogPostPatch(BaseModel):
    """Partial update for a blog post – any field key allowed."""
    model_config = ConfigDict(extra="allow")


# ---------- Booking Packages ----------
class BookingPackageCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=80)
    title_de: str = Field(min_length=1, max_length=120)
    title_en: str = Field(min_length=1, max_length=120)
    price_chf: int = Field(ge=0)


class BookingPackagePatch(BaseModel):
    model_config = ConfigDict(extra="allow")


# ---------- Bookings ----------
class BookingCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=4, max_length=40)
    package_slug: str = Field(min_length=1, max_length=80)
    preferred_date: str = Field(min_length=1, max_length=40)
    preferred_time: Optional[str] = Field(default=None, max_length=40)
    location_slug: Optional[str] = Field(default=None, max_length=80)
    message: Optional[str] = Field(default=None, max_length=2000)


# ---------- Certificates / Diplomas ----------
class CertificateCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    title_de: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    image_url: str = Field(min_length=1, max_length=600)


class CertificatePatch(BaseModel):
    model_config = ConfigDict(extra="allow")


# ---------- Partners ----------
class PartnerCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)


class PartnerPatch(BaseModel):
    model_config = ConfigDict(extra="allow")
