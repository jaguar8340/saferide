import Editable from "@/components/edit/Editable";
import { useEdit } from "@/contexts/EditContext";

/**
 * Section heading that preserves the signature "last word in italic-serif-orange" design
 * in view mode AND becomes a single inline-editable element in admin edit mode.
 *
 * Props:
 *  - path: dot-notation content path for the editable string
 *  - value: full title string
 *  - className: extra classes on the outer h2
 *  - style: extra inline style on the outer h2
 */
export default function SectionTitle({ path, value, className = "", style }) {
  const { editMode } = useEdit();
  const text = value || "";

  if (editMode) {
    return (
      <Editable
        path={path}
        value={text}
        as="h2"
        className={`font-display leading-[0.98] tracking-tight block ${className}`}
        style={style}
      />
    );
  }

  const words = text.split(" ");
  return (
    <h2 className={`font-display leading-[0.98] tracking-tight ${className}`} style={style}>
      {words.map((w, i) =>
        i === words.length - 1 ? (
          <span key={i} className="font-serif-i text-[#ff5a36] font-normal">
            {w}
          </span>
        ) : (
          <span key={i}>{w} </span>
        ),
      )}
    </h2>
  );
}
