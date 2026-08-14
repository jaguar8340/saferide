/**
 * RichTextEditor — leichter contentEditable-Editor für die E-Mail-Vorlagen.
 *
 * Funktionen
 *  - Toolbar: Fett, Kursiv, Unterstrichen, Liste, Link, Zeile trennen
 *  - Placeholder-Chips: fügen `{name}`, `{datum}` etc. an der Cursor-Position ein
 *  - Emittiert bereinigten HTML-String via `onChange`
 *
 * Keine externe Abhängigkeit — verwendet `document.execCommand` (immer noch der
 * schnellste Weg für einfache Formatierungen in contentEditable-Divs, obwohl
 * "deprecated" in der Spec markiert; alle Browser unterstützen es weiterhin).
 */
import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, Link as LinkIcon, CornerDownLeft } from "lucide-react";

export default function RichTextEditor({
  value,
  onChange,
  onInsertPlaceholder,
  placeholders = [],
  testid,
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);

  // Nur beim ersten Mount setzen – danach nicht mehr, sonst springt der
  // Cursor bei jedem Tastenanschlag nach vorne.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!editorRef.current) return;
    onChange?.(editorRef.current.innerHTML);
  };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Nur speichern, wenn Selektion innerhalb unseres Editors ist
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreRange = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const exec = (cmd, arg) => {
    restoreRange();
    // eslint-disable-next-line no-restricted-syntax
    document.execCommand(cmd, false, arg);
    emit();
    saveRange();
  };

  const insertHtml = (html) => {
    restoreRange();
    // eslint-disable-next-line no-restricted-syntax
    document.execCommand("insertHTML", false, html);
    emit();
    saveRange();
  };

  const insertPlaceholder = (token) => {
    // Fokus zurückholen, sonst wird der Token ausserhalb des Editors eingefügt
    if (document.activeElement !== editorRef.current) {
      restoreRange();
    }
    if (savedRangeRef.current) {
      insertHtml(token);
    } else if (onInsertPlaceholder) {
      onInsertPlaceholder(token);
    }
  };

  const addLink = () => {
    const url = window.prompt("Link-Ziel (z. B. https://saferide.ch)", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  return (
    <div
      className="border border-[#e2e8f0] rounded-lg bg-white overflow-hidden"
      data-testid={testid}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-[#e2e8f0] bg-[#fafaf9] px-2 py-1.5 flex-wrap">
        <ToolBtn onClick={() => exec("bold")} title="Fett (Ctrl+B)">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Kursiv (Ctrl+I)">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Unterstrichen">
          <Underline size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Aufzählung">
          <List size={13} />
        </ToolBtn>
        <ToolBtn onClick={addLink} title="Link einfügen">
          <LinkIcon size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => insertHtml("<br>")} title="Zeilenumbruch">
          <CornerDownLeft size={13} />
        </ToolBtn>

        <span className="w-px h-4 bg-[#e2e8f0] mx-1" />

        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#78716c] pr-1">
          Platzhalter:
        </span>
        {placeholders.map((p) => (
          <button
            key={p.token}
            type="button"
            title={p.desc}
            onMouseDown={(e) => {
              // mousedown statt onClick, damit Editor-Selektion nicht verloren geht
              e.preventDefault();
              insertPlaceholder(p.token);
            }}
            data-testid={`richtext-placeholder-${p.token.replace(/[{}]/g, "")}`}
            className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#ff5a36] hover:text-[#ff5a36]"
          >
            {p.token}
          </button>
        ))}
      </div>

      {/* Editor surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={() => { emit(); saveRange(); }}
        onKeyUp={saveRange}
        onMouseUp={saveRange}
        data-testid={testid ? `${testid}-surface` : undefined}
        className="min-h-[220px] px-4 py-3 text-sm leading-relaxed focus:outline-none prose prose-sm max-w-none [&_ul]:pl-6 [&_ul]:list-disc [&_a]:text-[#ff5a36] [&_a]:underline"
        style={{ wordBreak: "break-word" }}
      />
    </div>
  );
}

function ToolBtn({ onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        // mousedown, damit die aktuelle Selektion im Editor erhalten bleibt
        e.preventDefault();
        onClick();
      }}
      className="w-7 h-7 flex items-center justify-center rounded text-[#475569] hover:bg-white hover:text-[#0f172a] transition-colors"
    >
      {children}
    </button>
  );
}
