"""Default seed data for the Fahrkontrolle (elektronisches Schülerblatt).

These lists are inserted ONLY when the respective collection is empty.
The admin can freely edit / add / remove / reorder everything via the UI
afterwards — nothing is ever hard-coded on the frontend.
"""
import uuid

# Six main training phases. Order-index = 10, 20, 30 … so admins can insert
# between with 5-based increments.
DEFAULT_FK_CATEGORIES = [
    {"title_de": "Vorschulung",        "title_en": "Pre-training",       "order": 10},
    {"title_de": "Grundschulung",      "title_en": "Basic training",     "order": 20},
    {"title_de": "Hauptschulung",      "title_en": "Main training",      "order": 30},
    {"title_de": "Perfektionsschulung","title_en": "Advanced training",  "order": 40},
    {"title_de": "Manöver",            "title_en": "Manoeuvres",         "order": 50},
    {"title_de": "Vorprüfung",         "title_en": "Mock exam",          "order": 60},
]


# Sub-items grouped by category title (looked up by title at seed time).
# Order-index in 10-based steps to allow inserts in between.
DEFAULT_FK_SUBITEMS = {
    "Vorschulung": [
        ("Rundumkontrolle",           "Walk-around check"),
        ("Vorbereitung im Stand",     "Preparation at standstill"),
        ("Sitzposition & Spiegel",    "Seating & mirrors"),
        ("Bedienelemente kennen",     "Know the controls"),
        ("Anfahren am Berg",          "Hill start"),
    ],
    "Grundschulung": [
        ("Anfahren & Anhalten",       "Starting & stopping"),
        ("Kupplung dosieren",         "Clutch control"),
        ("Schalten",                  "Gear shifting"),
        ("Blicktechnik",              "Visual technique"),
        ("Spiegelkontrolle",          "Mirror control"),
        ("Lenken in Kurven",          "Steering in curves"),
        ("Tempoanpassung",            "Speed adjustment"),
    ],
    "Hauptschulung": [
        ("Vortritt beachten",         "Right of way"),
        ("Kreisverkehr",              "Roundabout"),
        ("Einspuren & Abbiegen",      "Merging & turning"),
        ("Ausserorts fahren",         "Rural driving"),
        ("Autobahn (Auffahren)",      "Motorway on-ramp"),
        ("Autobahn (Spurwechsel)",    "Motorway lane change"),
        ("Autobahn (Abfahren)",       "Motorway exit"),
        ("Verhalten Fussgänger",      "Behaviour towards pedestrians"),
        ("Tempo-30-Zone",             "30-km/h zone"),
    ],
    "Perfektionsschulung": [
        ("Vorausschauendes Fahren",   "Anticipatory driving"),
        ("Öko-Fahrweise",             "Eco driving"),
        ("Dunkelheit / Nacht",        "Darkness / night"),
        ("Regen / Nässe",             "Rain / wet conditions"),
        ("Passstrasse & Serpentinen", "Mountain pass & switchbacks"),
    ],
    "Manöver": [
        ("Rückwärts einparken",       "Reverse parking"),
        ("Parallel-Parkieren",        "Parallel parking"),
        ("Wenden in drei Zügen",      "Three-point turn"),
        ("Anhalten am Randstein",     "Kerb stop"),
        ("Rückwärts um die Ecke",     "Reversing round a corner"),
    ],
    "Vorprüfung": [
        ("Selbständigkeit",           "Independence"),
        ("Sicherheitsbewusstsein",    "Safety awareness"),
        ("Prüfungsroutine",           "Exam routine"),
        ("Umgang mit Stress",         "Stress handling"),
    ],
}


# Default routes / villages Nadine drives with her students – editable.
DEFAULT_FK_ROUTES = [
    ("Passugg",         10),
    ("Lenzerheide",     20),
    ("Haldenstein",     30),
    ("Landquart",       40),
    ("Felsberg",        50),
    ("Chur Zentrum",    60),
    ("Domat/Ems",       70),
    ("Reichenau",       80),
    ("Trimmis",         90),
    ("Zizers",         100),
    ("Malans",         110),
    ("Autobahn A13",   120),
]


async def seed_fahrkontrolle_defaults(db) -> None:
    """Idempotent one-shot seeder. Only inserts when the respective
    collection is empty – any manual edits to categories/subitems/routes
    made by the admin are preserved on subsequent app starts."""
    # ----- Categories -----
    if await db.fk_categories.count_documents({}) == 0:
        cat_docs = []
        for c in DEFAULT_FK_CATEGORIES:
            cat_docs.append({"id": str(uuid.uuid4()), **c})
        if cat_docs:
            await db.fk_categories.insert_many(cat_docs)

    # ----- Subitems (only if none exist yet) -----
    if await db.fk_subitems.count_documents({}) == 0:
        cats = await db.fk_categories.find(
            {}, {"_id": 0, "id": 1, "title_de": 1}
        ).to_list(200)
        by_title = {c["title_de"]: c["id"] for c in cats}
        sub_docs = []
        for cat_title, items in DEFAULT_FK_SUBITEMS.items():
            cat_id = by_title.get(cat_title)
            if not cat_id:
                continue
            for idx, (de, en) in enumerate(items, start=1):
                sub_docs.append(
                    {
                        "id": str(uuid.uuid4()),
                        "category_id": cat_id,
                        "title_de": de,
                        "title_en": en,
                        "description_de": "",
                        "description_en": "",
                        "order": idx * 10,
                    }
                )
        if sub_docs:
            await db.fk_subitems.insert_many(sub_docs)

    # ----- Routes -----
    if await db.fk_routes.count_documents({}) == 0:
        route_docs = [
            {"id": str(uuid.uuid4()), "name": name, "order": order}
            for name, order in DEFAULT_FK_ROUTES
        ]
        if route_docs:
            await db.fk_routes.insert_many(route_docs)
