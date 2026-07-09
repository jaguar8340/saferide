/**
 * UsersManager – admin-only user list with create / patch / delete.
 * Sits under the "Benutzer" tab in the CMS.
 *
 * Backend: /api/users (GET, POST, PATCH /{id}, DELETE /{id}).
 */
import { useEffect, useState } from "react";
import {
  Loader2,
  UserPlus,
  Trash2,
  Info,
  KeyRound,
  Check,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const emptyDraft = { email: "", name: "", password: "", role: "admin" };

export default function UsersManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [pwById, setPwById] = useState({});
  const [savingPwId, setSavingPwId] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/users");
      setUsers(r.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!draft.email || !draft.password) {
      toast.error("E-Mail und Passwort sind Pflicht");
      return;
    }
    if (draft.password.length < 6) {
      toast.error("Passwort mindestens 6 Zeichen");
      return;
    }
    setCreating(true);
    try {
      await api.post("/users", draft);
      toast.success("Benutzer angelegt");
      setDraft(emptyDraft);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const patchField = async (id, field, value) => {
    try {
      await api.patch(`/users/${id}`, { [field]: value });
      toast.success("Gespeichert");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const savePassword = async (id) => {
    const pw = pwById[id] || "";
    if (pw.length < 6) {
      toast.error("Passwort mindestens 6 Zeichen");
      return;
    }
    setSavingPwId(id);
    try {
      await api.patch(`/users/${id}`, { password: pw });
      toast.success("Passwort aktualisiert");
      setPwById({ ...pwById, [id]: "" });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingPwId(null);
    }
  };

  const remove = async (u) => {
    if (u.id === currentUser?.id) {
      toast.error("Eigenen Account kann man nicht löschen");
      return;
    }
    if (!window.confirm(`Benutzer "${u.email}" wirklich löschen?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("Benutzer gelöscht");
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716c]">
        <Loader2 size={14} className="animate-spin" /> Lade Benutzer …
      </div>
    );
  }

  return (
    <div data-testid="users-manager" className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center">
          <Users size={18} />
        </div>
        <div>
          <h2 className="font-display text-3xl md:text-4xl leading-none tracking-tight">
            Benutzer
          </h2>
          <p className="text-xs text-[#78716c] mt-1">
            CMS-Benutzer verwalten. Alle Benutzer haben Admin-Rechte.
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-3 p-3 bg-[#fef9c3] border border-[#eab308] rounded-2xl">
        <Info size={16} className="text-[#a16207] shrink-0 mt-0.5" />
        <div className="text-xs text-[#854d0e] leading-relaxed">
          Jeder Benutzer kann sich unter <code className="font-mono">/admin</code> anmelden und
          alle Seiteninhalte bearbeiten. Der eigene Account und der letzte
          verbleibende Benutzer können nicht gelöscht werden.
        </div>
      </div>

      {/* Create form */}
      <div className="bg-white border border-[#e7e5e4] rounded-2xl p-5 mb-6">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#475569] mb-4">
          Neuen Benutzer anlegen
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Field label="Name" cols={2}>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="z. B. Nadine"
              data-testid="user-new-name"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </Field>
          <Field label="E-Mail" cols={2}>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="name@saferide.ch"
              data-testid="user-new-email"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </Field>
          <Field label="Passwort (min. 6 Zeichen)" cols={2}>
            <input
              type="text"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              placeholder="Sicheres Passwort"
              data-testid="user-new-password"
              className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
            />
          </Field>
          <div className="md:col-span-6 flex justify-end">
            <button
              type="button"
              onClick={create}
              disabled={creating}
              data-testid="user-create-button"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase bg-[#ff5a36] text-white px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
              Benutzer anlegen
            </button>
          </div>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {users.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <div
              key={u.id}
              data-testid={`user-row-${u.id}`}
              className="bg-white border border-[#e7e5e4] rounded-2xl p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                <div>
                  <label className="text-[9px] tracking-widest uppercase text-[#94a3b8] block">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue={u.name}
                    onBlur={(e) =>
                      e.target.value !== u.name && patchField(u.id, "name", e.target.value)
                    }
                    data-testid={`user-name-${u.id}`}
                    className="text-sm font-semibold text-[#0f172a] w-full border-0 bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                  />
                </div>
                <div>
                  <label className="text-[9px] tracking-widest uppercase text-[#94a3b8] block">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    defaultValue={u.email}
                    onBlur={(e) =>
                      e.target.value !== u.email && patchField(u.id, "email", e.target.value)
                    }
                    data-testid={`user-email-${u.id}`}
                    className="text-sm text-[#334155] w-full border-0 bg-transparent focus:outline-none focus:border-b focus:border-[#ff5a36]"
                  />
                </div>
                <div className="flex items-start gap-1 md:pt-3">
                  {isSelf && (
                    <span
                      data-testid={`user-self-${u.id}`}
                      className="text-[10px] tracking-widest uppercase font-semibold text-[#0f172a] bg-[#fbf9f6] border border-[#e2e8f0] px-3 py-1 rounded-full"
                    >
                      Du
                    </span>
                  )}
                  <button
                    onClick={() => remove(u)}
                    disabled={isSelf}
                    data-testid={`user-delete-${u.id}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[#a8a29e] hover:text-[#dc2626] hover:bg-[#fee2e2] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    title={isSelf ? "Eigener Account" : "Löschen"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px]">
                  <label className="text-[9px] tracking-widest uppercase text-[#94a3b8] block mb-1 flex items-center gap-1">
                    <KeyRound size={10} /> Neues Passwort setzen (min. 6 Zeichen)
                  </label>
                  <input
                    type="text"
                    value={pwById[u.id] || ""}
                    onChange={(e) => setPwById({ ...pwById, [u.id]: e.target.value })}
                    placeholder="Leer lassen = unverändert"
                    data-testid={`user-pw-${u.id}`}
                    className="w-full text-sm bg-[#fbf9f6] border border-[#e2e8f0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#ff5a36]"
                  />
                </div>
                <button
                  onClick={() => savePassword(u.id)}
                  disabled={savingPwId === u.id || !(pwById[u.id] || "").length}
                  data-testid={`user-pw-save-${u.id}`}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase bg-[#0f172a] text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-30"
                >
                  {savingPwId === u.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Check size={11} strokeWidth={3} />
                  )}
                  Passwort setzen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, cols, children }) {
  return (
    <div className={cols === 2 ? "md:col-span-2" : ""}>
      <label className="text-[10px] tracking-widest uppercase text-[#475569] font-semibold block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
