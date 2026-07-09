/**
 * MasterDataTab — admin UI to manage categories, sub-items and routes
 * used by every student's Fahrkontrolle.
 *
 * Three columns side-by-side (stacked on mobile). Each has:
 *   • List of items (up/down arrows to reorder)
 *   • Inline "+ New" row to add
 *   • Delete button per row
 *   • Sub-items belong to a category — dropdown selects which category
 *     to view / add to.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Signpost,
  Route as RouteIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function MasterDataTab() {
  const [categories, setCategories] = useState([]);
  const [subitems, setSubitems] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [c, s, r] = await Promise.all([
        api.get("/fahrkontrolle/categories"),
        api.get("/fahrkontrolle/subitems"),
        api.get("/fahrkontrolle/routes"),
      ]);
      setCategories(c.data || []);
      setSubitems(s.data || []);
      setRoutes(r.data || []);
      if (!selectedCatId && (c.data || []).length > 0) {
        setSelectedCatId(c.data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories],
  );
  const currentSubs = useMemo(
    () =>
      subitems
        .filter((s) => s.category_id === selectedCatId)
        .sort((a, b) => a.order - b.order),
    [subitems, selectedCatId],
  );
  const routesSorted = useMemo(
    () => [...routes].sort((a, b) => a.order - b.order),
    [routes],
  );

  // ---------- Categories ----------
  const [newCat, setNewCat] = useState("");
  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const r = await api.post("/fahrkontrolle/categories", {
        title_de: newCat.trim(),
      });
      setCategories((c) => [...c, r.data]);
      setNewCat("");
      if (!selectedCatId) setSelectedCatId(r.data.id);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const removeCategory = async (cat) => {
    if (
      !confirm(
        `Kategorie "${cat.title_de}" und alle Unterpunkte löschen? Bestehende Bewertungen bleiben erhalten, werden aber nicht mehr angezeigt.`,
      )
    )
      return;
    try {
      await api.delete(`/fahrkontrolle/categories/${cat.id}`);
      setCategories((c) => c.filter((x) => x.id !== cat.id));
      setSubitems((s) => s.filter((x) => x.category_id !== cat.id));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const moveCategory = async (cat, dir) => {
    const others = [...cats];
    const idx = others.findIndex((c) => c.id === cat.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= others.length) return;
    const target = others[swap];
    try {
      await api.post("/fahrkontrolle/categories/reorder", {
        items: [
          { id: cat.id, order: target.order },
          { id: target.id, order: cat.order },
        ],
      });
      setCategories((c) =>
        c.map((x) =>
          x.id === cat.id
            ? { ...x, order: target.order }
            : x.id === target.id
              ? { ...x, order: cat.order }
              : x,
        ),
      );
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const renameCategory = async (cat, next) => {
    if (next === cat.title_de || !next.trim()) return;
    try {
      const r = await api.patch(`/fahrkontrolle/categories/${cat.id}`, {
        title_de: next.trim(),
        title_en: cat.title_en,
        order: cat.order,
      });
      setCategories((c) => c.map((x) => (x.id === cat.id ? r.data : x)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // ---------- Sub-items ----------
  const [newSub, setNewSub] = useState("");
  const addSubitem = async () => {
    if (!newSub.trim() || !selectedCatId) return;
    try {
      const r = await api.post("/fahrkontrolle/subitems", {
        category_id: selectedCatId,
        title_de: newSub.trim(),
      });
      setSubitems((s) => [...s, r.data]);
      setNewSub("");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const removeSubitem = async (item) => {
    if (!confirm(`Unterpunkt "${item.title_de}" löschen?`)) return;
    try {
      await api.delete(`/fahrkontrolle/subitems/${item.id}`);
      setSubitems((s) => s.filter((x) => x.id !== item.id));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const moveSubitem = async (item, dir) => {
    const idx = currentSubs.findIndex((s) => s.id === item.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= currentSubs.length) return;
    const target = currentSubs[swap];
    try {
      await api.post("/fahrkontrolle/subitems/reorder", {
        items: [
          { id: item.id, order: target.order },
          { id: target.id, order: item.order },
        ],
      });
      setSubitems((s) =>
        s.map((x) =>
          x.id === item.id
            ? { ...x, order: target.order }
            : x.id === target.id
              ? { ...x, order: item.order }
              : x,
        ),
      );
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const renameSubitem = async (item, next) => {
    if (next === item.title_de || !next.trim()) return;
    try {
      const r = await api.patch(`/fahrkontrolle/subitems/${item.id}`, {
        category_id: item.category_id,
        title_de: next.trim(),
        title_en: item.title_en,
        description_de: item.description_de,
        description_en: item.description_en,
        order: item.order,
      });
      setSubitems((s) => s.map((x) => (x.id === item.id ? r.data : x)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  // ---------- Routes ----------
  const [newRoute, setNewRoute] = useState("");
  const addRoute = async () => {
    if (!newRoute.trim()) return;
    try {
      const r = await api.post("/fahrkontrolle/routes", {
        name: newRoute.trim(),
      });
      setRoutes((c) => [...c, r.data]);
      setNewRoute("");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const removeRoute = async (route) => {
    if (!confirm(`Strecke "${route.name}" löschen?`)) return;
    try {
      await api.delete(`/fahrkontrolle/routes/${route.id}`);
      setRoutes((c) => c.filter((x) => x.id !== route.id));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const moveRoute = async (route, dir) => {
    const idx = routesSorted.findIndex((r) => r.id === route.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= routesSorted.length) return;
    const target = routesSorted[swap];
    try {
      await api.post("/fahrkontrolle/routes/reorder", {
        items: [
          { id: route.id, order: target.order },
          { id: target.id, order: route.order },
        ],
      });
      setRoutes((c) =>
        c.map((x) =>
          x.id === route.id
            ? { ...x, order: target.order }
            : x.id === target.id
              ? { ...x, order: route.order }
              : x,
        ),
      );
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  const renameRoute = async (route, next) => {
    if (next === route.name || !next.trim()) return;
    try {
      const r = await api.patch(`/fahrkontrolle/routes/${route.id}`, {
        name: next.trim(),
        order: route.order,
      });
      setRoutes((c) => c.map((x) => (x.id === route.id ? r.data : x)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#78716c]">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl" data-testid="master-data-tab">
      <div className="mb-7">
        <h2 className="font-display leading-[0.98] tracking-tight text-3xl md:text-4xl">
          Stammdaten Fahrkontrolle
        </h2>
        <p className="text-[#475569] text-sm mt-1 font-medium">
          Kategorien, Unterpunkte und Strecken pflegen — die Änderungen wirken
          auf alle Schüler.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Categories */}
        <MasterCard icon={ListOrdered} title="Kategorien" testid="master-categories">
          <div className="space-y-1.5">
            {cats.map((cat, i) => (
              <MasterRow
                key={cat.id}
                testid={`master-cat-${cat.id}`}
                text={cat.title_de}
                onRename={(v) => renameCategory(cat, v)}
                canUp={i > 0}
                canDown={i < cats.length - 1}
                onUp={() => moveCategory(cat, -1)}
                onDown={() => moveCategory(cat, 1)}
                onDelete={() => removeCategory(cat)}
                active={selectedCatId === cat.id}
                onSelect={() => setSelectedCatId(cat.id)}
              />
            ))}
          </div>
          <AddRow
            value={newCat}
            onChange={setNewCat}
            onAdd={addCategory}
            placeholder="Neue Kategorie …"
            testid="master-cat-add"
          />
        </MasterCard>

        {/* Sub-items */}
        <MasterCard icon={Signpost} title="Unterpunkte" testid="master-subitems">
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            data-testid="master-sub-cat-select"
            className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff5a36] mb-3"
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title_de}
              </option>
            ))}
          </select>
          <div className="space-y-1.5">
            {currentSubs.map((sub, i) => (
              <MasterRow
                key={sub.id}
                testid={`master-sub-${sub.id}`}
                text={sub.title_de}
                onRename={(v) => renameSubitem(sub, v)}
                canUp={i > 0}
                canDown={i < currentSubs.length - 1}
                onUp={() => moveSubitem(sub, -1)}
                onDown={() => moveSubitem(sub, 1)}
                onDelete={() => removeSubitem(sub)}
              />
            ))}
          </div>
          <AddRow
            value={newSub}
            onChange={setNewSub}
            onAdd={addSubitem}
            placeholder={
              selectedCatId
                ? "Neuer Unterpunkt …"
                : "Zuerst Kategorie wählen"
            }
            disabled={!selectedCatId}
            testid="master-sub-add"
          />
        </MasterCard>

        {/* Routes */}
        <MasterCard icon={RouteIcon} title="Strecken" testid="master-routes">
          <div className="space-y-1.5">
            {routesSorted.map((r, i) => (
              <MasterRow
                key={r.id}
                testid={`master-route-${r.id}`}
                text={r.name}
                onRename={(v) => renameRoute(r, v)}
                canUp={i > 0}
                canDown={i < routesSorted.length - 1}
                onUp={() => moveRoute(r, -1)}
                onDown={() => moveRoute(r, 1)}
                onDelete={() => removeRoute(r)}
              />
            ))}
          </div>
          <AddRow
            value={newRoute}
            onChange={setNewRoute}
            onAdd={addRoute}
            placeholder="Neue Strecke …"
            testid="master-route-add"
          />
        </MasterCard>
      </div>
    </div>
  );
}

