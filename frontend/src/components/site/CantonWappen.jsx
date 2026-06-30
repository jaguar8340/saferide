/**
 * Small inline SVG cantonal coats of arms for Swiss cantons.
 * Uses simplified flag-style art (no licensing concerns) sized to fit
 * inside a tag/pill. Each canton wappen ships as a tiny self-contained SVG.
 *
 * Detection: pass either a `code` ("ZH"|"SZ"|"SG"|"GR") or a free-text
 * `region` string (e.g. "Kanton Schwyz") and the component returns null
 * if no match is found.
 */

// Map of canton code → simple, recognisable SVG of the flag/wappen.
const WAPPEN_SVG = {
  // Schwyz: red field with white inset cross in upper-left
  SZ: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#dc2626" />
      <g fill="#ffffff">
        <rect x="5" y="5" width="2.4" height="6" />
        <rect x="3.8" y="6.5" width="4.8" height="2.4" />
      </g>
    </svg>
  ),
  // Zürich: diagonally split blue/white
  ZH: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#ffffff" />
      <polygon points="0,0 32,0 0,32" fill="#1d4ed8" />
    </svg>
  ),
  // St. Gallen: green field with fasces (simplified)
  SG: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#16a34a" />
      <g fill="#ffffff">
        <rect x="14" y="6" width="4" height="20" rx="0.6" />
        <rect x="11.5" y="12" width="9" height="1.6" />
        <rect x="11.5" y="16" width="9" height="1.6" />
        <rect x="11.5" y="20" width="9" height="1.6" />
      </g>
    </svg>
  ),
  // Graubünden: triple combined (black/white left, blue/yellow top-right, white-red bottom-right)
  GR: (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#ffffff" />
      {/* Left half: black ibex on white background (simplified to black triangle) */}
      <polygon points="0,0 16,0 16,32 0,32" fill="#0f172a" />
      <polygon points="0,0 16,0 16,32" fill="#ffffff" opacity="0.95" />
      {/* Top-right quadrant blue-yellow split */}
      <polygon points="16,0 32,0 32,16 16,16" fill="#1d4ed8" />
      <polygon points="16,0 32,0 16,16" fill="#fbbf24" />
      {/* Bottom-right quadrant red-white split */}
      <polygon points="16,16 32,16 32,32 16,32" fill="#ffffff" />
      <polygon points="16,16 32,32 16,32" fill="#dc2626" />
    </svg>
  ),
};

const NAME_TO_CODE = {
  schwyz: "SZ",
  "kanton schwyz": "SZ",
  sz: "SZ",
  zürich: "ZH",
  zurich: "ZH",
  "kanton zürich": "ZH",
  zh: "ZH",
  "st. gallen": "SG",
  "st gallen": "SG",
  "sankt gallen": "SG",
  sg: "SG",
  graubünden: "GR",
  graubunden: "GR",
  "kanton graubünden": "GR",
  gr: "GR",
};

export function detectCantonCode(input) {
  if (!input) return null;
  const codes = detectCantonCodes(input);
  return codes[0] || null;
}

/**
 * Returns ALL canton codes detected in `input`, in order of appearance.
 * Useful for combined labels like "Kanton ZH / SZ" → ["ZH", "SZ"].
 */
export function detectCantonCodes(input) {
  if (!input) return [];
  const str = String(input);
  // First search by stable uppercase code (avoids "sz" matching inside "schwyz" etc.)
  const codeRegex = /\b(SZ|ZH|SG|GR)\b/g;
  const codes = [];
  let m;
  while ((m = codeRegex.exec(str.toUpperCase()))) {
    if (!codes.includes(m[1])) codes.push(m[1]);
  }
  if (codes.length > 0) return codes;
  // Fallback: full canton names
  const norm = str.toLowerCase().trim();
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (norm.includes(name) && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

/**
 * Inline canton wappen. Returns null when no match.
 * @param {object} props
 * @param {string} [props.code]   Direct canton code ("SZ"|"ZH"|"SG"|"GR").
 * @param {string} [props.region] Free-text canton name; auto-detected.
 *                                When the region matches multiple cantons
 *                                (e.g. "Kanton ZH / SZ") ALL shields are
 *                                rendered side-by-side.
 * @param {string} [props.size]   Tailwind size class (default "w-4 h-4").
 * @param {string} [props.className]
 */
export default function CantonWappen({ code, region, size = "w-4 h-4", className = "" }) {
  const codes = code ? [code] : detectCantonCodes(region);
  if (codes.length === 0) return null;
  if (codes.length === 1) {
    const resolved = codes[0];
    if (!WAPPEN_SVG[resolved]) return null;
    return (
      <span
        data-testid={`canton-wappen-${resolved}`}
        className={`inline-block shrink-0 overflow-hidden rounded-[3px] ${size} ${className}`}
        aria-label={`Wappen ${resolved}`}
      >
        {WAPPEN_SVG[resolved]}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {codes.map((c) =>
        WAPPEN_SVG[c] ? (
          <span
            key={c}
            data-testid={`canton-wappen-${c}`}
            className={`inline-block shrink-0 overflow-hidden rounded-[3px] ${size}`}
            aria-label={`Wappen ${c}`}
          >
            {WAPPEN_SVG[c]}
          </span>
        ) : null,
      )}
    </span>
  );
}
