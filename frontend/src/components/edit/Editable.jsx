import { useEffect, useRef } from "react";
import { useEdit } from "@/contexts/EditContext";

/**
 * Inline-editable text. When admin is in edit mode, the rendered element
 * becomes contentEditable and saves on blur.
 *
 * Props:
 *  - path: dot-notation path into site content (e.g. "hero.title_de")
 *  - value: current value to display
 *  - as: tag name (default 'span')
 *  - className: passthrough
 *  - multiline: allow Enter for newline
 *  - placeholder: shown when value is empty in edit mode
 */
export default function Editable({
  path,
  value,
  as: Tag = "span",
  className = "",
  multiline = false,
  placeholder = "Klicken zum Bearbeiten",
  children,
  onUpdate,
  forceEditMode,
}) {
  const ctx = useEdit();
  const editMode = forceEditMode !== undefined ? forceEditMode : ctx.editMode;
  const updateFn = onUpdate || ctx.updateField;
  const ref = useRef(null);

  // Keep DOM in sync when the value changes from outside (e.g. server reload),
  // but NOT while the user is actively editing.
  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    const next = value ?? "";
    if (ref.current.innerText !== next) {
      ref.current.innerText = next;
    }
  }, [value]);

  if (!editMode) {
    return <Tag className={className}>{children ?? value}</Tag>;
  }

  const onBlur = () => {
    const next = ref.current?.innerText ?? "";
    if (next !== (value ?? "")) {
      updateFn(path, next);
    }
  };

  const onKeyDown = (e) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === "Escape") {
      if (ref.current) ref.current.innerText = value ?? "";
      ref.current?.blur();
    }
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      // Prevent the enclosing <a>/<button> from stealing the click:
      // when contentEditable is on, clicks must place the caret, NOT
      // trigger navigation or bubble to a parent link handler.
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      data-edit-path={path}
      data-placeholder={placeholder}
      className={`${className} editable-text`}
    >
      {value ?? ""}
    </Tag>
  );
}
