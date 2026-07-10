/**
 * useRatingScale — fetches the admin-configurable rating scale once and
 * caches it in-module (so re-renders don't refetch).
 *
 * Returns { levels, retry, meta, valueWeight, order, topValue, isReady }.
 *  - `meta` = { value → {desc_de, bg, fg} } (drop-in replacement for the
 *    legacy RATING_META constant used in the Fahrkontrolle popup + matrix)
 *  - `valueWeight` = { value → 0..100 } used by progress.js
 *  - `topValue` = the highest positive level's value string; used by
 *    subitemWarning() to detect "mastery reached".
 *
 * All numbers derive from the config: for N positive levels the weights
 * are 100/N, 200/N, …, 100. The retry level is always 0 %.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Static defaults — used as fallback so the UI never renders empty while
// the fetch is in flight or when the backend is unreachable.
const DEFAULT_SCALE = {
  levels: [
    { value: "1", desc_de: "erklärt",     desc_en: "explained",   bg: "#dc2626", fg: "#ffffff" },
    { value: "2", desc_de: "geübt",       desc_en: "practised",   bg: "#f97316", fg: "#ffffff" },
    { value: "3", desc_de: "selbständig", desc_en: "independent", bg: "#84cc16", fg: "#0f172a" },
    { value: "4", desc_de: "sicher",      desc_en: "confident",   bg: "#166534", fg: "#ffffff" },
  ],
  retry: {
    value: "X", desc_de: "nochmals üben", desc_en: "practise again",
    bg: "#94a3b8", fg: "#0f172a",
  },
};

let CACHED = null;              // { levels, retry, updated_at }
const SUBSCRIBERS = new Set();  // React setStates

function _computeDerived(scale) {
  const levels = scale.levels || [];
  const retry = scale.retry || DEFAULT_SCALE.retry;
  const n = levels.length || 1;
  const meta = {};
  const valueWeight = {};
  const order = [];
  for (let i = 0; i < levels.length; i++) {
    const lv = levels[i];
    meta[lv.value] = { desc_de: lv.desc_de || "", bg: lv.bg, fg: lv.fg };
    valueWeight[lv.value] = Math.round(((i + 1) / n) * 100);
    order.push(lv.value);
  }
  meta[retry.value] = { desc_de: retry.desc_de || "", bg: retry.bg, fg: retry.fg };
  valueWeight[retry.value] = 0;
  order.push(retry.value);
  const topValue = levels.length ? levels[levels.length - 1].value : "";
  return { levels, retry, meta, valueWeight, order, topValue };
}

function _publish(scale) {
  CACHED = { ..._computeDerived(scale), raw: scale };
  for (const s of SUBSCRIBERS) s(CACHED);
}

/** Manually refresh from the API — call after PATCH from the admin form. */
export async function refreshRatingScale() {
  try {
    const r = await api.get("/settings/rating-scale");
    _publish(r.data);
  } catch {
    /* keep last-known good cache */
  }
}

export default function useRatingScale() {
  const [state, setState] = useState(() => CACHED || {
    ..._computeDerived(DEFAULT_SCALE),
    raw: DEFAULT_SCALE,
    isReady: false,
  });

  useEffect(() => {
    SUBSCRIBERS.add(setState);
    if (!CACHED) refreshRatingScale();
    else setState(CACHED);
    return () => SUBSCRIBERS.delete(setState);
  }, []);

  return { ...state, isReady: !!CACHED };
}
