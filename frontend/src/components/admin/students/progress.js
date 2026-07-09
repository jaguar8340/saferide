/**
 * Pure helpers for the Fahrkontrolle progress + warning display.
 *
 * All logic lives here (no React, no API) so it stays trivially testable.
 * Same rating scale as the popup:
 *   1 = erklärt        → 25 %
 *   2 = geübt          → 50 %
 *   3 = selbständig    → 75 %
 *   4 = sicher         → 100 %
 *   X = nochmals üben  →   0 %   (also drives the RED warning)
 *   ""/never rated     →   0 %   (drives the YELLOW warning)
 */

const VALUE_WEIGHT = {
  "1": 25,
  "2": 50,
  "3": 75,
  "4": 100,
  "X": 0,
};

/** Highest weight ever recorded for a single subitem across all lessons.
 *  Returns 0 when the subitem has never been rated. */
export function subitemBestPercent(subitemId, lessons, assessments) {
  let best = 0;
  let hasAny = false;
  for (const l of lessons) {
    const cell = assessments[`${subitemId}:${l.id}`];
    if (!cell || !cell.value) continue;
    hasAny = true;
    const w = VALUE_WEIGHT[cell.value] ?? 0;
    if (w > best) best = w;
  }
  return { percent: best, rated: hasAny };
}

/** Percent for a whole category = average of its subitems' best percents.
 *  Un-rated subitems count as 0 (per user spec). */
export function categoryPercent(categoryId, subitems, lessons, assessments) {
  const catSubs = subitems.filter((s) => s.category_id === categoryId);
  if (catSubs.length === 0) return 0;
  let sum = 0;
  for (const s of catSubs) sum += subitemBestPercent(s.id, lessons, assessments).percent;
  return Math.round(sum / catSubs.length);
}

/** Overall percent = average of category percents. */
export function overallPercent(categories, subitems, lessons, assessments) {
  if (categories.length === 0) return 0;
  let sum = 0;
  for (const c of categories) sum += categoryPercent(c.id, subitems, lessons, assessments);
  return Math.round(sum / categories.length);
}

/**
 * Warning status for a subitem:
 *   "red"    → ≥ 2 X-ratings OR stuck below "4" in the LAST 3 rated lessons
 *   "yellow" → never rated
 *   "green"  → best rating ≥ 4 ("sicher")
 *   "neutral"→ rated once or twice with 1/2/3
 */
export function subitemWarning(subitemId, lessons, assessments) {
  // Collect rated lesson entries in lesson order.
  const sortedLessons = [...lessons].sort(
    (a, b) => (a.lesson_number || 0) - (b.lesson_number || 0),
  );

  const ratings = [];    // [{lesson_number, value}]
  let xCount = 0;
  let hasFour = false;
  for (const l of sortedLessons) {
    const cell = assessments[`${subitemId}:${l.id}`];
    if (!cell || !cell.value) continue;
    ratings.push({ n: l.lesson_number, value: cell.value });
    if (cell.value === "X") xCount += 1;
    if (cell.value === "4") hasFour = true;
  }

  if (ratings.length === 0) return "yellow";

  if (xCount >= 2) return "red";

  // Last 3 rated lessons all below 4 (never showed mastery in recent history)
  const last3 = ratings.slice(-3);
  if (last3.length === 3 && last3.every((r) => r.value !== "4")) return "red";

  if (hasFour) return "green";

  return "neutral";
}

/** Aggregate warning for a whole category. */
export function categoryWarning(categoryId, subitems, lessons, assessments) {
  const catSubs = subitems.filter((s) => s.category_id === categoryId);
  if (catSubs.length === 0) return "neutral";
  let red = 0;
  let yellow = 0;
  let green = 0;
  for (const s of catSubs) {
    const w = subitemWarning(s.id, lessons, assessments);
    if (w === "red") red += 1;
    else if (w === "yellow") yellow += 1;
    else if (w === "green") green += 1;
  }
  if (red > 0) return "red";
  // All subitems reached "sicher" → category done
  if (green === catSubs.length) return "green";
  // Nothing ever rated in this category
  if (yellow === catSubs.length) return "yellow";
  return "neutral";
}

/** Visual palette for warning states — used by both text and background. */
export const WARN_STYLES = {
  red:     { bg: "#fee2e2", border: "#dc2626", text: "#991b1b", dot: "#dc2626", label: "Problemthema" },
  yellow:  { bg: "#fef9c3", border: "#eab308", text: "#854d0e", dot: "#eab308", label: "Noch nicht bewertet" },
  green:   { bg: "#dcfce7", border: "#16a34a", text: "#166534", dot: "#16a34a", label: "Sicher beherrscht" },
  neutral: { bg: "#f8fafc", border: "#cbd5e1", text: "#334155", dot: "#94a3b8", label: "In Ausbildung" },
};
