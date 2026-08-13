"""
Focused bug verification for Neue Lektion rating buttons.

Run against preview only: https://driving-school-cms.preview.emergentagent.com
This script verifies that NewLessonModal renders rating buttons from
/api/settings/rating-scale, highlights selected values using configured colours,
saves a new lesson end-to-end, and supports a temporarily customised 1-3+X scale.
"""

import re


BASE_URL = "https://driving-school-cms.preview.emergentagent.com"
ADMIN_EMAIL = "admin@saferide.ch"
ADMIN_PASSWORD = "SafeRide2026!"


async def run(page):
    async def api_json(path, method="GET", body=None, token=None):
        return await page.evaluate(
            """async ({path, method, body, token}) => {
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;
                const res = await fetch(path, {
                    method,
                    headers,
                    body: body === null || body === undefined ? undefined : JSON.stringify(body),
                });
                const text = await res.text();
                let data = null;
                try { data = text ? JSON.parse(text) : null; } catch { data = text; }
                if (!res.ok) throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
                return data;
            }""",
            {"path": path, "method": method, "body": body, "token": token},
        )

    async def hex_to_rgb(hex_value):
        return await page.evaluate(
            """(hex) => {
                const h = hex.replace('#', '').trim();
                const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
                const n = parseInt(full, 16);
                return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
            }""",
            hex_value,
        )

    async def open_modal_and_verify_scale(student_id, category_id, subitem_id, expected_order, expected_meta, expected_range):
        await page.goto(f"{BASE_URL}/admin/students/{student_id}?tab=fahrkontrolle", wait_until="domcontentloaded")
        await page.get_by_test_id("fahrkontrolle-tab").wait_for(timeout=25000)
        await page.get_by_test_id("fahrkontrolle-add-lesson").click()
        await page.get_by_test_id("new-lesson-modal").wait_for(timeout=10000)
        await page.wait_for_timeout(600)

        subtitle = (await page.locator('[data-testid="new-lesson-modal"] p').first.text_content() or "").strip()
        print(f"Modal subtitle: {subtitle}")
        assert f"1–{expected_range}" in subtitle, f"Expected subtitle range 1–{expected_range}, got: {subtitle}"
        assert "1–5" not in subtitle or expected_range == "5", "Subtitle still contains hardcoded 1–5"

        await page.get_by_test_id(f"new-lesson-cat-toggle-{category_id}").click()
        await page.get_by_test_id(f"new-lesson-sub-{subitem_id}").wait_for(timeout=10000)
        buttons = page.locator(f'button[data-testid^="new-lesson-rate-{subitem_id}-"]')
        count = await buttons.count()
        labels = [(await buttons.nth(i).inner_text()).strip() for i in range(count)]
        print(f"Buttons for subitem {subitem_id}: {labels}")
        assert labels == expected_order, f"Expected {expected_order}, got {labels}"
        assert count == len(expected_order), f"Expected {len(expected_order)} buttons, got {count}"
        return subtitle, labels

    created_lesson_id = None
    original_scale = None
    token = None
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto(f"{BASE_URL}/admin/login", wait_until="domcontentloaded")
        if await page.get_by_test_id("admin-login-page").is_visible(timeout=5000):
            await page.get_by_test_id("admin-email-input").fill(ADMIN_EMAIL)
            await page.get_by_test_id("admin-password-input").fill(ADMIN_PASSWORD)
            await page.get_by_test_id("admin-login-submit").click()
        await page.wait_for_function(
            "() => !!localStorage.getItem('saferide_admin_token')",
            timeout=25000,
        )
        await page.wait_for_url(re.compile(r".*/admin(?:\?.*)?$"), timeout=25000)
        token = await page.evaluate("localStorage.getItem('saferide_admin_token')")
        assert token, "Admin JWT was not stored after login"
        print("Admin login succeeded")

        original_scale = await api_json("/api/settings/rating-scale")
        original_order = [lv["value"] for lv in original_scale["levels"]] + [original_scale["retry"]["value"]]
        original_meta = {lv["value"]: lv for lv in original_scale["levels"]}
        original_meta[original_scale["retry"]["value"]] = original_scale["retry"]
        original_top = original_scale["levels"][-1]["value"]
        print(f"Original API rating order: {original_order}")

        students = await api_json("/api/students", token=token)
        assert students, "No students available for Fahrkontrolle test"
        student = students[0]
        student_id = student["id"]
        print(f"Using student: {student.get('first_name')} {student.get('last_name')} ({student_id})")

        categories = await api_json("/api/fahrkontrolle/categories", token=token)
        subitems = await api_json("/api/fahrkontrolle/subitems", token=token)
        assert categories and subitems, "Fahrkontrolle master data missing categories or subitems"
        categories_sorted = sorted(categories, key=lambda c: c.get("order", 0))
        chosen_category = None
        chosen_subitem = None
        for cat in categories_sorted:
            cat_subs = sorted([s for s in subitems if s.get("category_id") == cat["id"]], key=lambda s: s.get("order", 0))
            if cat_subs:
                chosen_category = cat
                chosen_subitem = cat_subs[0]
                break
        assert chosen_category and chosen_subitem, "No category with subitems found"
        category_id = chosen_category["id"]
        subitem_id = chosen_subitem["id"]
        print(f"Using category/subitem: {chosen_category.get('title_de')} / {chosen_subitem.get('title_de')}")

        lessons_before = await api_json(f"/api/fahrkontrolle/students/{student_id}/lessons", token=token)
        before_ids = {l["id"] for l in lessons_before}

        await open_modal_and_verify_scale(student_id, category_id, subitem_id, original_order, original_meta, original_top)

        value_to_click = "3" if "3" in original_order else original_order[0]
        button = page.get_by_test_id(f"new-lesson-rate-{subitem_id}-{value_to_click}")
        await button.click()
        await page.wait_for_timeout(250)
        bg = await button.evaluate("el => getComputedStyle(el).backgroundColor")
        expected_bg = await hex_to_rgb(original_meta[value_to_click]["bg"])
        klass = await button.get_attribute("class") or ""
        print(f"Selected {value_to_click}: computed bg={bg}, expected bg={expected_bg}, class={klass}")
        assert bg == expected_bg, f"Selected button background mismatch: expected {expected_bg}, got {bg}"
        assert "ring-2" in klass and "ring-[#0f172a]" in klass, "Selected button does not show active ring styling"

        await page.get_by_test_id("new-lesson-save").click()
        await page.get_by_text(re.compile(r"Lektion\s+\d+\s+angelegt\s+\(1 Bewertungen\)")).wait_for(timeout=20000)
        await page.get_by_test_id("new-lesson-modal").wait_for(state="detached", timeout=10000)
        print("Save toast appeared and modal closed")

        lessons_after = await api_json(f"/api/fahrkontrolle/students/{student_id}/lessons", token=token)
        new_lessons = [l for l in lessons_after if l["id"] not in before_ids]
        assert len(new_lessons) >= 1, "No new lesson found after saving modal"
        created_lesson = sorted(new_lessons, key=lambda l: l.get("lesson_number", 0))[-1]
        created_lesson_id = created_lesson["id"]
        lesson_number = created_lesson["lesson_number"]
        assessments = await api_json(f"/api/fahrkontrolle/students/{student_id}/assessments", token=token)
        matching = [
            a for a in assessments
            if a.get("lesson_id") == created_lesson_id and a.get("subitem_id") == subitem_id and a.get("value") == value_to_click
        ]
        assert matching, "Saved assessment not returned by assessments API"
        await page.get_by_test_id(f"fahrkontrolle-lesson-header-{lesson_number}").wait_for(timeout=10000)
        cell = page.get_by_test_id(f"fk-cell-{subitem_id}-{created_lesson_id}")
        await cell.wait_for(timeout=10000)
        cell_text = (await cell.text_content() or "").strip()
        print(f"Matrix cell for new lesson: text={cell_text}")
        assert value_to_click in cell_text, f"Matrix did not show saved value {value_to_click}; got {cell_text}"

        # Direct dynamic check for the user's 1-3 + X Stammdaten scenario.
        if len(original_scale["levels"]) >= 3:
            custom_scale = {"levels": original_scale["levels"][:3], "retry": original_scale["retry"]}
            await api_json("/api/settings/rating-scale", method="PATCH", body=custom_scale, token=token)
            custom_order = [lv["value"] for lv in custom_scale["levels"]] + [custom_scale["retry"]["value"]]
            custom_meta = {lv["value"]: lv for lv in custom_scale["levels"]}
            custom_meta[custom_scale["retry"]["value"]] = custom_scale["retry"]
            await open_modal_and_verify_scale(student_id, category_id, subitem_id, custom_order, custom_meta, custom_scale["levels"][-1]["value"])
            assert "4" not in custom_order or len(custom_scale["levels"]) >= 4
            await page.get_by_test_id("new-lesson-modal-close").click()
            await page.get_by_test_id("new-lesson-modal").wait_for(state="detached", timeout=10000)
            print(f"Temporary 1-3+X scale rendered correctly: {custom_order}")

        print("TEST PASSED: NewLessonModal follows rating scale, highlights configured colour, saves end-to-end")

    except Exception as exc:
        print(f"TEST FAILED: {exc}")
        raise
    finally:
        if token and created_lesson_id:
            try:
                await api_json(f"/api/fahrkontrolle/students/{student_id}/lessons/{created_lesson_id}", method="DELETE", token=token)
                print(f"Cleaned up created lesson {created_lesson_id}")
            except Exception as cleanup_exc:
                print(f"Cleanup failed for lesson {created_lesson_id}: {cleanup_exc}")
        if token and original_scale:
            try:
                await api_json(
                    "/api/settings/rating-scale",
                    method="PATCH",
                    body={"levels": original_scale["levels"], "retry": original_scale["retry"]},
                    token=token,
                )
                print("Restored original rating scale")
            except Exception as restore_exc:
                print(f"Rating scale restore failed: {restore_exc}")
