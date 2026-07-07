import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError, resolveUrl } from "@/lib/api";

/* ---------------- Blog Manager ---------------- */
export function BlogManager() {
  const [items, setItems] = useState(null);
  const load = async () => {
    try {
      const r = await api.get("/blog/admin");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (slug, status) => {
    try {
      const r = await api.patch(`/blog/${slug}`, { status });
      setItems((cur) => cur.map((p) => (p.slug === slug ? r.data : p)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const remove = async (slug) => {
    if (!confirm("Beitrag löschen?")) return;
    try {
      await api.delete(`/blog/${slug}`);
      setItems((cur) => cur.filter((p) => p.slug !== slug));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (items === null) return <Loading />;

  return (
    <Wrapper title="Blog" subtitle={`${items.length} Beiträge`}>
      {items.length === 0 ? (
        <EmptyState text="Noch keine Beiträge." />
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Row key={p.slug} testid={`admin-blog-row-${p.slug}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={p.status} />
                  <span className="text-[10px] tracking-widest uppercase text-[#94a3b8]">
                    {formatDate(p.published_at)}
                  </span>
                </div>
                <div className="font-display text-lg leading-tight tracking-tight truncate">
                  {p.title_de || p.slug}
                </div>
                <div className="text-xs text-[#475569] mt-1 line-clamp-1">{p.excerpt_de}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={p.status || "draft"}
                  onChange={(e) => setStatus(p.slug, e.target.value)}
                  data-testid={`admin-blog-status-${p.slug}`}
                  className="text-xs font-semibold uppercase tracking-widest bg-white border border-[#e2e8f0] rounded-full px-2.5 py-1.5 focus:outline-none focus:border-[#ff5a36]"
                >
                  <option value="draft">Entwurf</option>
                  <option value="scheduled">Geplant</option>
                  <option value="published">Veröffentlicht</option>
                </select>
                <Link
                  to={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-xs py-2 px-3"
                  data-testid={`admin-blog-open-${p.slug}`}
                >
                  <ExternalLink size={11} /> Öffnen
                </Link>
                <IconBtn label="Löschen" onClick={() => remove(p.slug)} danger>
                  <Trash2 size={13} />
                </IconBtn>
              </div>
            </Row>
          ))}
        </div>
      )}
    </Wrapper>
  );
}

/* ---------------- Bookings Manager ---------------- */
export function BookingsManager() {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/bookings");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    try {
      const r = await api.patch(`/bookings/${id}`, { status });
      setItems((cur) => cur.map((b) => (b.id === id ? r.data : b)));
      if (selected?.id === id) setSelected(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const remove = async (id) => {
    if (!confirm("Buchung löschen?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      setItems((cur) => cur.filter((b) => b.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (items === null) return <Loading />;
  const pending = items.filter((b) => b.status === "pending").length;

  return (
    <Wrapper title="Buchungen" subtitle={`${items.length} gesamt · ${pending} offen`}>
      {items.length === 0 ? (
        <EmptyState text="Noch keine Buchungen." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                data-testid={`admin-booking-row-${b.id}`}
                className={`w-full text-left p-4 border rounded-2xl transition-colors bg-white ${
                  selected?.id === b.id ? "border-[#0f172a]" : "border-[#e7e5e4] hover:border-[#94a3b8]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-display text-base tracking-tight">
                    {b.first_name} {b.last_name}
                  </div>
                  <BookingStatusPill status={b.status} />
                </div>
                <div className="text-[10px] tracking-widest uppercase text-[#94a3b8] mb-2">
                  {formatDate(b.created_at)}
                </div>
                <div className="text-xs text-[#475569] flex items-center gap-1">
                  <Calendar size={11} /> {b.preferred_date}
                  {b.preferred_time && ` · ${b.preferred_time}`}
                </div>
                <div className="text-xs text-[#0f172a] mt-1 font-semibold">
                  {b.package_snapshot?.title_de || b.package_slug}
                  {b.package_snapshot?.price_chf != null && ` · CHF ${b.package_snapshot.price_chf}`}
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-7">
            {selected ? (
              <div className="bg-white border border-[#e7e5e4] rounded-2xl p-6 md:p-7" data-testid="admin-booking-detail">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <div className="font-display text-3xl tracking-tight">
                      {selected.first_name} {selected.last_name}
                    </div>
                    <div className="text-xs tracking-widest uppercase text-[#94a3b8] mt-1">
                      {formatDate(selected.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selected.status || "pending"}
                      onChange={(e) => setStatus(selected.id, e.target.value)}
                      data-testid="admin-booking-status-select"
                      className="text-xs font-semibold tracking-widest uppercase bg-white border border-[#e2e8f0] rounded-full px-3 py-1.5 focus:outline-none focus:border-[#ff5a36]"
                    >
                      <option value="pending">Offen</option>
                      <option value="confirmed">Bestätigt</option>
                      <option value="cancelled">Storniert</option>
                    </select>
                    <IconBtn label="Löschen" onClick={() => remove(selected.id)} danger>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm border-t border-[#e7e5e4] pt-5 font-medium">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 hover:text-[#ff5a36]">
                    <Mail size={14} className="text-[#ff5a36]" /> {selected.email}
                  </a>
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 hover:text-[#ff5a36]">
                    <Phone size={14} className="text-[#ff5a36]" /> {selected.phone}
                  </a>
                  <div className="flex items-center gap-2 text-[#475569]">
                    <Calendar size={14} className="text-[#ff5a36]" /> {selected.preferred_date}
                    {selected.preferred_time && ` um ${selected.preferred_time}`}
                  </div>
                </div>

                <div className="mt-5 p-4 bg-[#fbf9f6] border border-[#e7e5e4] rounded-xl text-sm">
                  <div className="text-xs font-semibold tracking-widest uppercase text-[#475569] mb-2">
                    Paket
                  </div>
                  <div className="font-display text-lg tracking-tight">
                    {selected.package_snapshot?.title_de || selected.package_slug}
                  </div>
                  {selected.package_snapshot?.price_chf != null && (
                    <div className="text-sm text-[#475569] mt-0.5 font-medium">
                      CHF {selected.package_snapshot.price_chf} ·{" "}
                      {selected.package_snapshot.lesson_count} Lektion(en)
                    </div>
                  )}
                  {selected.location_slug && (
                    <div className="text-xs text-[#475569] mt-2">
                      Standort: <span className="font-semibold">{selected.location_slug}</span>
                    </div>
                  )}
                </div>

                {selected.message && (
                  <div className="mt-4 p-4 bg-[#fef3c7] border border-[#fde68a] rounded-xl text-sm leading-relaxed text-[#0f172a] whitespace-pre-wrap font-medium">
                    {selected.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#475569]">
                Buchung links auswählen
              </div>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  );
}

/* ---------------- Packages Manager ---------------- */
export function PackagesManager() {
  const [items, setItems] = useState(null);
  const [cantonFilter, setCantonFilter] = useState("all");
  const load = async () => {
    try {
      const r = await api.get("/packages/admin");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (slug, active) => {
    try {
      const r = await api.patch(`/packages/${slug}`, { active });
      setItems((cur) => cur.map((p) => (p.slug === slug ? r.data : p)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const toggleCanton = async (pkg, code) => {
    const current = pkg.cantons || [];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    try {
      const r = await api.patch(`/packages/${pkg.slug}`, { cantons: next });
      setItems((cur) => cur.map((p) => (p.slug === pkg.slug ? r.data : p)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const remove = async (slug) => {
    if (!confirm("Paket löschen?")) return;
    try {
      await api.delete(`/packages/${slug}`);
      setItems((cur) => cur.filter((p) => p.slug !== slug));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (items === null) return <Loading />;

  const CANTON_CODES = ["ZH", "SZ", "SG", "GR"];
  const filtered =
    cantonFilter === "all"
      ? items
      : items.filter(
          (p) =>
            !p.cantons || p.cantons.length === 0 || p.cantons.includes(cantonFilter),
        );

  // Group by canton set signature for a clearer overview
  const grouped = new Map();
  for (const p of filtered) {
    const key =
      !p.cantons || p.cantons.length === 0
        ? "Alle Kantone"
        : [...p.cantons].sort().join(" · ");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(p);
  }

  return (
    <Wrapper title="Pakete" subtitle={`${items.length} Pakete · zentrale Preisverwaltung`}>
      <p className="text-sm text-[#475569] mb-4">
        Zentrales Register — dieselben Pakete erscheinen auf Startseite, Buchung
        und Standort-Landingpages. Klicke unten auf eine Kanton-Pille, um sie
        für ein Paket ein-/auszuschalten. Bearbeite Preise & Texte direkt auf
        der{" "}
        <Link to="/buchung" className="text-[#ff5a36] font-semibold hover:underline" target="_blank">
          /buchung-Seite
        </Link>
        .
      </p>

      {/* Canton filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-widest uppercase text-[#94a3b8] font-semibold mr-1">
          Filter:
        </span>
        <button
          onClick={() => setCantonFilter("all")}
          data-testid="admin-package-filter-all"
          className={`text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full transition-all ${
            cantonFilter === "all" ? "bg-[#0f172a] text-white" : "bg-white border border-[#e2e8f0] text-[#475569]"
          }`}
        >
          Alle
        </button>
        {CANTON_CODES.map((c) => (
          <button
            key={c}
            onClick={() => setCantonFilter(c)}
            data-testid={`admin-package-filter-${c}`}
            className={`text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full transition-all ${
              cantonFilter === c ? "bg-[#0f172a] text-white" : "bg-white border border-[#e2e8f0] text-[#475569]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {[...grouped.entries()].map(([groupKey, groupItems]) => (
        <div key={groupKey} className="mb-6">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#ff5a36] font-semibold mb-2 pl-2">
            {groupKey}
          </div>
          <div className="space-y-3">
            {groupItems.map((p) => (
              <Row key={p.slug} testid={`admin-package-row-${p.slug}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        p.active === false ? "bg-[#94a3b8]" : "bg-[#16a34a]"
                      }`}
                    />
                    <span className="text-[10px] tracking-widest uppercase text-[#94a3b8]">
                      {p.service_type || "auto"}
                      {p.popular && " · beliebt"}
                    </span>
                  </div>
                  <div className="font-display text-lg tracking-tight">{p.title_de}</div>
                  <div className="text-xs text-[#475569] mt-1">
                    CHF {p.price_chf} · {p.lesson_count} Lektion(en) · {p.duration_minutes} min
                  </div>
                  {/* Canton pills – click to toggle */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {CANTON_CODES.map((c) => {
                      const included =
                        !p.cantons || p.cantons.length === 0 || p.cantons.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCanton(p, c)}
                          data-testid={`admin-package-canton-${p.slug}-${c}`}
                          className={`inline-flex items-center justify-center h-6 min-w-[36px] px-2 rounded-full text-[10px] font-bold tracking-wider transition-all ${
                            included
                              ? "bg-[#ff5a36] text-white"
                              : "bg-[#f1f5f9] text-[#94a3b8] hover:bg-[#e2e8f0]"
                          }`}
                          title={`Kanton ${c} ${included ? "entfernen" : "hinzufügen"}`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(p.slug, !p.active)}
                    data-testid={`admin-package-toggle-${p.slug}`}
                    className={`text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full ${
                      p.active === false
                        ? "bg-white border border-[#e2e8f0]"
                        : "bg-[#0f172a] text-white"
                    }`}
                  >
                    {p.active === false ? "Inaktiv" : "Aktiv"}
                  </button>
                  <IconBtn label="Löschen" onClick={() => remove(p.slug)} danger>
                    <Trash2 size={13} />
                  </IconBtn>
                </div>
              </Row>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <EmptyState text="Keine Pakete für diesen Filter." />}
    </Wrapper>
  );
}

/* ---------------- Certificates Manager ---------------- */
export function CertificatesManager() {
  const [items, setItems] = useState(null);
  const load = async () => {
    try {
      const r = await api.get("/certificates");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Diplom löschen?")) return;
    try {
      await api.delete(`/certificates/${id}`);
      setItems((cur) => cur.filter((c) => c.id !== id));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (items === null) return <Loading />;

  return (
    <Wrapper title="Diplome & Zertifikate" subtitle={`${items.length} hochgeladen`}>
      <p className="text-sm text-[#475569] mb-4">
        Lade neue Diplome direkt im{" "}
        <Link to="/" className="text-[#ff5a36] font-semibold hover:underline">
          „Über mich&quot;-Bereich
        </Link>{" "}
        hoch (Button → Diplom hinzufügen) — hier siehst du die Übersicht und kannst löschen.
      </p>
      {items.length === 0 ? (
        <EmptyState text="Noch keine Diplome." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              data-testid={`admin-cert-row-${c.id}`}
              className="bg-white border border-[#e7e5e4] rounded-2xl overflow-hidden"
            >
              <div className="aspect-[4/5] bg-[#fbf9f6]">
                {c.image_url && (
                  <img
                    src={resolveUrl(c.image_url)}
                    alt={c.title_de}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <div className="font-display text-sm leading-tight tracking-tight truncate">
                  {c.title_de}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] tracking-widest uppercase text-[#ff5a36] font-semibold">
                    {c.year || "—"}
                  </span>
                  <IconBtn label="Löschen" onClick={() => remove(c.id)} danger>
                    <Trash2 size={11} />
                  </IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  );
}

/* ---------------- Partners Manager ---------------- */
export function PartnersManager() {
  const [items, setItems] = useState(null);
  const load = async () => {
    try {
      const r = await api.get("/partners");
      setItems(r.data || []);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (slug) => {
    if (!confirm("Partner löschen?")) return;
    try {
      await api.delete(`/partners/${slug}`);
      setItems((cur) => cur.filter((p) => p.slug !== slug));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (items === null) return <Loading />;

  return (
    <Wrapper title="Partner" subtitle={`${items.length} Partner`}>
      <p className="text-sm text-[#475569] mb-4">
        Bearbeite die Partner direkt auf der{" "}
        <Link to="/partner" className="text-[#ff5a36] font-semibold hover:underline" target="_blank">
          /partner-Seite
        </Link>{" "}
        (Inline-Editor mit Logo-Upload).
      </p>
      {items.length === 0 ? (
        <EmptyState text="Noch keine Partner." />
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Row key={p.slug} testid={`admin-partner-row-${p.slug}`}>
              <div className="w-14 h-14 rounded-xl bg-[#fbf9f6] flex items-center justify-center overflow-hidden shrink-0">
                {p.logo_url ? (
                  <img
                    src={resolveUrl(p.logo_url)}
                    alt={p.name}
                    className="max-w-[80%] max-h-[80%] object-contain"
                  />
                ) : (
                  <span className="font-display text-xl text-[#0f172a]/30">
                    {p.name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-widest uppercase text-[#ff5a36] font-semibold mb-0.5">
                  {p.category_de}
                </div>
                <div className="font-display text-base tracking-tight">{p.name}</div>
                {p.website_url && (
                  <a
                    href={p.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#475569] hover:text-[#ff5a36] inline-flex items-center gap-1 mt-1"
                  >
                    {p.website_url} <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <IconBtn label="Löschen" onClick={() => remove(p.slug)} danger>
                <Trash2 size={13} />
              </IconBtn>
            </Row>
          ))}
        </div>
      )}
    </Wrapper>
  );
}

/* ---------------- Shared UI ---------------- */
function Wrapper({ title, subtitle, children }) {
  return (
    <div className="max-w-6xl">
      <div className="mb-7">
        <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">{title}</h2>
        {subtitle && <p className="text-[#475569] text-sm mt-1 font-medium">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Row({ children, testid }) {
  return (
    <div
      data-testid={testid}
      className="flex items-center gap-3 bg-white border border-[#e7e5e4] rounded-2xl p-4"
    >
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
        danger
          ? "text-[#475569] hover:text-[#ff5a36] hover:bg-[#fef2f2]"
          : "text-[#475569] hover:text-[#0f172a] hover:bg-[#fbf9f6]"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }) {
  const map = {
    published: { bg: "bg-[#d1fae5] text-[#065f46]", label: "Veröffentlicht" },
    scheduled: { bg: "bg-[#dbeafe] text-[#1d4ed8]", label: "Geplant" },
    draft: { bg: "bg-[#fef3c7] text-[#92400e]", label: "Entwurf" },
  };
  const v = map[status] || map.draft;
  return (
    <span className={`text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${v.bg}`}>
      {v.label}
    </span>
  );
}

function BookingStatusPill({ status }) {
  const map = {
    pending: { Icon: ClockIcon, bg: "bg-[#fef3c7] text-[#92400e]", label: "Offen" },
    confirmed: { Icon: CheckCircle2, bg: "bg-[#d1fae5] text-[#065f46]", label: "Bestätigt" },
    cancelled: { Icon: XCircle, bg: "bg-[#fee2e2] text-[#991b1b]", label: "Storniert" },
  };
  const v = map[status] || map.pending;
  const Icon = v.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 ${v.bg}`}
    >
      <Icon size={10} /> {v.label}
    </span>
  );
}

function Loading() {
  return (
    <div className="py-12 text-center text-xs font-semibold tracking-widest uppercase text-[#94a3b8]">
      <Loader2 size={16} className="inline-block animate-spin mr-2" /> Lade …
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-2xl p-10 text-center text-sm text-[#475569] font-medium">
      {text}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}
