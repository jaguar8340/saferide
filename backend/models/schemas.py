"""All Pydantic request/response models used across the API."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

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
    model_config = ConfigDict(extra="ignore")
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=4, max_length=40)
    package_slug: str = Field(min_length=1, max_length=80)
    preferred_date: str = Field(min_length=1, max_length=40)
    preferred_time: Optional[str] = Field(default=None, max_length=40)
    location_slug: Optional[str] = Field(default=None, max_length=80)
    message: Optional[str] = Field(default=None, max_length=2000)


class AdminAppointmentCreate(BaseModel):
    """Admin creates an appointment directly on the calendar (bypasses package flow)."""
    model_config = ConfigDict(extra="ignore")
    customer_name: str = Field(default="", max_length=200)     # displayed on calendar (or the block title)
    student_id: Optional[str] = Field(default=None, max_length=64)   # link to /students entity
    start_datetime: str = Field(min_length=10, max_length=40)    # ISO 8601 e.g. 2026-02-15T14:30
    duration_min: int = Field(default=60, ge=15, le=600)
    pickup_location: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=2000)
    phone: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=200)
    entry_type: str = Field(default="appointment", max_length=20)   # "appointment" | "block"


class AdminAppointmentPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_name: Optional[str] = None
    student_id: Optional[str] = None
    start_datetime: Optional[str] = None
    duration_min: Optional[int] = None
    pickup_location: Optional[str] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    admin_note: Optional[str] = None
    entry_type: Optional[str] = None


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
    birthdate: str = Field(default="", max_length=40)          # Geburtsdatum (ISO YYYY-MM-DD)
    prep_exam_date: str = Field(default="", max_length=40)    # Datum Vorprüfung
    exam_date: str = Field(default="", max_length=40)         # Datum Prüfung
    notes: str = Field(default="", max_length=4000)
    company: str = Field(default="", max_length=200)          # Firma (z. B. wenn Firmen-Rechnung gewünscht)
    # Region-Gruppierung für die Schüler-Übersicht (Tabs).
    # Erlaubte Werte: "gr" (Graubünden), "sz_zh" (Schwyz/Zürich), "other" (Übrige).
    # Leer ("") = noch nicht zugewiesen → landet unter "Übrige".
    region: str = Field(default="", max_length=20)
    # Archiv-Flag: TRUE = Schüler:in hat die Prüfung bestanden und wurde
    # ins "Fertige Schüler"-Archiv verschoben. Bleibt komplett erhalten
    # (KEIN Löschen) und ist rückgängig machbar (Button "Reaktivieren").
    archived: bool = Field(default=False)
    passed_date: str = Field(default="", max_length=40)       # ISO-Datum (YYYY-MM-DD) der bestandenen Prüfung
    # Optional: Erziehungsberechtigte:r (empfohlen bei Schüler:innen unter 18)
    guardian_name: str = Field(default="", max_length=200)
    guardian_email: str = Field(default="", max_length=200)
    archived: bool = False


class Student(StudentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # Relaxed on the READ model so legacy documents with empty names (e.g.
    # company entries imported from an older system) don't 500 the whole
    # list-response. Input-side (StudentCreate) keeps min_length=1, so new
    # entries still require a proper first/last name.
    first_name: str = Field(default="", max_length=120)
    last_name: str = Field(default="", max_length=120)
    # AGB (Terms) confirmation state — populated by /api/terms/send + /api/terms/confirm
    #  Legacy student-side fields (mirror the split fields below for backwards compat)
    agb_sent_at: Optional[str] = None
    agb_sent_by: Optional[str] = None
    agb_confirmed_at: Optional[str] = None
    agb_confirmed_version: Optional[str] = None
    agb_confirmation_expires: Optional[str] = None
    # NEW: split tracking per recipient — Schüler vs Erziehungsberechtigte
    agb_student_sent_at: Optional[str] = None
    agb_student_confirmed_at: Optional[str] = None
    agb_student_confirmed_version: Optional[str] = None
    agb_guardian_sent_at: Optional[str] = None
    agb_guardian_confirmed_at: Optional[str] = None
    agb_guardian_confirmed_version: Optional[str] = None
    # Portal-Zugang – gesetzt beim Einladen bzw. Aktivieren durch den Schüler
    portal_invited_at: Optional[str] = None
    portal_activated_at: Optional[str] = None


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
    birthdate: Optional[str] = None
    prep_exam_date: Optional[str] = None
    exam_date: Optional[str] = None
    notes: Optional[str] = None
    company: Optional[str] = None
    region: Optional[str] = None
    archived: Optional[bool] = None
    passed_date: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_email: Optional[str] = None
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
    photo_urls: List[str] = Field(default_factory=list)   # /api/files/... URLs
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: str = ""


# ---------- Student invoices ----------
# Payment methods: bar (cash), rechnung (bank invoice), kreditkarte, twint
PAYMENT_METHODS = ["bar", "rechnung", "kreditkarte", "twint"]
INVOICE_STATUSES = ["open", "paid", "cancelled"]


class StudentInvoiceCreate(BaseModel):
    """Payload the admin submits when creating a new invoice.

    The number is NOT accepted here — it is always generated server-side
    (year-reset 4-digit sequence, e.g. RE-2026-0001).
    """
    model_config = ConfigDict(extra="ignore")
    lesson_date: str = Field(default="", max_length=40)     # ISO date the lesson was held
    duration_min: int = Field(default=45, ge=0, le=600)     # duration in minutes
    price_chf: float = Field(default=0.0, ge=0, le=1_000_000)
    item_title: str = Field(default="", max_length=200)     # Custom line-item title (z. B. „Kurs «Fahren mit Blinden»"). Leer = Standard "Fahrstunde".
    note: str = Field(default="", max_length=2000)
    payment_method: str = Field(default="bar", max_length=20)
    status: str = Field(default="open", max_length=20)
    is_direct: bool = False                                 # DIREKT-Rechnung: nicht in Standard-Buchhaltung/Erfolgsrechnung
    storno_note: str = Field(default="", max_length=500)    # Optionale Notiz, warum die Rechnung storniert wurde


class StudentInvoice(StudentInvoiceCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    number: str = ""                                        # RE-2026-0001 (system-generated)
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    mwst_rate: float = 0.0                                  # snapshot of settings rate at creation
    archive_path: str = ""                                  # Hetzner S3 path of the archived PDF
    archive_url: str = ""                                   # /api/files/{archive_path}
    archived_at: str = ""                                   # ISO timestamp of last archive write
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""


class StudentInvoicePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lesson_date: Optional[str] = None
    duration_min: Optional[int] = None
    price_chf: Optional[float] = None
    item_title: Optional[str] = None
    note: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    is_direct: Optional[bool] = None
    storno_note: Optional[str] = None
    date: Optional[str] = None                              # invoice date (rarely edited)


# ---------- Student documents ----------
class StudentDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    label: str = ""                                    # human-friendly filename
    original_filename: str = ""
    storage_path: str = ""                             # opaque object storage path
    url: str = ""                                      # /api/files/…
    content_type: str = ""
    size: int = 0
    kind: str = "document"                             # document | image | pdf
    category: str = "misc"                             # misc | permit | id | contract | invoice | other
    note: str = Field(default="", max_length=1000)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ---------- Buchhaltung / Chart of Accounts ----------
ACCOUNT_TYPES = ["ertrag", "aufwand"]   # revenue / expense


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: str = Field(default="", max_length=10)     # e.g. "3200", "4400"
    name: str = Field(default="", max_length=120)
    type: str = "aufwand"                              # "ertrag" | "aufwand"
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AccountPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    number: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    active: Optional[bool] = None


class ExpenseCreate(BaseModel):
    """Payload for a single expense entry (Ausgabe)."""
    model_config = ConfigDict(extra="ignore")
    date: str = Field(default="", max_length=40)          # ISO date (YYYY-MM-DD)
    amount_chf: float = Field(default=0.0, ge=0, le=10_000_000)
    description: str = Field(default="", max_length=500)
    account_id: str = Field(default="", max_length=64)    # FK → Account.id (Aufwand)
    receipt_url: str = Field(default="", max_length=500)  # DEPRECATED: legacy single-file field – kept for backwards compat, never removed
    # NEW: multiple receipts per expense (up to 10). First entry mirrors
    # `receipt_url` for old clients; new UI writes all attachments here.
    receipt_urls: list[str] = Field(default_factory=list, max_length=10)


class Expense(ExpenseCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = ""


class ExpensePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: Optional[str] = None
    amount_chf: Optional[float] = None
    description: Optional[str] = None
    account_id: Optional[str] = None
    receipt_url: Optional[str] = None
    receipt_urls: Optional[list[str]] = None

    uploaded_by: str = ""

# ---------- Business / Fahrschul-Settings (Absenderdaten für Rechnungen) ----------
class BusinessSettings(BaseModel):
    """Singleton document (id='default') storing the Fahrschul-Absenderdaten
    used on every generated invoice and the default MWST rate."""
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    business_name: str = "Fahrschule Safe Ride by Nadine Stäubli"
    address_line1: str = "Schnabelsberg"
    address_line2: str = ""
    zip: str = "8836"
    city: str = "Benau"
    country: str = "Schweiz"
    phone: str = "079 585 00 85"
    email: str = ""
    website: str = "www.saferide.ch"
    iban: str = "folgt"
    bank: str = "folgt"
    bic: str = "folgt"
    account_holder: str = ""
    mwst_number: str = ""                                   # empty = nicht MWST-pflichtig
    mwst_rate: float = 0.0                                  # default MWST rate (%)
    invoice_prefix: str = "RE"                              # RE-2026-0001
    invoice_footer_note: str = "Vielen Dank für Ihr Vertrauen. Zahlbar innert 10 Tagen."
    logo_url: str = ""                                      # /api/files/... path to uploaded logo
    # E-Mail-Versand (SMTP – wird meist zusammen mit IMAP-Zugangsdaten vom Mail-Provider geliefert)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = ""
    smtp_use_tls: bool = True                               # STARTTLS on 587 / implicit SSL on 465
    # Resend-Relay — used as a drop-in replacement for direct SMTP when the
    # SMTP host blacklists our cloud IP. If both are configured, Resend wins.
    resend_api_key: str = ""
    resend_from_email: str = ""                             # e.g. no-reply@saferide.ch
    # IMAP (Webmail Posteingang lesen)
    imap_host: str = ""
    imap_port: int = 993
    imap_user: str = ""
    imap_password: str = ""
    imap_use_ssl: bool = True
    email_subject_template: str = "Rechnung {number} – {business_name}"
    email_body_template: str = (
        "Hallo {first_name},\n\n"
        "im Anhang findest du deine Rechnung {number} über CHF {total}.\n\n"
        "Bei Fragen melde dich jederzeit.\n\n"
        "Herzlichen Dank und liebe Grüsse\n{business_name}"
    )
    # iCal-Sync – zufälliges Token, generiert bei get_or_create_settings falls leer
    calendar_token: str = ""
    # External iCal feeds abonnieren (z. B. iPhone-Kalender). Belegte Slots
    # dieser Feeds werden im Kalender als „belegt" angezeigt und blockieren Doppelbuchungen.
    external_ical_urls: List[str] = Field(default_factory=list)
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_by: str = ""


class BusinessSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    business_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    iban: Optional[str] = None
    bank: Optional[str] = None
    bic: Optional[str] = None
    account_holder: Optional[str] = None
    mwst_number: Optional[str] = None
    mwst_rate: Optional[float] = None
    invoice_prefix: Optional[str] = None
    invoice_footer_note: Optional[str] = None
    logo_url: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    external_ical_urls: Optional[List[str]] = None
    smtp_use_tls: Optional[bool] = None
    resend_api_key: Optional[str] = None
    resend_from_email: Optional[str] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    imap_user: Optional[str] = None
    imap_password: Optional[str] = None
    imap_use_ssl: Optional[bool] = None
    email_subject_template: Optional[str] = None
    email_body_template: Optional[str] = None



# ---------- Student activity feed ----------
class StudentActivity(BaseModel):
    """Auto-populated by other endpoints (patch student, add/edit lesson,
    upsert assessment, add/delete invoice/document). Read-only for the UI."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    kind: str                                           # student.update, lesson.create, ...
    message: str                                        # short human-readable summary (DE)
    meta: dict = Field(default_factory=dict)            # opaque details (e.g., field, from, to)
    actor: str = ""                                     # email of the admin who did it
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Booking Settings (Phase 1 – admin-configurable) ----------
class WeekdayHours(BaseModel):
    """Working hours for a single weekday (Monday = 0 … Sunday = 6)."""
    model_config = ConfigDict(extra="ignore")
    weekday: int = Field(ge=0, le=6)
    open: bool = True
    start_time: str = Field(default="08:00", max_length=5)   # "HH:MM"
    end_time: str = Field(default="18:00", max_length=5)     # "HH:MM"


