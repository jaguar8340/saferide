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


# ---------- VKU registrations ----------
class VkuRegistrationCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    birth_date: str = Field(min_length=1, max_length=40)
    course_slot: str = Field(min_length=1, max_length=200)
    notes: str = Field(default="", max_length=2000)
    permit_file_url: str = Field(default="", max_length=500)
    permit_file_name: str = Field(default="", max_length=200)


class VkuRegistration(VkuRegistrationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    read: bool = False



# ============================================================
#  Fahrkontrolle (elektronisches Schülerblatt)
# ============================================================

# ---------- Students ----------
class StudentCreate(BaseModel):
    """Data captured on the admin's 'New Student' form.

    Rich but minimal: name + address + contact + training metadata.
    Not exposed on the public website.
    """
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    street: str = Field(default="", max_length=200)
    zip: str = Field(default="", max_length=20)
    city: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=200)
    category: str = Field(default="B", max_length=20)         # Fahrzeugkategorie
    instructor: str = Field(default="", max_length=120)       # Fahrlehrer-Name
    start_date: str = Field(default="", max_length=40)        # Beginn Ausbildung (ISO)
    prep_exam_date: str = Field(default="", max_length=40)    # Datum Vorprüfung
    exam_date: str = Field(default="", max_length=40)         # Datum Prüfung
    notes: str = Field(default="", max_length=4000)
    archived: bool = False


class Student(StudentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StudentPatch(BaseModel):
    """Partial update — every field optional."""
    model_config = ConfigDict(extra="ignore")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    category: Optional[str] = None
    instructor: Optional[str] = None
    start_date: Optional[str] = None
    prep_exam_date: Optional[str] = None
    exam_date: Optional[str] = None
    notes: Optional[str] = None
    archived: Optional[bool] = None


# ---------- Fahrkontrolle master data (categories, sub-items, routes) ----------
class FkCategoryCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title_de: str = Field(min_length=1, max_length=200)
    title_en: str = Field(default="", max_length=200)
    order: int = 0


class FkCategory(FkCategoryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class FkSubitemCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str
    title_de: str = Field(min_length=1, max_length=300)
    title_en: str = Field(default="", max_length=300)
    description_de: str = Field(default="", max_length=1000)
    description_en: str = Field(default="", max_length=1000)
    order: int = 0


class FkSubitem(FkSubitemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class FkRouteCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=200)
    order: int = 0


class FkRoute(FkRouteCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class FkOrderItem(BaseModel):
    id: str
    order: int


class FkOrderRequest(BaseModel):
    items: list[FkOrderItem]


# ---------- Student lessons ----------
class StudentLessonCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str = Field(default="", max_length=40)               # ISO date
    duration_min: int = Field(default=45, ge=0, le=600)
    routes: list[str] = []                                     # list of FkRoute ids
    notes: str = Field(default="", max_length=4000)


class StudentLesson(StudentLessonCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    lesson_number: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StudentLessonPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: Optional[str] = None
    duration_min: Optional[int] = None
    routes: Optional[list[str]] = None
    notes: Optional[str] = None


# ---------- Assessments (rating + comment per cell) ----------
class AssessmentUpsert(BaseModel):
    """Client sends this to write a single cell (student × subitem × lesson).

    `value` is one of "1"|"2"|"3"|"4"|"X"|""  (empty string clears the rating).
    Any comment is stored alongside; independent of the value.
    """
    model_config = ConfigDict(extra="ignore")
    subitem_id: str
    lesson_id: str
    value: str = Field(default="", max_length=2)
    comment: str = Field(default="", max_length=2000)


class Assessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    subitem_id: str
    lesson_id: str
    value: str = ""
    comment: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: str = ""
