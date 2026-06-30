import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, FileText, Loader2 } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";

/**
 * Lists all CMS-managed sub-pages so the admin can find & edit them.
 * - Standard pages: Ablauf, VKU
 * - All 9 (or more) location landing pages: /fahrschule-<slug>
 */
export default function PagesManager() {
  const [locs, setLocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const r = await api.get("/locations");
      setLocs(r.data);
    } catch (err) {
      toast.error(formatApiError(err, "Standorte konnten nicht geladen werden"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div data-testid="pages-manager" className="space-y-8">
      <div>
        <h2 className="font-display text-2xl tracking-tight mb-1">Statische Seiten</h2>
        <p className="text-sm text-[#475569] mb-4">
          Klicke auf eine Seite, öffne sie und bearbeite Texte/Bilder direkt vor Ort (Wix-Modus).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            to="/ablauf"
            data-testid="pages-link-ablauf"
            className="group bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#fef3c7] text-[#0f172a]">
                  <FileText size={16} />
                </span>
                <div>
                  <div className="font-display text-lg">Ablauf zum Führerausweis</div>
                  <div className="text-xs text-[#475569] mt-0.5">/ablauf</div>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#475569] group-hover:text-[#ff5a36]" />
            </div>
          </Link>
          <Link
            to="/vku"
            data-testid="pages-link-vku"
            className="group bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#d1fae5] text-[#065f46]">
                  <FileText size={16} />
                </span>
                <div>
                  <div className="font-display text-lg">VKU-Unterricht</div>
                  <div className="text-xs text-[#475569] mt-0.5">/vku</div>
                </div>
              </div>
              <ArrowUpRight size={16} className="text-[#475569] group-hover:text-[#ff5a36]" />
            </div>
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Standort-Landingpages</h2>
            <p className="text-sm text-[#475569] mt-1">
              SEO-optimierte Unterseiten je Ort. Nicht im Hauptmenü sichtbar – direkt aufrufbar unter <code>/fahrschule-&lt;slug&gt;</code>.
            </p>
          </div>
          {loading && <Loader2 size={16} className="animate-spin text-[#94a3b8]" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {locs.map((loc) => (
            <Link
              key={loc.slug}
              to={`/fahrschule-${loc.slug}`}
              data-testid={`pages-link-loc-${loc.slug}`}
              className="group bg-white border border-[#e2e8f0] rounded-2xl p-5 hover:-translate-y-0.5 hover:border-[#ff5a36] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-[#ff5a36] text-white shrink-0">
                    <MapPin size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-lg truncate">Fahrschule {loc.name}</div>
                    <div className="text-xs text-[#475569] mt-0.5 truncate">
                      /fahrschule-{loc.slug} · {loc.canton}
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-[#475569] group-hover:text-[#ff5a36] shrink-0 mt-1" />
              </div>
            </Link>
          ))}
          {!loading && locs.length === 0 && (
            <div className="col-span-full text-sm text-[#475569] bg-white border border-[#e2e8f0] rounded-2xl p-5">
              Noch keine Standorte vorhanden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
