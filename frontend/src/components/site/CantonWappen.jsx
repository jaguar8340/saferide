/**
 * Small inline cantonal coats of arms for the four Swiss cantons Safe Ride
 * operates in. Uses the OFFICIAL Wikimedia Commons "matte" SVG artwork,
 * shipped locally under /wappen/{code}.svg.
 *
 * Detection: pass either a `code` ("ZH"|"SZ"|"SG"|"GR") or a free-text
 * `region` string (e.g. "Kanton Schwyz") and the component returns null
 * if no match is found.
 */

// Human-readable canton names (for accessibility labels + tooltips).
const CANTON_NAMES = {
  ZH: "Zürich",
  SZ: "Schwyz",
  SG: "St. Gallen",
  GR: "Graubünden",
};

// Local, official Wappen SVGs from Wikimedia Commons (public domain,
// downloaded once to /app/frontend/public/wappen/{code}.svg).
const WAPPEN_SRC = {
  ZH: "/wappen/ZH.svg",
  SZ: "/wappen/SZ.svg",
  SG: "/wappen/SG.svg",
  GR: "/wappen/GR.svg",
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

function Shield({ code, size, className }) {
  const src = WAPPEN_SRC[code];
  const name = CANTON_NAMES[code] || code;
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`Wappen Kanton ${name}`}
      title={`Kanton ${name}`}
      loading="lazy"
      decoding="async"
      data-testid={`canton-wappen-${code}`}
      className={`inline-block shrink-0 object-contain ${size} ${className}`}
    />
  );
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
    return <Shield code={codes[0]} size={size} className={className} />;
  }
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {codes.map((c) => (
        <Shield key={c} code={c} size={size} className="" />
      ))}
    </span>
  );
}