class CalendarAvailability(BaseModel):
    """Singleton document (id='default') defining the online-booking window
    per weekday and the default buffer minutes applied after every lesson.

    The `location_default_buffer_min` matrix override is stored separately
    in `PickupDistance` docs.
    """
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    weekdays: List[WeekdayHours] = Field(default_factory=list)
    default_buffer_min: int = Field(default=15, ge=0, le=240)  # min gap after every appointment
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PickupLocationCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=120)
    address: str = Field(default="", max_length=300)
    order: int = 0


class PickupLocation(PickupLocationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class PickupLocationPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    address: Optional[str] = None
    order: Optional[int] = None


class PickupDistanceUpsert(BaseModel):
    """Client sends this to store the estimated travel time between two
    pickup locations. Stored per unordered pair; identity is derived by
    sorting `(from_id, to_id)` before write."""
    model_config = ConfigDict(extra="ignore")
    from_id: str
    to_id: str
    travel_min: int = Field(ge=0, le=1440)


class PickupDistance(PickupDistanceUpsert):
    """Persisted travel-time between two pickup locations."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class VehicleCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(min_length=1, max_length=120)
    transmission: str = Field(default="", max_length=40)  # "Automat" | "Handschaltung" | "Anhänger"
    category: str = Field(default="B", max_length=10)     # driving license category
    allowed_durations: List[int] = Field(default_factory=lambda: [45, 90, 135])  # in minutes
    order: int = 0
    active: bool = True


class Vehicle(VehicleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class VehiclePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    transmission: Optional[str] = None
    category: Optional[str] = None
    allowed_durations: Optional[List[int]] = None
    order: Optional[int] = None
    active: Optional[bool] = None


class EmailTemplate(BaseModel):
    """Editable email template. `kind` is the fixed identifier used by the
    booking flow (requested / confirmed / rescheduled / cancelled)."""
    model_config = ConfigDict(extra="ignore")
    id: str = "default"                                        # kept as document id
    kind: str = Field(min_length=1, max_length=40)            # requested|confirmed|rescheduled|cancelled
    label_de: str = Field(default="", max_length=200)
    subject: str = Field(default="", max_length=300)
    body_html: str = Field(default="", max_length=20_000)    # sanitized before send
    body_text: str = Field(default="", max_length=20_000)    # plain-text fallback for clients
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class EmailTemplatePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    label_de: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
