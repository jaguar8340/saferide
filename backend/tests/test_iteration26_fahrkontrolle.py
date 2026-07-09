"""
Iteration 26 – Fahrkontrolle module (elektronisches Schülerblatt).

Backend E2E test coverage for:
  * Seed data (categories/subitems/routes)
  * Students CRUD (+ cascade delete of dependent lessons + assessments)
  * Fahrkontrolle master data CRUD + reorder (categories, subitems, routes)
  * Student lessons – auto-numbering, patch, delete cascades assessments
  * Assessments upsert-by-key semantics + clear-with-empty deletes row

Auth: uses admin@saferide.ch / SafeRide2026! (Bearer JWT).
Cleanup: every test that creates data cleans up in a finally block.
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://driving-school-cms.preview.emergentagent.com",
).rstrip("/")
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    assert token
    return token


@pytest.fixture(scope="session")
def client(admin_token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    })
    return s


# ============================================================
#  Seed data – categories, subitems, routes
# ============================================================
class TestFahrkontrolleSeeds:
    def test_categories_seeded(self, client):
        r = client.get(f"{BASE_URL}/api/fahrkontrolle/categories", timeout=30)
        assert r.status_code == 200
        cats = r.json()
        titles = [c["title_de"] for c in cats]
        for expected in [
            "Vorschulung", "Grundschulung", "Hauptschulung",
            "Perfektionsschulung", "Manöver", "Vorprüfung",
        ]:
            assert expected in titles, f"missing seeded category {expected}"
        # Verify orders 10/20/30/40/50/60 present for the 6 defaults
        default_orders = sorted(
            [c["order"] for c in cats if c["title_de"] in {
                "Vorschulung", "Grundschulung", "Hauptschulung",
                "Perfektionsschulung", "Manöver", "Vorprüfung",
            }]
        )
        assert default_orders == [10, 20, 30, 40, 50, 60]

    def test_subitems_seeded_35(self, client):
        r = client.get(f"{BASE_URL}/api/fahrkontrolle/subitems", timeout=30)
        assert r.status_code == 200
        subs = r.json()
        # per-category counts from spec: 5+7+9+5+5+4 = 35
        cat_r = client.get(f"{BASE_URL}/api/fahrkontrolle/categories", timeout=30)
        cat_by_id = {c["id"]: c["title_de"] for c in cat_r.json()}
        by_cat: dict[str, int] = {}
        for s in subs:
            title = cat_by_id.get(s["category_id"])
            if title:
                by_cat[title] = by_cat.get(title, 0) + 1
        # Only assert the 6 default categories – admins may add more
        assert by_cat.get("Vorschulung") == 5
        assert by_cat.get("Grundschulung") == 7
        assert by_cat.get("Hauptschulung") == 9
        assert by_cat.get("Perfektionsschulung") == 5
        assert by_cat.get("Manöver") == 5
        assert by_cat.get("Vorprüfung") == 4

    def test_routes_seeded_12(self, client):
        r = client.get(f"{BASE_URL}/api/fahrkontrolle/routes", timeout=30)
        assert r.status_code == 200
        routes = r.json()
        names = {rt["name"] for rt in routes}
        # 12 default routes should all be present
        for expected in [
            "Passugg", "Lenzerheide", "Haldenstein", "Landquart",
            "Felsberg", "Chur Zentrum", "Domat/Ems", "Reichenau",
            "Trimmis", "Zizers", "Malans", "Autobahn A13",
        ]:
            assert expected in names, f"missing seeded route {expected}"


# ============================================================
#  Students CRUD + cascade delete
# ============================================================
class TestStudentsCRUD:
    def test_students_full_crud_and_cascade(self, client):
        # CREATE
        payload = {
            "first_name": "TEST_Max",
            "last_name": "TEST_Muster",
            "phone": "+41 79 000 00 00",
            "email": "max.muster.test@example.com",
            "category": "B",
            "instructor": "Nadine",
        }
        r = client.post(f"{BASE_URL}/api/students", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        student = r.json()
        assert student["first_name"] == "TEST_Max"
        assert student["last_name"] == "TEST_Muster"
        assert student["category"] == "B"
        assert "id" in student and student["id"]
        assert "created_at" in student and student["created_at"]
        sid = student["id"]

        try:
            # LIST
            r = client.get(f"{BASE_URL}/api/students", timeout=30)
            assert r.status_code == 200
            ids = [s["id"] for s in r.json()]
            assert sid in ids

            # GET single
            r = client.get(f"{BASE_URL}/api/students/{sid}", timeout=30)
            assert r.status_code == 200
            assert r.json()["first_name"] == "TEST_Max"

            # PATCH
            r = client.patch(
                f"{BASE_URL}/api/students/{sid}", json={"city": "Chur"}, timeout=30,
            )
            assert r.status_code == 200, r.text
            assert r.json()["city"] == "Chur"
            # verify persistence
            r = client.get(f"{BASE_URL}/api/students/{sid}", timeout=30)
            assert r.json()["city"] == "Chur"

            # Add 2 lessons + 1 assessment to test cascade
            l1 = client.post(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
                json={"date": "2026-02-01"}, timeout=30,
            ).json()
            l2 = client.post(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
                json={"date": "2026-02-02"}, timeout=30,
            ).json()
            assert l1["lesson_number"] == 1
            assert l2["lesson_number"] == 2

            # need a real subitem for assessment
            subs = client.get(f"{BASE_URL}/api/fahrkontrolle/subitems", timeout=30).json()
            some_subitem = subs[0]["id"]
            r = client.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={"subitem_id": some_subitem, "lesson_id": l1["id"], "value": "3", "comment": "Gut"},
                timeout=30,
            )
            assert r.status_code == 200

            # confirm counts before delete
            lessons_before = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons", timeout=30
            ).json()
            assess_before = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments", timeout=30
            ).json()
            assert len(lessons_before) == 2
            assert len(assess_before) == 1

            # DELETE student → should cascade
            r = client.delete(f"{BASE_URL}/api/students/{sid}", timeout=30)
            assert r.status_code == 200
            sid_deleted = True

            # student gone
            r = client.get(f"{BASE_URL}/api/students/{sid}", timeout=30)
            assert r.status_code == 404

            # lessons + assessments purged
            lessons_after = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons", timeout=30
            ).json()
            assess_after = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments", timeout=30
            ).json()
            assert lessons_after == []
            assert assess_after == []
        finally:
            # Ensure cleanup even if any assertion above fails after create
            try:
                client.delete(f"{BASE_URL}/api/students/{sid}", timeout=15)
            except Exception:
                pass


# ============================================================
#  Master data CRUD – categories, subitems, routes
# ============================================================
class TestMasterDataCRUD:
    def test_category_crud_reorder(self, client):
        # CREATE (order auto-assigned to last+1)
        cats_before = client.get(f"{BASE_URL}/api/fahrkontrolle/categories", timeout=30).json()
        max_order = max([c["order"] for c in cats_before]) if cats_before else 0
        r = client.post(
            f"{BASE_URL}/api/fahrkontrolle/categories",
            json={"title_de": f"TEST_CAT_{uuid.uuid4().hex[:6]}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        cat = r.json()
        assert cat["order"] == max_order + 1

        try:
            # PATCH title
            new_title = "TEST_CAT_RENAMED"
            r = client.patch(
                f"{BASE_URL}/api/fahrkontrolle/categories/{cat['id']}",
                json={"title_de": new_title, "order": cat["order"]},
                timeout=30,
            )
            assert r.status_code == 200
            assert r.json()["title_de"] == new_title

            # REORDER
            r = client.post(
                f"{BASE_URL}/api/fahrkontrolle/categories/reorder",
                json={"items": [{"id": cat["id"], "order": 999}]},
                timeout=30,
            )
            assert r.status_code == 200
            cats_after = client.get(
                f"{BASE_URL}/api/fahrkontrolle/categories", timeout=30
            ).json()
            assert any(c["id"] == cat["id"] and c["order"] == 999 for c in cats_after)
        finally:
            r = client.delete(
                f"{BASE_URL}/api/fahrkontrolle/categories/{cat['id']}", timeout=30
            )
            assert r.status_code == 200

    def test_subitem_crud(self, client):
        cats = client.get(f"{BASE_URL}/api/fahrkontrolle/categories", timeout=30).json()
        parent_cat = cats[0]
        r = client.post(
            f"{BASE_URL}/api/fahrkontrolle/subitems",
            json={
                "category_id": parent_cat["id"],
                "title_de": "TEST_SUB",
            },
            timeout=30,
        )
        assert r.status_code == 200, r.text
        sub = r.json()
        assert sub["category_id"] == parent_cat["id"]
        assert sub["order"] > 0

        try:
            # PATCH
            r = client.patch(
                f"{BASE_URL}/api/fahrkontrolle/subitems/{sub['id']}",
                json={
                    "category_id": parent_cat["id"],
                    "title_de": "TEST_SUB_RENAMED",
                    "order": sub["order"],
                },
                timeout=30,
            )
            assert r.status_code == 200
            assert r.json()["title_de"] == "TEST_SUB_RENAMED"

            # REORDER
            r = client.post(
                f"{BASE_URL}/api/fahrkontrolle/subitems/reorder",
                json={"items": [{"id": sub["id"], "order": 555}]},
                timeout=30,
            )
            assert r.status_code == 200
        finally:
            r = client.delete(
                f"{BASE_URL}/api/fahrkontrolle/subitems/{sub['id']}", timeout=30
            )
            assert r.status_code == 200

    def test_route_crud(self, client):
        r = client.post(
            f"{BASE_URL}/api/fahrkontrolle/routes",
            json={"name": "TEST_Route"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        route = r.json()
        assert route["name"] == "TEST_Route"
        assert route["order"] > 0

        try:
            r = client.patch(
                f"{BASE_URL}/api/fahrkontrolle/routes/{route['id']}",
                json={"name": "TEST_Route_Renamed", "order": route["order"]},
                timeout=30,
            )
            assert r.status_code == 200
            assert r.json()["name"] == "TEST_Route_Renamed"

            r = client.post(
                f"{BASE_URL}/api/fahrkontrolle/routes/reorder",
                json={"items": [{"id": route["id"], "order": 777}]},
                timeout=30,
            )
            assert r.status_code == 200
        finally:
            r = client.delete(
                f"{BASE_URL}/api/fahrkontrolle/routes/{route['id']}", timeout=30
            )
            assert r.status_code == 200


# ============================================================
#  Student lessons – auto-numbering, patch, delete cascade
# ============================================================
class TestStudentLessons:
    def test_lessons_auto_number_and_route_attach(self, client):
        # create student
        s = client.post(
            f"{BASE_URL}/api/students",
            json={"first_name": "TEST_LessonFlow", "last_name": "TEST_S"},
            timeout=30,
        ).json()
        sid = s["id"]
        try:
            nums = []
            lesson_ids = []
            for _ in range(3):
                r = client.post(
                    f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
                    json={},
                    timeout=30,
                )
                assert r.status_code == 200
                lesson = r.json()
                nums.append(lesson["lesson_number"])
                lesson_ids.append(lesson["id"])
            assert nums == [1, 2, 3]

            # PATCH routes onto lesson 1
            routes = client.get(
                f"{BASE_URL}/api/fahrkontrolle/routes", timeout=30
            ).json()
            some_route = routes[0]["id"]
            r = client.patch(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons/{lesson_ids[0]}",
                json={"routes": [some_route]},
                timeout=30,
            )
            assert r.status_code == 200
            assert r.json()["routes"] == [some_route]

            # add an assessment to lesson[1] then DELETE that lesson
            subs = client.get(
                f"{BASE_URL}/api/fahrkontrolle/subitems", timeout=30
            ).json()
            some_sub = subs[0]["id"]
            client.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={
                    "subitem_id": some_sub,
                    "lesson_id": lesson_ids[1],
                    "value": "2",
                    "comment": "",
                },
                timeout=30,
            )
            all_before = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                timeout=30,
            ).json()
            assert any(a["lesson_id"] == lesson_ids[1] for a in all_before)

            r = client.delete(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons/{lesson_ids[1]}",
                timeout=30,
            )
            assert r.status_code == 200

            all_after = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                timeout=30,
            ).json()
            assert not any(a["lesson_id"] == lesson_ids[1] for a in all_after)
        finally:
            client.delete(f"{BASE_URL}/api/students/{sid}", timeout=15)


# ============================================================
#  Assessments upsert semantics
# ============================================================
class TestAssessmentsUpsert:
    def test_upsert_by_key_and_clear_deletes(self, client):
        s = client.post(
            f"{BASE_URL}/api/students",
            json={"first_name": "TEST_Assess", "last_name": "TEST_Flow"},
            timeout=30,
        ).json()
        sid = s["id"]
        try:
            lesson = client.post(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/lessons",
                json={},
                timeout=30,
            ).json()
            lid = lesson["id"]
            subs = client.get(
                f"{BASE_URL}/api/fahrkontrolle/subitems", timeout=30
            ).json()
            sub_id = subs[0]["id"]

            # First PUT — create
            r = client.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={"subitem_id": sub_id, "lesson_id": lid, "value": "3", "comment": "Gut"},
                timeout=30,
            )
            assert r.status_code == 200
            first_id = r.json()["id"]
            assert r.json()["value"] == "3"
            assert r.json()["comment"] == "Gut"

            # Second PUT with same key, different value — must update in place (same row)
            r = client.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={"subitem_id": sub_id, "lesson_id": lid, "value": "4", "comment": "Sehr gut"},
                timeout=30,
            )
            assert r.status_code == 200
            assert r.json()["id"] == first_id
            assert r.json()["value"] == "4"

            # GET reflects update
            all_a = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                timeout=30,
            ).json()
            match = [a for a in all_a if a["subitem_id"] == sub_id and a["lesson_id"] == lid]
            assert len(match) == 1
            assert match[0]["value"] == "4"

            # Empty value+comment deletes the row
            r = client.put(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                json={"subitem_id": sub_id, "lesson_id": lid, "value": "", "comment": ""},
                timeout=30,
            )
            assert r.status_code == 200

            all_a = client.get(
                f"{BASE_URL}/api/fahrkontrolle/students/{sid}/assessments",
                timeout=30,
            ).json()
            assert not any(a["subitem_id"] == sub_id and a["lesson_id"] == lid for a in all_a)
        finally:
            client.delete(f"{BASE_URL}/api/students/{sid}", timeout=15)


# ============================================================
#  Regression – existing key endpoints still work
# ============================================================
class TestRegression:
    def test_public_content_ok(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=30)
        assert r.status_code == 200
        assert "hero" in r.json() or "brand" in r.json()

    def test_locations_list(self):
        r = requests.get(f"{BASE_URL}/api/locations", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 15

    def test_blog_list(self):
        r = requests.get(f"{BASE_URL}/api/blog", timeout=30)
        assert r.status_code == 200

    def test_admin_auth_required_on_students(self):
        r = requests.get(f"{BASE_URL}/api/students", timeout=30)
        assert r.status_code in (401, 403)
