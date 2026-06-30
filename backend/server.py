from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Response, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import requests

from default_pages import DEFAULT_ABLAUF, DEFAULT_VKU, DEFAULT_LOCATIONS, DEFAULT_IMPRESSUM, DEFAULT_DATENSCHUTZ, DEFAULT_BLOG_POSTS, DEFAULT_BOOKING_PACKAGES


# ---------- MongoDB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------- Auth helpers ----------
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


bearer = HTTPBearer(auto_error=False)


# ---------- Object Storage ----------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "saferide")
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.warning("Storage init failed: %s", e)
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        _storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        _storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB images
MAX_VIDEO_BYTES = 60 * 1024 * 1024   # 60 MB videos



async def get_current_admin(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Default content ----------
DEFAULT_CONTENT: Dict[str, Any] = {
    "hero": {
        "overline_de": "Fahrschule · Schweiz",
        "overline_en": "Driving School · Switzerland",
        "title_de": "Fahren lernen.",
        "title_en": "Learn to drive.",
        "highlight_de": "Anders. Besser. Mutiger.",
        "highlight_en": "Different. Better. Bolder.",
        "subtitle_de": "Moderne und professionelle Fahrstunden mit Herz – in den Regionen Zürich, Schwyz, St. Gallen und Graubünden.",
        "subtitle_en": "Modern and professional driving lessons with heart – in the regions of Zurich, Schwyz, St. Gallen and Graubünden.",
        "cta_primary_de": "Jetzt Probelektion anfragen",
        "cta_primary_en": "Request a trial lesson",
        "cta_secondary_de": "Mehr erfahren",
        "cta_secondary_en": "Learn more",
        "image_url": "https://images.pexels.com/photos/28837090/pexels-photo-28837090.jpeg",
        "tag1_de": "Live",
        "tag1_en": "Live",
        "tag2_de": "Saison 2026",
        "tag2_en": "Season 2026",
        "call_label_de": "Call Nadine",
        "call_label_en": "Call Nadine",
        "regions": "ZH · SZ · SG · GR",
        "rating_value": "5.0",
        "rating_label_de": "Bewertung auf Google",
        "rating_label_en": "Rating on Google",
    },
    "marquee_de": "ANDERS · BESSER · MUTIGER · SAFE RIDE · MIT HERZ AM STEUER",
    "marquee_en": "DIFFERENT · BETTER · BOLDER · SAFE RIDE · DRIVEN BY HEART",
    "why_safe_ride": {
        "overline_de": "Warum Safe Ride",
        "overline_en": "Why Safe Ride",
        "title_de": "Warum Fahrschule Safe Ride?",
        "title_en": "Why Fahrschule Safe Ride?",
        "intro_de": "Eine Fahrschule wählen heisst Vertrauen schenken. Es geht um Sicherheit, um Freude am Fahren und um den respektvollen Umgang miteinander. Genau dafür stehe ich – jeden Tag, in jeder Lektion.",
        "intro_en": "Choosing a driving school means giving trust. It's about safety, joy at the wheel and respectful interaction. That's exactly what I stand for – every day, in every lesson.",
        "pillars": [
            {
                "id": "wp1",
                "icon": "Heart",
                "title_de": "Persönlich. Echt. Auf Augenhöhe.",
                "title_en": "Personal. Real. On equal terms.",
                "body_de": "Ich bin keine anonyme Fahrschule mit fünfzehn Lehrern und einer Hotline. Ich bin Nadine – und ich kenne jeden meiner Fahrschüler:innen mit Namen, weiss um deine Stärken und deine Baustellen, deine Lieblingsstrecken und deine Fahrlieder. Bei mir bekommst du keine Lehrer-Rotation, keine Sätze wie \"Hat dir das Kollege X nicht so erklärt?\" – sondern eine durchgehende Begleitung von der ersten Probelektion bis zum Tag, an dem du den Ausweis in der Hand hältst. Das schafft Vertrauen. Und Vertrauen ist genau das, was hinter dem Steuer den Unterschied macht.",
                "body_en": "I am not an anonymous school with fifteen instructors and a hotline. I am Nadine – and I know every one of my students by name, I know your strengths and your sticking points, your favourite routes and your driving songs. With me you get no instructor rotation, no \"Didn't colleague X explain it differently?\" – just one consistent guide from your first trial lesson to the day you hold the licence in your hand. That builds trust. And trust is exactly what makes the difference behind the wheel."
            },
            {
                "id": "wp2",
                "icon": "Brain",
                "title_de": "Mental Coaching statt Druck",
                "title_en": "Mental coaching instead of pressure",
                "body_de": "Fahrenlernen ist Kopfsache. Wer Angst hat oder gestresst ist, vergisst alles, was er gelernt hat – sobald die Prüferin neben dir sitzt. Genau deshalb verbinde ich klassische Fahrlehrer-Arbeit mit fundiertem Mental Coaching: Atemübungen, mentale Vorbereitung, Reframing von Fehlern und gezielte Visualisierung. Du lernst nicht nur, wie man rückwärts parkiert – du lernst auch, wie du dich VOR und WÄHREND der Prüfung in einen ruhigen, klaren Zustand bringst. Das ist ein Unterschied, der zählt: Schüler:innen, die mit mir arbeiten, schaffen die Prüfung im Schnitt nicht nur schneller, sondern auch entspannter.",
                "body_en": "Learning to drive is a head game. Anyone who is anxious or stressed forgets everything they have learned – as soon as the examiner sits next to you. That is why I combine classical instruction with serious mental coaching: breathing exercises, mental prep, reframing mistakes, targeted visualisation. You don't just learn how to reverse-park – you learn how to bring yourself into a calm, clear state BEFORE and DURING the exam. That is a difference that counts: students who work with me pass not only faster on average, but also more relaxed."
            },
            {
                "id": "wp3",
                "icon": "Sparkles",
                "title_de": "Spezialisiert auf ADHS & Autismus",
                "title_en": "Specialised in ADHD & autism",
                "body_de": "Standard-Fahrschulen funktionieren für Standard-Schüler:innen. Wer im ADHS-Spektrum unterwegs ist oder Autismus hat, weiss: Reizüberflutung, Routinen, Verarbeitungstempo – das sind keine \"Macken\", sondern Tatsachen. Ich habe Weiterbildungen im neurodiversen Lernen gemacht und passe die Lektionen entsprechend an: kürzere, fokussiertere Einheiten, klarere Strukturen, vorhersehbare Abläufe, sensorisch entlastete Fahrzeuge. Das Ergebnis: Schüler:innen, die bei anderen Schulen frustriert aufgegeben haben, schaffen bei mir den Ausweis – und kommen freiwillig zurück, um Verwandte und Geschwister anzumelden.",
                "body_en": "Standard driving schools work for standard students. Anyone on the ADHD spectrum or with autism knows: sensory overload, routines, processing speed – these are not \"quirks\", they are facts. I have done continuing education in neurodiverse learning and adapt the lessons accordingly: shorter, more focused units, clearer structures, predictable flows, sensory-relieved vehicles. The result: students who gave up frustrated at other schools pass with me – and come back voluntarily to register their siblings."
            },
            {
                "id": "wp4",
                "icon": "Car",
                "title_de": "Moderne Fahrzeuge mit Charakter",
                "title_en": "Modern vehicles with character",
                "body_de": "Audi S3, Opel OPC, Range Rover Sport – das ist keine zufällige Sammlung, das ist eine Wahl. Drei verschiedene Konzepte, drei verschiedene Fahrgefühle, drei verschiedene Sitzpositionen. Du lernst nicht nur an einem einzigen Auto, du lernst SCHALTEN. Du spürst den Unterschied zwischen einem sportlichen Kompaktwagen und einem hochbeinigen SUV. Du verstehst, wieso eine kürzere Übersetzung in der Stadt mehr Spass macht und wieso ein langer Radstand auf der Autobahn entspannter ist. Die Fahrzeuge sind technisch top, regelmässig gewartet und – ehrlich gesagt – einfach schöner als das, was die meisten meiner Kolleg:innen anbieten.",
                "body_en": "Audi S3, Opel OPC, Range Rover Sport – that is not a random collection, that is a choice. Three different concepts, three different driving sensations, three different seating positions. You don't learn on a single car, you learn TO SHIFT. You feel the difference between a sporty compact and a tall SUV. You understand why a shorter gear ratio is more fun in the city and why a long wheelbase is more relaxed on the motorway. The vehicles are technically top-tier, regularly serviced and – honestly – simply more beautiful than what most of my colleagues offer."
            },
            {
                "id": "wp5",
                "icon": "MapPin",
                "title_de": "11 Standorte in 4 Kantonen",
                "title_en": "11 locations across 4 cantons",
                "body_de": "Einsiedeln, Lachen, Siebnen, Pfäffikon SZ, Altendorf, Wädenswil, Horgen, Richterswil, Rapperswil, Chur und Lenzerheide – wo immer du wohnst, lernst oder arbeitest, ich komme zu dir. Du verlierst keine Zeit mit langen Anfahrten zu irgendeinem zentralen Fahrschulbüro. Wir starten dort, wo es für dich Sinn ergibt: am Bahnhof, vor deiner Schule, an deinem Arbeitsplatz. Das macht den Unterschied zwischen einer halben \"Probelektion mit Stress weil ich noch zur Uni muss\" und einer richtigen 50-Minuten-Lektion, in der du wirklich etwas mitnimmst.",
                "body_en": "Einsiedeln, Lachen, Siebnen, Pfäffikon SZ, Altendorf, Wädenswil, Horgen, Richterswil, Rapperswil, Chur and Lenzerheide – wherever you live, study or work, I come to you. You don't lose time on long drives to some central driving-school office. We start where it makes sense for you: at the station, in front of your school, at your workplace. That is the difference between half a \"trial lesson with stress because I still have to get to uni\" and a proper 50-minute session in which you actually take something away."
            },
            {
                "id": "wp6",
                "icon": "ShieldCheck",
                "title_de": "Transparente Preise. Keine Tricks.",
                "title_en": "Transparent pricing. No tricks.",
                "body_de": "Was du auf der Preisseite siehst, ist das, was du zahlst. Kein Aufpreis für \"Wochenend-Lektionen\", keine versteckten Anfahrtspauschalen, keine teuren Pflicht-Pakete. Du bekommst eine ehrliche Rechnung mit allem, was du gefahren hast – inklusive Kilometerstand wenn du das willst. Wenn du eine Lektion absagst, bist du flexibel: 24 Stunden vorher reicht völlig. Ich verdiene mein Geld damit, dass meine Schüler:innen die Prüfung schaffen und mich weiterempfehlen – nicht damit, dass ich mehr Stunden draufpacke als nötig sind. Ehrlich gesagt: Wenn ich nach zehn Stunden sehe, dass du bereit bist, sage ich es dir.",
                "body_en": "What you see on the pricing page is what you pay. No surcharge for \"weekend lessons\", no hidden travel flat-rates, no expensive mandatory packages. You get an honest invoice with everything you drove – including odometer if you want. If you cancel a lesson, you are flexible: 24 hours before is enough. I earn my money from my students passing and recommending me – not from packing on more hours than necessary. Honestly: if I see after ten hours that you are ready, I will tell you."
            }
        ],
        "closing_de": "Das ist Safe Ride. Keine Marketing-Floskel. Sondern eine ehrliche, persönliche, moderne Fahrschule, die genau das tut, was sie auf der Verpackung verspricht: dich sicher, entspannt und in deinem eigenen Tempo zum Ausweis bringen.",
        "closing_en": "That is Safe Ride. Not a marketing phrase, but an honest, personal, modern driving school that does exactly what it promises: bring you safely, relaxed and at your own pace to the licence.",
        "cta_de": "Probelektion sichern",
        "cta_en": "Book a trial lesson"
    },
    "homepage_faqs": [
        {
            "id": "hf1",
            "question_de": "Wo finden die Fahrstunden statt?",
            "question_en": "Where do the lessons take place?",
            "answer_de": "In 11 Standorten in den Kantonen Zürich, Schwyz, St. Gallen und Graubünden. Wir treffen uns dort, wo es für dich am bequemsten ist – Bahnhof, Schule oder Arbeitsplatz.",
            "answer_en": "At 11 locations across the cantons of Zurich, Schwyz, St. Gallen and Graubünden. We meet wherever is most convenient for you – station, school or workplace."
        },
        {
            "id": "hf2",
            "question_de": "Wie viele Fahrstunden brauche ich bis zur Prüfung?",
            "question_en": "How many lessons do I need until the exam?",
            "answer_de": "Im Schnitt 20–35 Lektionen, abhängig von Vorerfahrung, Lerntempo und Strecke. Beim Erstgespräch schätzen wir realistisch ab, was für dich passt.",
            "answer_en": "On average 20–35 lessons, depending on prior experience, learning pace and route. In the first conversation we realistically estimate what fits for you."
        },
        {
            "id": "hf3",
            "question_de": "Was kostet eine Fahrstunde?",
            "question_en": "What does a driving lesson cost?",
            "answer_de": "Eine Lektion à 50 Minuten kostet CHF 110.–. Es gibt keine versteckten Anfahrtspauschalen und keine Aufpreise für Wochenend-Lektionen.",
            "answer_en": "A 50-minute lesson costs CHF 110.–. There are no hidden travel surcharges and no markups for weekend lessons."
        },
        {
            "id": "hf4",
            "question_de": "Welche Fahrzeuge gibt es?",
            "question_en": "Which vehicles are available?",
            "answer_de": "Audi S3, Opel OPC und Range Rover Sport – alle modern, gut gewartet und mit Doppelpedalen ausgestattet. Du kannst beim Erstgespräch wählen oder im Verlauf mehrere ausprobieren.",
            "answer_en": "Audi S3, Opel OPC and Range Rover Sport – all modern, well-serviced and equipped with dual pedals. You choose at the first session or try several over time."
        },
        {
            "id": "hf5",
            "question_de": "Bietet Safe Ride auch VKU (Verkehrskundeunterricht)?",
            "question_en": "Does Safe Ride offer VKU (theory course)?",
            "answer_de": "Ja. Der VKU dauert 8 Stunden und ist gesetzlich vorgeschrieben für alle Neulenker:innen. Die Termine findest du auf der VKU-Seite.",
            "answer_en": "Yes. VKU lasts 8 hours and is legally required for all new drivers. You'll find the dates on the VKU page."
        },
        {
            "id": "hf6",
            "question_de": "Wie schnell kann ich starten?",
            "question_en": "How quickly can I start?",
            "answer_de": "In der Regel hast du innerhalb von 7 Tagen einen Termin für deine Probelektion. Schreib einfach eine kurze Nachricht – ich antworte am gleichen Tag.",
            "answer_en": "Usually you have a slot for your trial lesson within 7 days. Just send a short message – I reply the same day."
        },
        {
            "id": "hf7",
            "question_de": "Was passiert wenn ich die Prüfung nicht bestehe?",
            "question_en": "What happens if I fail the exam?",
            "answer_de": "Keine Panik – das passiert selten und ist keine Katastrophe. Wir analysieren ruhig, was schiefgelaufen ist, machen 2–4 gezielte Lektionen zu den schwachen Punkten und du gehst entspannt zurück. Mental-Coaching inklusive.",
            "answer_en": "Don't panic – it rarely happens and is not a catastrophe. We calmly analyse what went wrong, do 2–4 targeted lessons on the weak points and you go back relaxed. Mental coaching included."
        },
        {
            "id": "hf8",
            "question_de": "Bietet Safe Ride auch Nothelferkurse an?",
            "question_en": "Does Safe Ride offer first-aid courses?",
            "answer_de": "Nein, dafür arbeite ich mit einem zertifizierten Partner zusammen. Auf Wunsch vermittle ich dir direkt einen Platz.",
            "answer_en": "No, for that I work with a certified partner. On request I directly arrange a spot for you."
        }
    ],
    "about": {
        "overline_de": "Über mich",
        "overline_en": "About me",
        "title_de": "Nadine Stäubli – deine Fahrlehrerin",
        "title_en": "Nadine Stäubli – your driving instructor",
        "body_de": "Ich freue mich, dich auf deinem Weg zur Führerprüfung zu begleiten. Bei mir gibt es keinen Platz für Druck oder Hektik – nur Wohlfühlatmosphäre, klare Erklärungen und volle Konzentration auf dich. Spezialisiert auf Mental Coaching sowie auf Schüler:innen mit ADHS oder Autismus, gehe ich individuell auf deine Bedürfnisse ein.",
        "body_en": "I'm excited to guide you on your way to the driver's license. With me there's no room for pressure or rush – just a relaxed atmosphere, clear explanations and full focus on you. Specialised in mental coaching and in students with ADHD or autism, I tailor every lesson to your needs.",
        "stat1_value": "98%",
        "stat1_label_de": "Erfolgsquote",
        "stat1_label_en": "Pass rate",
        "stat2_value": "10+",
        "stat2_label_de": "Jahre Erfahrung",
        "stat2_label_en": "Years experience",
        "stat3_value": "4 Kt.",
        "stat3_label_de": "Kantone abgedeckt",
        "stat3_label_en": "Cantons covered",
        "image_url": "https://images.unsplash.com/photo-1527593167147-e9c94a5883e6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwyfHxjb25maWRlbnQlMjB3b21hbiUyMGRyaXZpbmclMjBjYXJ8ZW58MHx8fHwxNzgyNzUwNDQ2fDA&ixlib=rb-4.1.0&q=85",
        "badge_name": "Nadine Stäubli",
        "badge_role_de": "Fahrlehrerin · seit 2014",
        "badge_role_en": "Driving instructor · since 2014",
        "trust_de": "Lizenzierte Fahrlehrerin",
        "trust_en": "Licensed driving instructor",
    },
    "services": [
        {
            "id": "s1",
            "title_de": "Fahrstunden PKW",
            "title_en": "Car driving lessons",
            "description_de": "Persönliche, lockere Fahrstunden mit Audi S3, Opel OPC oder Range Rover Sport.",
            "description_en": "Personal, relaxed lessons in the Audi S3, Opel OPC or Range Rover Sport.",
            "icon": "Car",
        },
        {
            "id": "s2",
            "title_de": "Anhänger / Pferdeanhänger",
            "title_en": "Trailer / Horse trailer",
            "description_de": "Sicher manövrieren und rangieren – auch mit Pferdeanhänger.",
            "description_en": "Safe manoeuvring and reversing – including horse trailers.",
            "icon": "Truck",
        },
        {
            "id": "s3",
            "title_de": "VKU – Verkehrskunde",
            "title_en": "Traffic theory (VKU)",
            "description_de": "Abwechslungsreich und realitätsnah – der VKU direkt bei deiner Fahrlehrerin.",
            "description_en": "Varied and realistic – traffic theory directly with your instructor.",
            "icon": "BookOpen",
        },
        {
            "id": "s4",
            "title_de": "Mental Coaching",
            "title_en": "Mental coaching",
            "description_de": "Prüfungsangst war gestern. Ruhig, fokussiert und mit Selbstvertrauen am Steuer.",
            "description_en": "Goodbye exam anxiety – calm, focused and confident behind the wheel.",
            "icon": "Brain",
        },
        {
            "id": "s5",
            "title_de": "ADHS & Autismus",
            "title_en": "ADHD & Autism",
            "description_de": "Spezialisierte Begleitung mit Geduld, Struktur und Verständnis.",
            "description_en": "Specialised guidance with patience, structure and understanding.",
            "icon": "Heart",
        },
        {
            "id": "s6",
            "title_de": "Probeprüfung",
            "title_en": "Mock exam",
            "description_de": "Simuliere die echte Prüfung und gehe mit gutem Gefühl in den Ernstfall.",
            "description_en": "Simulate the real test and walk into exam day with confidence.",
            "icon": "ShieldCheck",
        },
    ],
    "fleet": [
        {
            "id": "f1",
            "name": "Audi S3",
            "spec": "310 PS · Automat",
            "description_de": "Sportlich, dynamisch und sicher: Lerne fahren im souveränen S3.",
            "description_en": "Sporty, dynamic and safe: learn to drive in the confident S3.",
            "image_url": "https://images.pexels.com/photos/16613452/pexels-photo-16613452.jpeg",
        },
        {
            "id": "f2",
            "name": "Opel OPC",
            "spec": "280 PS · Handschaltung",
            "description_de": "Pure Fahrfreude für alle, die die Handschaltung lernen wollen.",
            "description_en": "Pure driving fun for everyone who wants to master the manual gearbox.",
            "image_url": "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=80",
        },
        {
            "id": "f3",
            "name": "Range Rover Sport",
            "spec": "510 PS · Automat",
            "description_de": "Premium-SUV für ein souveränes Gefühl auf jeder Strasse.",
            "description_en": "Premium SUV for a confident feeling on every road.",
            "image_url": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=80",
        },
    ],
    "pricing": {
        "title_de": "Transparente Preise",
        "title_en": "Transparent pricing",
        "subtitle_de": "Ehrlich, klar und ohne versteckte Kosten – je nach Kanton.",
        "subtitle_en": "Honest, clear and without hidden costs – depending on the canton.",
        "plans": [
            {
                "id": "p1",
                "region_de": "Kanton ZH / SZ",
                "region_en": "Canton ZH / SZ",
                "name_de": "PKW · 45 Min.",
                "name_en": "Car · 45 min.",
                "price": "CHF 90",
                "duration_de": "45 Minuten",
                "duration_en": "45 minutes",
                "highlight": False,
            },
            {
                "id": "p2",
                "region_de": "Kanton ZH / SZ",
                "region_en": "Canton ZH / SZ",
                "name_de": "PKW · 60 Min.",
                "name_en": "Car · 60 min.",
                "price": "CHF 120",
                "duration_de": "60 Minuten",
                "duration_en": "60 minutes",
                "highlight": True,
            },
            {
                "id": "p3",
                "region_de": "Kanton ZH / SZ",
                "region_en": "Canton ZH / SZ",
                "name_de": "Anhänger · 45 Min.",
                "name_en": "Trailer · 45 min.",
                "price": "CHF 120",
                "duration_de": "45 Minuten",
                "duration_en": "45 minutes",
                "highlight": False,
            },
            {
                "id": "p4",
                "region_de": "Kanton GR",
                "region_en": "Canton GR",
                "name_de": "PKW · 50 Min.",
                "name_en": "Car · 50 min.",
                "price": "CHF 110",
                "duration_de": "50 Minuten",
                "duration_en": "50 minutes",
                "highlight": False,
            },
        ],
        "note_de": "Für Neukund:innen fällt eine einmalige Versicherungspauschale von CHF 120 an (zahlbar bei der zweiten Lektion). Bei Bank- oder Kartenzahlungen verrechnen wir eine Administrationspauschale von CHF 10.",
        "note_en": "For new customers a one-time insurance fee of CHF 120 applies (payable with the second lesson). Bank or card payments incur an administration fee of CHF 10.",
        "currency_overline_de": "CHF · Preise",
        "currency_overline_en": "CHF · Pricing",
        "popular_label_de": "Beliebt",
        "popular_label_en": "Popular",
        "cta_text_de": "Anfragen",
        "cta_text_en": "Book now",
    },
    "contact": {
        "phone": "+41 79 585 00 85",
        "email": "info@fahrschule-saferide.ch",
        "address_de": "Region Zürich · Schwyz · St. Gallen · Graubünden",
        "address_en": "Region Zurich · Schwyz · St. Gallen · Graubünden",
        "hours_de": "Mo – Fr · 07:00 – 20:00 · Sa nach Absprache",
        "hours_en": "Mon – Fri · 7:00 – 20:00 · Sat by appointment",
        "instagram": "https://www.instagram.com/",
        "tiktok": "https://www.tiktok.com/@nadine_staeubli",
        "overline_de": "Kontakt",
        "overline_en": "Contact",
        "title_de": "Bereit für deine erste Lektion?",
        "title_en": "Ready for your first lesson?",
        "sub_de": "Melde dich – ich freue mich auf dich.",
        "sub_en": "Get in touch – I'm looking forward to meeting you.",
    },
    "services_overline_de": "Was du bekommst",
    "services_overline_en": "What you get",
    "services_title_de": "Mehr als nur Fahrstunden",
    "services_title_en": "More than driving lessons",
    "fleet_overline_de": "Unsere Flotte",
    "fleet_overline_en": "Our fleet",
    "fleet_title_de": "Premium am Steuer",
    "fleet_title_en": "Premium behind the wheel",
    "gallery_overline_de": "Galerie",
    "gallery_overline_en": "Gallery",
    "gallery_title_de": "Eindrücke",
    "gallery_title_en": "Impressions",
    "reviews_overline_de": "Bewertungen",
    "reviews_overline_en": "Reviews",
    "reviews_title_de": "Was Schüler:innen sagen",
    "reviews_title_en": "What our students say",
    "reviews_rating_value": "5.0",
    "reviews_rating_label_de": "Bewertung auf Google",
    "reviews_rating_label_en": "Rating on Google",
    "footer_tagline_de": "Anders. Besser. Mutiger.",
    "footer_tagline_en": "Different. Better. Bolder.",
    "nav_cta_de": "Anfragen",
    "nav_cta_en": "Get in touch",
    "google_reviews_url": "https://www.google.com/search?q=Fahrschule+Safe+Ride+Nadine+St%C3%A4ubli+Bewertungen",
    "google_reviews_count": "60+",
    "google_reviews_label_de": "Bewertungen mit 5,0 Sternen auf Google",
    "google_reviews_label_en": "Reviews with 5.0 stars on Google",
    "logo_url": "https://customer-assets.emergentagent.com/job_driving-school-cms/artifacts/0v9hxuzi_saferide%20logo.jpg",
    "nadine": {
        "intro_title_de": "Ich bin Nadine",
        "intro_title_en": "I'm Nadine",
        "intro_text_de": "Seit 2014 begleite ich Schüler:innen entspannt und ehrlich zum Führerausweis. Lerne mich kurz kennen – dann sehen wir uns auf der ersten Lektion.",
        "intro_text_en": "Since 2014 I've been guiding students calmly and honestly to their driving licence. Get to know me briefly – then we'll see each other at the first lesson.",
        "media_type": "image",
        "media_url": "https://images.unsplash.com/photo-1527593167147-e9c94a5883e6?auto=format&fit=crop&w=900&q=80",
        "stat1_value": "1500+",
        "stat1_label_de": "Schüler:innen",
        "stat1_label_en": "students",
        "stat2_value": "12",
        "stat2_label_de": "Jahre Erfahrung",
        "stat2_label_en": "years experience",
    },
    "ablauf": DEFAULT_ABLAUF,
    "vku": DEFAULT_VKU,
    "impressum": DEFAULT_IMPRESSUM,
    "datenschutz": DEFAULT_DATENSCHUTZ,
}


DEFAULT_TESTIMONIALS = [
    {
        "id": "t1",
        "name": "Jael Thalmann",
        "rating": 5,
        "date": "Juni 2026",
        "text_de": "D'Fahrstunde bi dir sind eifach immer mega gsi! Mir hend nöd nur viel glernt, sondern au immer wieder chönne lache. Locker, entspannt und trotzdem alles verständlich erklärt. Merci für dini Geduld und die viele lustige Momänt!",
        "text_en": "Driving lessons with you were always amazing! We not only learned a lot but also laughed a lot. Relaxed and chilled atmosphere and everything explained clearly. Thanks for your patience and all the fun moments!",
    },
    {
        "id": "t2",
        "name": "Vanessa Jahn",
        "rating": 5,
        "date": "Juni 2026",
        "text_de": "Dank Nadines Geduld, ruhiger Art und verständlichen Erklärungen habe ich die Fahrprüfung beim ersten Versuch bestanden. Sie hat mir geholfen, mehr an mich zu glauben und Selbstvertrauen aufzubauen.",
        "text_en": "Thanks to Nadine's patience, calm manner and clear explanations I passed the driving test on the first attempt. She helped me believe in myself and build confidence.",
    },
    {
        "id": "t3",
        "name": "Luis Ellenberger",
        "rating": 5,
        "date": "März 2026",
        "text_de": "Die Fahrstunden waren immer lustig, aber Nadine hat auch immer im richtigen Moment gesagt, wenn es ernst gilt. Ich habe mich jederzeit sicher gefühlt und war super vorbereitet.",
        "text_en": "The lessons were always fun, but Nadine knew exactly when to get serious. I always felt safe and was perfectly prepared.",
    },
    {
        "id": "t4",
        "name": "Robi Steiner",
        "rating": 5,
        "date": "Februar 2026",
        "text_de": "Tolle Fahrschule! Speziell das Angebot der Probeprüfung hat mir sehr geholfen. Eine sehr sympathische Fahrlehrerin – grosses Lob an Nadine!",
        "text_en": "Great driving school! Especially the mock exam helped me a lot. A very likeable instructor – big thumbs up to Nadine!",
    },
    {
        "id": "t5",
        "name": "Leonie Waelti",
        "rating": 5,
        "date": "Februar 2026",
        "text_de": "Sehr empathisch, geduldig und zuverlässig. Mit ihrer freundlichen Art schafft sie eine lockere Atmosphäre – perfekt zum Autofahren lernen. Man merkt, sie ist mit ganzem Herzen dabei.",
        "text_en": "Very empathetic, patient and reliable. With her friendly attitude she creates a relaxed atmosphere – perfect for learning to drive. You can tell she's doing it with all her heart.",
    },
    {
        "id": "t6",
        "name": "Joël",
        "rating": 5,
        "date": "Juni 2025",
        "text_de": "Wer eine Fahrschule mit topmotivierter Fahrlehrerin sucht, ist bei Safe Ride genau richtig. Hohes fachliches Wissen, super Atmosphäre und der Audi S3 als Bonus.",
        "text_en": "If you're looking for a driving school with a top-motivated instructor, Safe Ride is the right place. High level of expertise, great atmosphere and the Audi S3 as a bonus.",
    },
]

DEFAULT_GALLERY = [
    {
        "id": "g1",
        "image_url": "https://images.pexels.com/photos/28837090/pexels-photo-28837090.jpeg",
        "caption_de": "Audi S3 auf der Strasse",
        "caption_en": "Audi S3 on the road",
    },
    {
        "id": "g2",
        "image_url": "https://images.unsplash.com/photo-1678191255790-7a1f0af3f6ef?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwyfHxzd2lzcyUyMG1vdW50YWluJTIwcm9hZCUyMGN1cnZ5fGVufDB8fHx8MTc4Mjc1MDQ0Nnww&ixlib=rb-4.1.0&q=85",
        "caption_de": "Kurvige Schweizer Bergstrasse",
        "caption_en": "Curvy Swiss mountain road",
    },
    {
        "id": "g3",
        "image_url": "https://images.pexels.com/photos/16613452/pexels-photo-16613452.jpeg",
        "caption_de": "Premium Fahrschulauto",
        "caption_en": "Premium driving school car",
    },
    {
        "id": "g4",
        "image_url": "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=80",
        "caption_de": "Detail Cockpit",
        "caption_en": "Cockpit detail",
    },
    {
        "id": "g5",
        "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
        "caption_de": "Sportwagen Frontansicht",
        "caption_en": "Sports car front view",
    },
    {
        "id": "g6",
        "image_url": "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1600&q=80",
        "caption_de": "Steering Wheel Close-Up",
        "caption_en": "Steering wheel close-up",
    },
]


# ---------- Pydantic Models ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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


class TestimonialCreate(BaseModel):
    name: str
    rating: int = Field(ge=1, le=5)
    date: str
    text_de: str
    text_en: str = ""


class Testimonial(TestimonialCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


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


class BlogPostCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=120)
    title_de: str = Field(min_length=1, max_length=240)
    title_en: str = Field(min_length=1, max_length=240)


class BlogPostPatch(BaseModel):
    """Partial update for a blog post – any field key allowed."""
    model_config = ConfigDict(extra="allow")


class BookingPackageCreate(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = Field(min_length=1, max_length=80)
    title_de: str = Field(min_length=1, max_length=120)
    title_en: str = Field(min_length=1, max_length=120)
    price_chf: int = Field(ge=0)


class BookingPackagePatch(BaseModel):
    model_config = ConfigDict(extra="allow")


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


# ---------- App ----------
app = FastAPI(title="Fahrschule Safe Ride API")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup_event():
    # Storage
    init_storage()

    # Indexes
    await db.users.create_index("email", unique=True)
    await db.contact_submissions.create_index("created_at")

    # Seed admin
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
        logging.info("Seeded admin user: %s", admin_email)
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logging.info("Updated admin password for %s", admin_email)

    # Seed content
    content_doc = await db.site_content.find_one({"id": "main"})
    if not content_doc:
        await db.site_content.insert_one({"id": "main", **DEFAULT_CONTENT})
    else:
        # Ensure newer keys exist on existing installs (idempotent deep merge for one level).
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

    # Seed testimonials
    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([dict(t) for t in DEFAULT_TESTIMONIALS])

    # Seed gallery
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([dict(g) for g in DEFAULT_GALLERY])

    # Seed location landing pages (one document per slug) with idempotent migration.
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
            # hero images with the curated Pexels fallback. Preserves admin
            # uploads (which use the /api/files/ path).
            current_hero = existing.get("hero_image_url", "")
            if "images.unsplash.com" in current_hero and default_loc.get("hero_image_url") != current_hero:
                await db.locations.update_one(
                    {"slug": slug},
                    {"$set": {"hero_image_url": default_loc["hero_image_url"]}},
                )

    # Seed blog posts (one document per slug).
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

    # Seed booking packages (one document per slug).
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

    # Index for bookings (queryable by created_at).
    await db.bookings.create_index("created_at")


# ---------- Auth Routes ----------
@api.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    token = create_access_token(user["id"], email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role")},
    }


@api.get("/auth/me")
async def auth_me(admin=Depends(get_current_admin)):
    return admin


# ---------- Public Content Routes ----------
def _clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


@api.get("/content")
async def get_content():
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc) or {}


@api.put("/content")
async def update_content(body: Dict[str, Any], admin=Depends(get_current_admin)):
    body.pop("_id", None)
    body["id"] = "main"
    await db.site_content.update_one({"id": "main"}, {"$set": body}, upsert=True)
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc)


