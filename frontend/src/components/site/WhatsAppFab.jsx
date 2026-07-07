import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Phone } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useEdit } from "@/contexts/EditContext";

const SUGGESTIONS_DE = [
  { id: "s1", text: "Ich möchte eine Lektion buchen." },
  { id: "s2", text: "Wann ist der nächste VKU-Kurs?" },
  { id: "s3", text: "Wie viele Lektionen brauche ich bis zur Prüfung?" },
];
const SUGGESTIONS_EN = [
  { id: "s1", text: "I'd like to book a lesson." },
  { id: "s2", text: "When is the next VKU course?" },
  { id: "s3", text: "How many lessons until my exam?" },
];

/**
 * Floating WhatsApp action button (bottom-right) with an expandable
 * pre-chat panel. Clicking suggestions or sending a custom message opens
 * WhatsApp Web/App with the message pre-filled to the configured phone
 * number (sourced from content.contact.phone).
 *
 * Hidden on admin routes so it never overlaps the dashboard chrome.
 */
export default function WhatsAppFab() {
  const { lang } = useLang();
  const { content } = useEdit();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/preview/")) return null;
  const rawPhone = content?.contact?.phone || content?.contact?.whatsapp;
  if (!rawPhone) return null;

  // International phone for wa.me must be digits only, no leading + or spaces.
  const digits = rawPhone.replace(/[^\d]/g, "");

  const suggestions = lang === "de" ? SUGGESTIONS_DE : SUGGESTIONS_EN;

  const buildUrl = (message) =>
    `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  const sendCustom = () => {
    const msg = text.trim() || (lang === "de" ? "Hallo Nadine," : "Hi Nadine,");
    window.open(buildUrl(msg), "_blank", "noopener,noreferrer");
    setText("");
    setOpen(false);
  };

  const sendSuggestion = (s) => {
    window.open(buildUrl(s.text), "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div
      data-testid="whatsapp-fab"
      className="fixed bottom-5 right-5 z-[60] md:bottom-7 md:right-7"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            data-testid="whatsapp-panel"
            className="absolute bottom-16 right-0 w-[320px] sm:w-[360px] bg-white rounded-3xl shadow-2xl shadow-black/20 border border-[#e2e8f0] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#075e54] text-white p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <MessageCircle size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg leading-tight tracking-tight truncate">
                    Nadine · Safe Ride
                  </div>
                  <div className="text-[11px] text-white/70 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                    {lang === "de" ? "Antwortet meist <1 Std." : "Usually replies in <1h"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                data-testid="whatsapp-close"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors shrink-0"
                aria-label="Chat schliessen"
              >
                <X size={14} />
              </button>
            </div>

            {/* Greeting + suggestions */}
            <div className="p-4 bg-[#ece5dd]/40 max-h-[260px] overflow-y-auto">
              <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm text-sm text-[#0f172a] leading-relaxed font-medium max-w-[85%]">
                {lang === "de"
                  ? "Hi! 👋 Schreib mir, wann es dir passt – ich melde mich so schnell wie möglich."
                  : "Hi! 👋 Send me a message anytime — I'll get back to you ASAP."}
              </div>
              <div className="mt-4 space-y-2">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-1">
                  {lang === "de" ? "Schnellnachrichten" : "Quick messages"}
                </div>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => sendSuggestion(s)}
                    data-testid={`whatsapp-suggestion-${s.id}`}
                    className="w-full text-left bg-white border border-[#e2e8f0] hover:border-[#25d366] hover:bg-[#25d366]/5 transition-colors rounded-2xl px-3 py-2.5 text-sm font-medium text-[#0f172a]"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendCustom();
              }}
              className="p-3 bg-white border-t border-[#e2e8f0] flex items-center gap-2"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="whatsapp-input"
                placeholder={lang === "de" ? "Eigene Nachricht schreiben…" : "Type your own message…"}
                className="flex-1 bg-[#fbf9f6] border border-[#e2e8f0] rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#25d366]"
              />
              <button
                type="submit"
                data-testid="whatsapp-send"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25d366] text-white hover:bg-[#1eb558] transition-colors shrink-0"
                aria-label="Senden"
              >
                <Send size={14} />
              </button>
            </form>

            {/* Phone fallback */}
            <a
              href={`tel:${digits}`}
              data-testid="whatsapp-tel-fallback"
              className="block bg-[#0f172a] text-white text-center text-xs font-semibold tracking-widest uppercase py-3 hover:bg-[#1e293b] transition-colors"
            >
              <Phone size={11} className="inline mr-1.5 -mt-0.5" />
              {lang === "de" ? "Lieber anrufen?" : "Prefer to call?"} · {rawPhone}
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The FAB itself */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="whatsapp-fab-button"
        whileTap={{ scale: 0.94 }}
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#25d366] text-white shadow-2xl shadow-[#25d366]/40 hover:shadow-[#25d366]/60 hover:scale-105 transition-all flex items-center justify-center"
        aria-label={open ? "WhatsApp-Chat schliessen" : "WhatsApp-Chat öffnen"}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <WhatsAppIcon className="w-7 h-7 md:w-8 md:h-8" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span
            className="absolute -top-1 -right-1 inline-block w-3 h-3 rounded-full bg-[#0f172a] ring-2 ring-[#fbf9f6] animate-pulse-accent"
            aria-hidden="true"
          />
        )}
      </motion.button>
    </div>
  );
}

// Inline WhatsApp glyph (white on transparent) — keeps brand recognisability
// without pulling in an extra icon library.
function WhatsAppIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16 2C8.27 2 2 8.27 2 16c0 2.77.81 5.36 2.2 7.55L2 30l6.66-2.16A13.94 13.94 0 0 0 16 30c7.73 0 14-6.27 14-14S23.73 2 16 2zm0 25.3c-2.32 0-4.55-.66-6.46-1.92l-.46-.3-3.96 1.28 1.3-3.86-.3-.48A11.32 11.32 0 1 1 27.3 16 11.3 11.3 0 0 1 16 27.3zM22.36 19c-.34-.17-2.04-1-2.36-1.12-.32-.12-.55-.17-.78.17-.23.34-.9 1.12-1.1 1.35-.2.23-.4.26-.74.09-2.04-1.02-3.37-1.82-4.71-4.13-.36-.62.36-.58 1.02-1.92.12-.23.06-.43-.03-.6-.09-.17-.78-1.87-1.07-2.56-.28-.67-.57-.58-.78-.59l-.66-.01a1.27 1.27 0 0 0-.92.43c-.32.34-1.2 1.17-1.2 2.86s1.23 3.32 1.41 3.55c.17.23 2.43 3.7 5.88 5.19 2.19.95 3.05 1.03 4.14.87.67-.1 2.04-.83 2.33-1.64.29-.81.29-1.5.2-1.65-.09-.14-.32-.23-.66-.4z" />
    </svg>
  );
}
