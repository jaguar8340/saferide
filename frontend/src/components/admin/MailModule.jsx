/**
 * MailModule — wraps two sub-tabs:
 *  1. "Posteingang" – full webmail client (folders / list / read / reply / compose)
 *  2. "Einstellungen" – IMAP config + existing SMTP settings
 */
import { useState } from "react";
import { Inbox, Settings, Mail } from "lucide-react";
import Webmail from "@/components/admin/Webmail";
import EmailSettingsManager from "@/components/admin/EmailSettingsManager";

const SUB_TABS = [
  { id: "inbox", icon: Inbox, label: "Posteingang" },
  { id: "settings", icon: Settings, label: "E-Mail Einstellungen" },
];

export default function MailModule() {
  const [tab, setTab] = useState("inbox");

  return (
    <div data-testid="mail-module">
      <div className="flex items-center gap-2 mb-5">
        <Mail size={16} className="text-[#ff5a36]" />
        <h1 className="font-display text-2xl tracking-tight">Mail</h1>
      </div>

      <div className="flex gap-1 mb-5 border-b border-[#e7e5e4] overflow-x-auto">
        {SUB_TABS.map((s) => {
          const Icon = s.icon;
          const active = tab === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              data-testid={`mail-subtab-${s.id}`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-[#ff5a36] text-[#0f172a]"
                  : "border-transparent text-[#78716c] hover:text-[#0f172a]"
              }`}
            >
              <Icon size={13} />
              {s.label}
            </button>
          );
        })}
      </div>

      {tab === "inbox" && <Webmail />}
      {tab === "settings" && <EmailSettingsManager />}
    </div>
  );
}