@api.patch("/content")
async def patch_content(updates: Dict[str, Any], admin=Depends(get_current_admin)):
    """
    Partial update of site content using dot-notation paths.
    Body example: {"hero.title_de": "Neuer Titel", "services.0.title_de": "Foo"}
    """
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Updates angegeben")
    set_ops = {k: v for k, v in updates.items() if k != "_id" and k != "id"}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine gültigen Felder")
    await db.site_content.update_one({"id": "main"}, {"$set": set_ops}, upsert=True)
    doc = await db.site_content.find_one({"id": "main"})
    return _clean(doc)


# ---------- Testimonials ----------
@api.get("/testimonials", response_model=List[Testimonial])
async def list_testimonials():
    items = await db.testimonials.find({}, {"_id": 0}).to_list(500)
    return items


@api.post("/testimonials", response_model=Testimonial)
async def add_testimonial(payload: TestimonialCreate, admin=Depends(get_current_admin)):
    item = Testimonial(**payload.model_dump())
    await db.testimonials.insert_one(item.model_dump())
    return item


@api.put("/testimonials/{item_id}", response_model=Testimonial)
async def update_testimonial(item_id: str, payload: TestimonialCreate, admin=Depends(get_current_admin)):
    update_data = payload.model_dump()
    res = await db.testimonials.update_one({"id": item_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial nicht gefunden")
    doc = await db.testimonials.find_one({"id": item_id}, {"_id": 0})
    return doc


@api.delete("/testimonials/{item_id}")
async def delete_testimonial(item_id: str, admin=Depends(get_current_admin)):
    res = await db.testimonials.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial nicht gefunden")
    return {"ok": True}


# ---------- Gallery ----------
@api.get("/gallery", response_model=List[GalleryItem])
async def list_gallery():
    items = await db.gallery.find({}, {"_id": 0}).to_list(500)
    return items


@api.post("/gallery", response_model=GalleryItem)
async def add_gallery(payload: GalleryItemCreate, admin=Depends(get_current_admin)):
    item = GalleryItem(**payload.model_dump())
    await db.gallery.insert_one(item.model_dump())
    return item


@api.put("/gallery/{item_id}", response_model=GalleryItem)
async def update_gallery(item_id: str, payload: GalleryItemCreate, admin=Depends(get_current_admin)):
    res = await db.gallery.update_one({"id": item_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    doc = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    return doc


@api.delete("/gallery/{item_id}")
async def delete_gallery(item_id: str, admin=Depends(get_current_admin)):
    res = await db.gallery.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}


# ---------- Contact Submissions ----------
@api.post("/contact", response_model=ContactSubmission)
async def submit_contact(payload: ContactSubmissionCreate):
    sub = ContactSubmission(**payload.model_dump())
    await db.contact_submissions.insert_one(sub.model_dump())
    return sub


@api.get("/contact/submissions", response_model=List[ContactSubmission])
async def list_submissions(admin=Depends(get_current_admin)):
    items = await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.delete("/contact/submissions/{sub_id}")
async def delete_submission(sub_id: str, admin=Depends(get_current_admin)):
    res = await db.contact_submissions.delete_one({"id": sub_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}


@api.patch("/contact/submissions/{sub_id}/read")
async def mark_read(sub_id: str, admin=Depends(get_current_admin)):
    res = await db.contact_submissions.update_one({"id": sub_id}, {"$set": {"read": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
    return {"ok": True}


# ---------- File Upload ----------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    content_type = file.content_type or "application/octet-stream"
    is_image = content_type in ALLOWED_IMAGE_TYPES
    is_video = content_type in ALLOWED_VIDEO_TYPES
    if not (is_image or is_video):
        raise HTTPException(status_code=400, detail="Nur Bild- (jpg/png/webp/gif) oder Videodateien (mp4/mov/webm) erlaubt")
    data = await file.read()
    limit = MAX_VIDEO_BYTES if is_video else MAX_UPLOAD_BYTES
    if len(data) > limit:
        max_mb = limit // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"Datei zu gross (max. {max_mb} MB)")
    ext = (ALLOWED_VIDEO_TYPES if is_video else ALLOWED_IMAGE_TYPES)[content_type]
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)
    stored_path = result.get("path", path)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": stored_path,
        "original_filename": file.filename,
        "content_type": content_type,
        "kind": "video" if is_video else "image",
        "size": len(data),
        "uploaded_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": stored_path, "url": f"/api/files/{stored_path}", "kind": "video" if is_video else "image"}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, ctype = get_object(path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden") from e
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=31536000"})


# ---------- Locations (SEO landing pages) ----------
@api.get("/locations")
async def list_locations():
    items = await db.locations.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return items


@api.get("/locations/{slug}")
async def get_location(slug: str):
    doc = await db.locations.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    return doc


@api.post("/locations")
async def create_location(payload: LocationCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    existing = await db.locations.find_one({"slug": body["slug"]})
    if existing:
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    body.setdefault("order", await db.locations.count_documents({}))
    await db.locations.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@api.patch("/locations/{slug}")
async def patch_location(slug: str, updates: Dict[str, Any], admin=Depends(get_current_admin)):
    """Partial update of a location document using dot-notation paths."""
    if not updates:
        raise HTTPException(status_code=400, detail="Keine Updates angegeben")
    set_ops = {k: v for k, v in updates.items() if k not in ("_id", "id", "slug")}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine gültigen Felder")
    res = await db.locations.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    doc = await db.locations.find_one({"slug": slug}, {"_id": 0})
    return doc


@api.delete("/locations/{slug}")
async def delete_location(slug: str, admin=Depends(get_current_admin)):
    res = await db.locations.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Standort nicht gefunden")
    return {"ok": True}


# ---------- Blog Posts ----------
def _is_post_published(doc: dict) -> bool:
    """A post is publicly visible if:
      - status == 'published' (with optional future scheduled_publish_at as a publish-delay), OR
      - status == 'scheduled' AND scheduled_publish_at is in the past (auto-promote).
    """
    status = doc.get("status")
    sched = doc.get("scheduled_publish_at")
    now = datetime.now(timezone.utc)
    if status == "published":
        if not sched:
            return True
        try:
            sched_dt = datetime.fromisoformat(sched.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return True
        return sched_dt <= now
    if status == "scheduled" and sched:
        try:
            sched_dt = datetime.fromisoformat(sched.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return False
        return sched_dt <= now
    return False


@api.get("/blog")
async def list_blog_posts(category: Optional[str] = None, tag: Optional[str] = None):
    """Public list of all published blog posts. Optional filter by category or tag."""
    items = await db.blog_posts.find({}, {"_id": 0}).sort("published_at", -1).to_list(500)
    items = [p for p in items if _is_post_published(p)]
    if category:
        items = [p for p in items if category in (p.get("categories") or [])]
    if tag:
        items = [p for p in items if tag in (p.get("tags") or [])]
    return items


@api.get("/blog/admin")
async def list_blog_posts_admin(admin=Depends(get_current_admin)):
    """Admin view – includes drafts and scheduled posts."""
    items = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.get("/blog/{slug}")
async def get_blog_post(slug: str):
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    return doc


@api.post("/blog")
async def create_blog_post(payload: BlogPostCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.blog_posts.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    body.setdefault("status", "draft")
    body.setdefault("categories", [])
    body.setdefault("tags", [])
    body.setdefault("reading_time_min", 3)
    body.setdefault("order", await db.blog_posts.count_documents({}))
    body["created_at"] = now
    body["updated_at"] = now
    await db.blog_posts.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@api.patch("/blog/{slug}")
async def update_blog_post(slug: str, payload: BlogPostPatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    set_ops["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.blog_posts.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    doc = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    return doc


@api.delete("/blog/{slug}")
async def delete_blog_post(slug: str, admin=Depends(get_current_admin)):
    res = await db.blog_posts.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    return {"ok": True}


# ---------- Booking Packages ----------
@api.get("/packages")
async def list_packages():
    items = await db.booking_packages.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return [p for p in items if p.get("active", True)]


@api.get("/packages/admin")
async def list_packages_admin(admin=Depends(get_current_admin)):
    return await db.booking_packages.find({}, {"_id": 0}).sort("order", 1).to_list(200)


@api.get("/packages/{slug}")
async def get_package(slug: str):
    doc = await db.booking_packages.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return doc


@api.post("/packages")
async def create_package(payload: BookingPackageCreate, admin=Depends(get_current_admin)):
    body = payload.model_dump()
    body["slug"] = body["slug"].lower().strip()
    if await db.booking_packages.find_one({"slug": body["slug"]}):
        raise HTTPException(status_code=409, detail="Slug existiert bereits")
    body["id"] = str(uuid.uuid4())
    body.setdefault("active", True)
    body.setdefault("order", await db.booking_packages.count_documents({}))
    await db.booking_packages.insert_one(body)
    return {k: v for k, v in body.items() if k != "_id"}


@api.patch("/packages/{slug}")
async def update_package(slug: str, payload: BookingPackagePatch, admin=Depends(get_current_admin)):
    set_ops = payload.model_dump(exclude_unset=True)
    if not set_ops:
        raise HTTPException(status_code=400, detail="Leere Aktualisierung")
    res = await db.booking_packages.update_one({"slug": slug}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return await db.booking_packages.find_one({"slug": slug}, {"_id": 0})


@api.delete("/packages/{slug}")
async def delete_package(slug: str, admin=Depends(get_current_admin)):
    res = await db.booking_packages.delete_one({"slug": slug})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paket nicht gefunden")
    return {"ok": True}


# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(payload: BookingCreate):
    """Public booking creation – stored as a pending request that Nadine confirms manually."""
    # Validate package exists & is active
    pkg = await db.booking_packages.find_one({"slug": payload.package_slug})
    if not pkg or not pkg.get("active", True):
        raise HTTPException(status_code=404, detail="Paket nicht verfuegbar")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["status"] = "pending"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    # Snapshot the package so historical price/title is preserved
    doc["package_snapshot"] = {
        "slug": pkg["slug"],
        "title_de": pkg.get("title_de"),
        "title_en": pkg.get("title_en"),
        "price_chf": pkg.get("price_chf"),
        "lesson_count": pkg.get("lesson_count"),
        "service_type": pkg.get("service_type"),
    }
    await db.bookings.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.get("/bookings")
async def list_bookings(admin=Depends(get_current_admin)):
    items = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.patch("/bookings/{booking_id}")
async def update_booking(booking_id: str, payload: Dict[str, Any] = Body(...), admin=Depends(get_current_admin)):
    allowed = {"status", "admin_note"}
    set_ops = {k: v for k, v in payload.items() if k in allowed}
    if not set_ops:
        raise HTTPException(status_code=400, detail="Keine erlaubten Felder")
    res = await db.bookings.update_one({"id": booking_id}, {"$set": set_ops})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    return await db.bookings.find_one({"id": booking_id}, {"_id": 0})


@api.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, admin=Depends(get_current_admin)):
    res = await db.bookings.delete_one({"id": booking_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Buchung nicht gefunden")
    return {"ok": True}


# ---------- SEO: sitemap.xml ----------
def _public_base_url(request: "Request") -> str:
    """Derive the absolute public base URL the visitor used to reach this API.
    Honours the PUBLIC_SITE_URL env var first, then X-Forwarded-* headers,
    then falls back to request.base_url. Strips trailing `/api`."""
    override = os.environ.get("PUBLIC_SITE_URL")
    if override:
        return override.rstrip("/")
    fwd_host = request.headers.get("x-forwarded-host")
    fwd_proto = request.headers.get("x-forwarded-proto", "https")
    if fwd_host:
        base = f"{fwd_proto}://{fwd_host}".rstrip("/")
    else:
        base = str(request.base_url).rstrip("/")
    if base.endswith("/api"):
        base = base[: -len("/api")]
    return base


@api.get("/sitemap.xml")
async def sitemap_xml(request: "Request"):
    """Dynamic sitemap listing the homepage, ablauf, vku and ALL location landing pages.
    Recommended robots.txt entry: `Sitemap: <PUBLIC_SITE_URL>/api/sitemap.xml`."""
    from datetime import datetime as _dt
    base = _public_base_url(request)
    now = _dt.now(timezone.utc).strftime("%Y-%m-%d")
    static_urls = [
        (f"{base}/", "1.0", "weekly"),
        (f"{base}/ablauf-zum-fuehrerschein", "0.9", "monthly"),
        (f"{base}/vku-unterricht", "0.9", "weekly"),
        (f"{base}/impressum", "0.3", "yearly"),
        (f"{base}/datenschutz", "0.3", "yearly"),
    ]
    loc_docs = await db.locations.find({}, {"slug": 1, "_id": 0}).sort("order", 1).to_list(200)
    loc_urls = [(f"{base}/fahrschule-{d['slug']}", "0.85", "monthly") for d in loc_docs]

    # Blog posts (only published, scheduled-for-now-or-past).
    blog_docs = await db.blog_posts.find({}, {"_id": 0}).to_list(500)
    blog_urls = [(f"{base}/blog/{d['slug']}", "0.7", "monthly") for d in blog_docs if _is_post_published(d)]
    # Blog index page.
    static_urls.append((f"{base}/blog", "0.8", "weekly"))
    static_urls.append((f"{base}/buchung", "0.95", "weekly"))

    urls_xml = "".join(
        f"<url><loc>{u}</loc><lastmod>{now}</lastmod><changefreq>{f}</changefreq><priority>{p}</priority></url>"
        for u, p, f in (static_urls + loc_urls + blog_urls)
    )
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls_xml}"
        "</urlset>"
    )
    return Response(content=body, media_type="application/xml")


# ---------- Health ----------
@api.get("/")
async def root():
    return {"status": "ok", "service": "Fahrschule Safe Ride"}


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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
