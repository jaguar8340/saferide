"""Iteration 24 backend tests:
- 17 locations with correct slugs (st-gallen removed, 4 new added)
- here_we_drive_features and here_we_drive_places arrays present
- exam_routes_title_de renamed to 'Hier fahren wir'
- content.location_faq_template shape + placeholders
- content.about.dog_photo_url / dog_caption_de present
- content.contact.footer_image_url present
"""
import os
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")

EXPECTED_SLUGS = {
    "einsiedeln", "siebnen", "lachen", "waedenswil", "horgen",
    "altendorf", "chur", "lenzerheide", "rapperswil", "pfaeffikon-sz",
    "richterswil", "wetzikon", "domat-ems",
    "reichenburg", "kaltbrunn", "zizers", "landquart",
}


@pytest.fixture(scope="module")
def locations():
    r = requests.get(f"{BASE_URL}/api/locations", timeout=15)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def content():
    r = requests.get(f"{BASE_URL}/api/content", timeout=15)
    assert r.status_code == 200
    return r.json()


# --- Location list tests ---
class TestLocations:
    def test_exactly_17_locations(self, locations):
        assert len(locations) == 17, f"Expected 17 locations, got {len(locations)}"

    def test_all_expected_slugs_present(self, locations):
        slugs = {loc["slug"] for loc in locations}
        missing = EXPECTED_SLUGS - slugs
        extra = slugs - EXPECTED_SLUGS
        assert not missing, f"Missing slugs: {missing}"
        assert not extra, f"Unexpected extra slugs: {extra}"

    def test_st_gallen_removed(self, locations):
        slugs = {loc["slug"] for loc in locations}
        assert "st-gallen" not in slugs, "st-gallen must be removed"

    def test_new_locations_present(self, locations):
        slugs = {loc["slug"] for loc in locations}
        for new in ("reichenburg", "kaltbrunn", "zizers", "landquart"):
            assert new in slugs, f"{new} must be present"

    def test_here_we_drive_features_populated(self, locations):
        for loc in locations:
            feats = loc.get("here_we_drive_features")
            assert isinstance(feats, list), f"{loc['slug']}: features not a list"
            assert 4 <= len(feats) <= 5, f"{loc['slug']}: expected 4-5 features, got {len(feats)}: {feats}"
            for f in feats:
                assert isinstance(f, str) and f.strip(), f"{loc['slug']}: empty feature entry"

    def test_here_we_drive_places_populated(self, locations):
        for loc in locations:
            places = loc.get("here_we_drive_places")
            assert isinstance(places, list), f"{loc['slug']}: places not a list"
            assert 4 <= len(places) <= 5, f"{loc['slug']}: expected 4-5 places, got {len(places)}: {places}"
            for p in places:
                assert isinstance(p, str) and p.strip(), f"{loc['slug']}: empty place entry"

    def test_exam_routes_title_renamed(self, locations):
        for loc in locations:
            title = loc.get("exam_routes_title_de", "")
            assert title == "Hier fahren wir", (
                f"{loc['slug']}: exam_routes_title_de should be 'Hier fahren wir', got '{title}'"
            )

    def test_reichenburg_specific_chips(self, locations):
        loc = next((l for l in locations if l["slug"] == "reichenburg"), None)
        assert loc is not None
        expected_feats = ["Autobahn A3", "Landstrasse", "Tempo-30-Zone", "Kreisel", "Bahnübergänge"]
        expected_places = ["Bilten", "Siebnen", "Schübelbach", "Tuggen", "Lachen"]
        assert loc["here_we_drive_features"] == expected_feats, (
            f"Reichenburg features mismatch: {loc['here_we_drive_features']}"
        )
        assert loc["here_we_drive_places"] == expected_places, (
            f"Reichenburg places mismatch: {loc['here_we_drive_places']}"
        )

    def test_kaltbrunn_canton_sg(self, locations):
        loc = next((l for l in locations if l["slug"] == "kaltbrunn"), None)
        assert loc is not None
        assert loc["canton"] == "SG"

    def test_zizers_canton_gr(self, locations):
        loc = next((l for l in locations if l["slug"] == "zizers"), None)
        assert loc is not None
        assert loc["canton"] == "GR"

    def test_landquart_canton_gr(self, locations):
        loc = next((l for l in locations if l["slug"] == "landquart"), None)
        assert loc is not None
        assert loc["canton"] == "GR"


# --- Content tests ---
class TestContent:
    def test_location_faq_template_exists(self, content):
        tpl = content.get("location_faq_template")
        assert isinstance(tpl, dict), "location_faq_template must be a dict"

    def test_location_faq_template_title(self, content):
        tpl = content["location_faq_template"]
        assert tpl.get("title_de") == "Häufige Fragen"

    def test_location_faq_template_has_15_faqs(self, content):
        tpl = content["location_faq_template"]
        faqs = tpl.get("faqs", [])
        assert isinstance(faqs, list) and len(faqs) == 15, (
            f"Expected 15 FAQs, got {len(faqs)}"
        )

    def test_first_faq_contains_name_placeholder(self, content):
        tpl = content["location_faq_template"]
        first = tpl["faqs"][0]
        assert "{name}" in first["question_de"], (
            f"First FAQ question_de must contain '{{name}}' placeholder, got: {first['question_de']}"
        )

    def test_about_dog_caption_default(self, content):
        about = content.get("about", {})
        cap = about.get("dog_caption_de", "")
        assert cap.strip(), "about.dog_caption_de should be set"

    def test_about_dog_photo_url_present(self, content):
        about = content.get("about", {})
        assert "dog_photo_url" in about, "about.dog_photo_url key must exist (even if empty)"

    def test_contact_footer_image_url_present(self, content):
        contact = content.get("contact", {})
        assert "footer_image_url" in contact, "contact.footer_image_url key must exist (even if empty)"


# --- Regression: content basics still healthy ---
class TestRegression:
    def test_content_has_hero(self, content):
        assert "hero" in content

    def test_content_has_about(self, content):
        assert "about" in content
