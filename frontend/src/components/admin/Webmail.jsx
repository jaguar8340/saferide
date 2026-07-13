/**
 * Webmail — IMAP-backed inbox viewer with folder sidebar, message list,
 * message view + reply/compose modal.
 *
 * Requires IMAP config in Einstellungen (banner shown otherwise).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, RefreshCw, Inbox, Folder, PenSquare, Reply, ReplyAll,
  Trash2, ArrowLeft, Send, X, Search, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

export default function Webmail() {
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [openMsg, setOpenMsg] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [compose, setCompose] = useState(null);   // {mode: 'new'|'reply'|'reply-all', to, subject, body, replyTo}
  const [search, setSearch] = useState("");
  const [configError, setConfigError] = useState(null);

  const loadFolders = useCallback(async () => {
    try {
      const r = await api.get("/mail/folders");
      setFolders(r.data);
      setConfigError(null);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message;
      setConfigError(typeof detail === "string" ? detail : "Verbindung fehlgeschlagen");
    }
  }, []);

  const loadMessages = useCallback(async (folder, q = "") => {
    setLoadingList(true);
    try {
      const r = await api.get("/mail/messages", {
        params: { folder, limit: 50, search: q },
      });
      setMessages(r.data);
    } catch (e) {
      const detail = e?.response?.data?.detail || e.message;
      setConfigError(typeof detail === "string" ? detail : "Verbindung fehlgeschlagen");
    } finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadMessages(activeFolder, search); }, [activeFolder, loadMessages]);
  const searchTimer = useRef(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadMessages(activeFolder, search), 400);
  }, [search, activeFolder, loadMessages]);

  const openMessage = async (m) => {
    setLoadingMsg(true);
    try {
      const r = await api.get("/mail/message", { params: { folder: m.folder, uid: m.uid } });
      setOpenMsg(r.data);
      // Mark read
      if (m.unread) {
        try { await api.post("/mail/mark-read", { folder: m.folder, uid: m.uid, read: true }); } catch {}
        setMessages((prev) => prev.map((x) => x.uid === m.uid ? { ...x, unread: false } : x));
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoadingMsg(false); }
  };

  const deleteMessage = async (m) => {
    if (!window.confirm("Nachricht wirklich in den Papierkorb verschieben?")) return;
    try {
      await api.delete("/mail/message", { params: { folder: m.folder, uid: m.uid } });
      toast.success("Nachricht gelöscht");
      setOpenMsg(null);
      loadMessages(activeFolder, search);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const startReply = (allRecipients = false) => {
    if (!openMsg) return;
    setCompose({
      mode: allRecipients ? "reply-all" : "reply",
      to: openMsg.from_email,
      subject: openMsg.subject,
      body: "",
      replyTo: { folder: openMsg.folder, uid: openMsg.uid },
      replyAll: allRecipients,
    });
  };

  const startNew = () => {
    setCompose({ mode: "new", to: "", cc: "", subject: "", body: "" });
  };

  const sendCompose = async () => {
    try {
      if (compose.mode === "reply" || compose.mode === "reply-all") {
        await api.post("/mail/reply", {
          folder: compose.replyTo.folder,
          uid: compose.replyTo.uid,
          body: compose.body,
          reply_all: compose.replyAll,
        });
      } else {
        await api.post("/mail/send", {
          to: compose.to.split(",").map((x) => x.trim()).filter(Boolean),
          cc: (compose.cc || "").split(",").map((x) => x.trim()).filter(Boolean),
          subject: compose.subject,
          body: compose.body,
        });
      }
      toast.success("E-Mail gesendet");
      setCompose(null);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const sortedFolders = useMemo(() => {
    const priority = { INBOX: 0, "INBOX.Sent": 1, Sent: 1, Gesendet: 1, Drafts: 2, Trash: 9 };
    return [...folders].sort((a, b) => (priority[a.name] ?? 5) - (priority[b.name] ?? 5));
  }, [folders]);

  if (configError && folders.length === 0) {
    return (
      <div
        data-testid="webmail-config-error"
        className="bg-[#fff7ed] border border-[#fed7aa] rounded-2xl p-5 flex items-start gap-3"
      >
        <AlertCircle size={20} className="text-[#c2410c] mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-[#c2410c] mb-1">
            IMAP nicht verbunden
          </div>
          <p className="text-sm text-[#78716c] leading-relaxed">
            {configError}
          </p>
          <p className="text-sm text-[#78716c] leading-relaxed mt-2">
            Wechsle zu "E-Mail Einstellungen" und trage IMAP-Host, Port, Benutzer + Passwort ein.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_360px_1fr] gap-3 h-[calc(100vh-260px)] min-h-[500px]" data-testid="webmail">
      {/* Folders */}
      <aside className="bg-white border border-[#e7e5e4] rounded-2xl p-3 overflow-y-auto">
        <button
          type="button"
          onClick={startNew}
          data-testid="webmail-compose"
          className="w-full inline-flex items-center justify-center gap-1.5 bg-[#ff5a36] hover:bg-[#e64d2e] text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-xl mb-3"
        >
          <PenSquare size={13} /> Neue E-Mail
        </button>
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-1 px-2">
          Ordner
        </div>
        {sortedFolders.length === 0 && (
          <div className="text-xs text-[#a8a29e] p-2">
            <Loader2 size={12} className="inline animate-spin mr-1" /> lade…
          </div>
        )}
        {sortedFolders.map((f) => (
          <button
            key={f.name}
            onClick={() => { setActiveFolder(f.name); setOpenMsg(null); }}
            data-testid={`webmail-folder-${f.name}`}
            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              activeFolder === f.name
                ? "bg-[#fff7ed] text-[#c2410c] font-semibold"
                : "text-[#334155] hover:bg-[#fafaf9]"
            }`}
          >
            {f.name === "INBOX" ? <Inbox size={12} /> : <Folder size={12} />}
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </aside>

      {/* Message list */}
      <section className={`bg-white border border-[#e7e5e4] rounded-2xl flex flex-col ${openMsg ? "hidden lg:flex" : ""}`}>
        <div className="p-3 border-b border-[#f3f0eb] flex items-center gap-2">
          <Search size={13} className="text-[#94a3b8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="webmail-search"
            placeholder="Suchen …"
            className="flex-1 text-sm bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => loadMessages(activeFolder, search)}
            data-testid="webmail-refresh"
            className="text-[#78716c] hover:text-[#ff5a36]"
            title="Aktualisieren"
          >
            <RefreshCw size={13} className={loadingList ? "animate-spin" : ""} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-[#f3f0eb]">
          {loadingList && messages.length === 0 && (
            <li className="p-6 text-sm text-[#78716c] text-center">
              <Loader2 size={14} className="inline animate-spin mr-1" /> lade Nachrichten …
            </li>
          )}
          {!loadingList && messages.length === 0 && (
            <li className="p-6 text-sm text-[#78716c] text-center">Keine Nachrichten</li>
          )}
          {messages.map((m) => (
            <li key={`${m.folder}-${m.uid}`}>
              <button
                type="button"
                onClick={() => openMessage(m)}
                data-testid={`webmail-msg-${m.uid}`}
                className={`w-full text-left p-3 flex flex-col gap-0.5 hover:bg-[#fafaf9] ${
                  openMsg?.uid === m.uid ? "bg-[#fff7ed]" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {m.unread && <span className="w-2 h-2 rounded-full bg-[#ff5a36] shrink-0" />}
                  <span className={`text-sm truncate ${m.unread ? "font-semibold text-[#0f172a]" : "text-[#334155]"}`}>
                    {m.from_name || m.from_email || "—"}
                  </span>
                  <span className="ml-auto text-[10px] text-[#94a3b8] shrink-0">
                    {formatDate(m.date)}
                  </span>
                </div>
                <div className={`text-xs truncate ${m.unread ? "font-semibold text-[#0f172a]" : "text-[#475569]"}`}>
                  {m.subject || "(kein Betreff)"}
                </div>
                {m.preview && (
                  <div className="text-[11px] text-[#78716c] truncate">{m.preview}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Message view */}
      <section className={`bg-white border border-[#e7e5e4] rounded-2xl flex flex-col overflow-hidden ${openMsg ? "" : "hidden lg:flex"}`} data-testid="webmail-viewer">
        {loadingMsg && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#78716c]">
            <Loader2 size={16} className="animate-spin mr-2" /> lade …
          </div>
        )}
        {!loadingMsg && !openMsg && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#a8a29e]">
            Nachricht auswählen
          </div>
        )}
        {!loadingMsg && openMsg && (
          <>
            <header className="p-4 border-b border-[#f3f0eb]">
              <div className="flex items-start gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setOpenMsg(null)}
                  className="lg:hidden text-[#78716c]"
                  data-testid="webmail-close"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-[#0f172a] leading-tight truncate">
                    {openMsg.subject || "(kein Betreff)"}
                  </div>
                  <div className="text-xs text-[#475569] mt-1">
                    Von: <span className="font-semibold">{openMsg.from_name || openMsg.from_email}</span>
                    {openMsg.from_name && <> &lt;{openMsg.from_email}&gt;</>}
                  </div>
                  <div className="text-xs text-[#78716c]">
                    An: {openMsg.to} · {formatDate(openMsg.date)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => startReply(false)}
                  data-testid="webmail-reply"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-3 py-1.5 rounded-full"
                >
                  <Reply size={11} /> Antworten
                </button>
                <button
                  type="button"
                  onClick={() => startReply(true)}
                  data-testid="webmail-reply-all"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-white border border-[#e7e5e4] text-[#334155] px-3 py-1.5 rounded-full hover:border-[#ff5a36]"
                >
                  <ReplyAll size={11} /> Allen antworten
                </button>
                <button
                  type="button"
                  onClick={() => deleteMessage(openMsg)}
                  data-testid="webmail-delete"
                  className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase bg-white border border-[#e7e5e4] text-[#dc2626] px-3 py-1.5 rounded-full hover:border-[#dc2626]"
                >
                  <Trash2 size={11} /> Löschen
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {openMsg.html ? (
                <div
                  className="prose prose-sm max-w-none text-[#334155]"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(openMsg.html) }}
                />
              ) : (
                <pre className="text-sm whitespace-pre-wrap font-sans text-[#334155] leading-relaxed">
                  {openMsg.text}
                </pre>
              )}
              {openMsg.attachments?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#f3f0eb]">
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] mb-2">
                    Anhänge ({openMsg.attachments.length})
                  </div>
                  <ul className="space-y-1">
                    {openMsg.attachments.map((a, i) => (
                      <li key={i} className="text-xs text-[#475569]">
                        📎 {a.filename} <span className="text-[#a8a29e]">({Math.round(a.size / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {compose && (
        <ComposeModal
          state={compose}
          setState={setCompose}
          onCancel={() => setCompose(null)}
          onSend={sendCompose}
        />
      )}
    </div>
  );
}


function ComposeModal({ state, setState, onCancel, onSend }) {
  const isReply = state.mode !== "new";
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-6" data-testid="webmail-compose-modal">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92dvh]">
        <div className="flex items-center gap-2 p-4 border-b border-[#f3f0eb]">
          <PenSquare size={14} className="text-[#ff5a36]" />
          <div className="font-display text-lg">
            {state.mode === "new" ? "Neue E-Mail" : state.mode === "reply-all" ? "Allen antworten" : "Antworten"}
          </div>
          <button onClick={onCancel} className="ml-auto text-[#78716c]" data-testid="webmail-compose-close">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {!isReply && (
            <>
              <input
                type="text"
                placeholder="An … (getrennt mit Komma)"
                value={state.to}
                onChange={(e) => setState({ ...state, to: e.target.value })}
                data-testid="webmail-compose-to"
                className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ff5a36]"
              />
              <input
                type="text"
                placeholder="Cc … (optional)"
                value={state.cc || ""}
                onChange={(e) => setState({ ...state, cc: e.target.value })}
                data-testid="webmail-compose-cc"
                className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ff5a36]"
              />
              <input
                type="text"
                placeholder="Betreff …"
                value={state.subject}
                onChange={(e) => setState({ ...state, subject: e.target.value })}
                data-testid="webmail-compose-subject"
                className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ff5a36]"
              />
            </>
          )}
          {isReply && (
            <div className="text-xs text-[#78716c] bg-[#fafaf9] rounded-lg p-2">
              An: <span className="font-mono">{state.to}</span> · Betreff:{" "}
              <span className="font-semibold">
                {state.subject.toLowerCase().startsWith("re:") ? state.subject : `Re: ${state.subject}`}
              </span>
            </div>
          )}
          <textarea
            rows={12}
            placeholder="Nachricht …"
            value={state.body}
            onChange={(e) => setState({ ...state, body: e.target.value })}
            data-testid="webmail-compose-body"
            className="w-full bg-[#fafaf9] border border-[#e7e5e4] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#ff5a36] resize-y min-h-[220px]"
          />
        </div>
        <div className="p-4 border-t border-[#f3f0eb] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs font-semibold tracking-widest uppercase text-[#475569] px-4 py-2 rounded-full hover:bg-[#fafaf9]"
          >
            Abbrechen
          </button>
          <button
            onClick={onSend}
            data-testid="webmail-compose-send"
            className="inline-flex items-center gap-1.5 bg-[#ff5a36] hover:bg-[#e64d2e] text-white text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full"
          >
            <Send size={12} /> Senden
          </button>
        </div>
      </div>
    </div>
  );
}


/** Extremely small HTML sanitiser — strips <script>, event handlers, javascript: hrefs. */
function sanitizeHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "")
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
}


function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
  } catch { return ""; }
}