function MasterCard({ icon: Icon, title, testid, children }) {
  return (
    <div
      data-testid={testid}
      className="bg-white border border-[#e7e5e4] rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[#ff5a36]" />
        <h3 className="font-display text-lg leading-none">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MasterRow({
  text,
  testid,
  onRename,
  canUp,
  canDown,
  onUp,
  onDown,
  onDelete,
  active,
  onSelect,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  return (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors ${
        active ? "bg-[#ff5a36]/10 text-[#0f172a]" : "hover:bg-[#fafaf9]"
      }`}
      data-testid={testid}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onRename(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
          }}
          className="flex-1 text-sm bg-transparent border-b border-[#e2e8f0] focus:border-[#ff5a36] focus:outline-none px-1 py-0.5"
        />
      ) : (
        <button
          onClick={() => {
            onSelect?.();
            setEditing(true);
            setDraft(text);
          }}
          className="flex-1 text-left text-sm truncate py-0.5"
          title="Klick zum Bearbeiten"
        >
          {text}
        </button>
      )}
      <button
        disabled={!canUp}
        onClick={onUp}
        className="w-6 h-6 flex items-center justify-center text-[#a8a29e] hover:text-[#0f172a] disabled:opacity-30"
        aria-label="Nach oben"
      >
        <ArrowUp size={12} />
      </button>
      <button
        disabled={!canDown}
        onClick={onDown}
        className="w-6 h-6 flex items-center justify-center text-[#a8a29e] hover:text-[#0f172a] disabled:opacity-30"
        aria-label="Nach unten"
      >
        <ArrowDown size={12} />
      </button>
      <button
        onClick={onDelete}
        className="w-6 h-6 flex items-center justify-center text-[#a8a29e] hover:text-[#dc2626]"
        aria-label="Löschen"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function AddRow({ value, onChange, onAdd, placeholder, disabled, testid }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
      className="mt-3 flex items-center gap-2"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        data-testid={`${testid}-input`}
        className="flex-1 text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff5a36] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        data-testid={`${testid}-submit`}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0f172a] text-white hover:opacity-90 disabled:opacity-40"
      >
        <Plus size={13} />
      </button>
    </form>
  );
}
