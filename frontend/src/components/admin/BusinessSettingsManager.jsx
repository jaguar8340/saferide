/**
 * Fahrschul-Settings — global business identity used on every generated
 * invoice PDF. Auto-loaded via GET /api/settings/business, autosaved
 * via PATCH on blur so Nadine can nachtragen ohne "Speichern"-Button.
 */
import { useEffect, useState } from "react";
import { Loader2, Building2, Info } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const SECTIONS = [
  {
    title: "Firmenname & Adresse",
    fields: [
      { key: "business_name",  label: "Firmenname", cols: 2 },
      { key: "address_line1",  label: "Strasse" },
      { key: "address_line2",  label: "Zusatz (optional)" },
      { key: "zip",            label: "PLZ" },
      { key: "city",           label: "Ort" },
      { key: "country",        label: "Land" },
    ],
  },
  {
    title: "Kontakt",
    fields: [
      { key: "phone",   label: "Telefon" },
      { key: "email",   label: "E-Mail",  type: "email" },
      { key: "website", label: "Website" },
    ],
  },
  {
    title: "Bank / IBAN",
    fields: [
      { key: "iban",           label: "IBAN", cols: 2 },
      { key: "bank",           label: "Bank" },
      { key: "bic",            label: "BIC / SWIFT" },
      { key: "account_holder", label: "Kontoinhaber", cols: 2 },
    ],
  },
  {
    title: "MWST & Rechnungs-Einstellungen",
    fields: [
      { key: "mwst_number", label: "MWST-Nummer (leer = nicht MWST-pflichtig)", cols: 2 },
      { key: "mwst_rate",   label: "MWST-Satz in %", type: "number", step: "0.1" },
      { key: "invoice_prefix", label: "Rechnungs-Präfix (z. B. RE)" },
      { key: "invoice_footer_note", label: "Fusszeile / Zahlungshinweis", cols: 2, textarea: true },
    ],
  },
];

export default function BusinessSettingsManager() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get("/settings/business");
        if (!cancelled) setData(r.data);
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (key, value) => {
    if (!data) return;
    const original = data[key];
    let normalized = value;
    if (key === "mwst_rate") normalized = parseFloat(value) || 0;
    if (String(normalized) === String(original)) return;
    setSavingKey(key);
    try {
      const r = await api.patch("/settings/business", { [key]: normalized });
      setData(r.data);
      toast.success("Gespeichert");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Fahrschul-Einstellungen …
      </div>
    );
  }

  return (
    <div data-testid="business-settings" className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <Building2 size={18} />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Fahrschul-Daten
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            Diese Daten erscheinen auf jeder generierten Rechnung.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#fef9c3] border border-[#eab308] rounded-2xl">
        <Info size={16} className="text-[#a16207] shrink-0 mt-0.5" />
        <div className="text-xs text-[#854d0e] leading-relaxed">
          Änderungen werden automatisch gespeichert, sobald du das Feld verlässt.
          IBAN / Bank / BIC / MWST-Nummer kannst du jederzeit ergänzen.
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white border border-[#e7e5e4] rounded-2xl p-5">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
              {section.title}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((f) => (
                <div key={f.key} className={f.cols === 2 ? "md:col-span-2" : ""}>
                  <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                    {f.label}
                    {savingKey === f.key && (
                      <Loader2 size={10} className="inline-block ml-2 animate-spin text-[#ff5a36]" />
                    )}
                  </label>
                  {f.textarea ? (
                    <textarea
                      rows={3}
                      defaultValue={data[f.key] ?? ""}
                      onBlur={(e) => save(f.key, e.target.value)}
                      data-testid={`bs-${f.key}`}
                      className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36] resize-none"
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      step={f.step}
                      defaultValue={data[f.key] ?? ""}
                      onBlur={(e) => save(f.key, e.target.value)}
                      data-testid={`bs-${f.key}`}
                      className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
