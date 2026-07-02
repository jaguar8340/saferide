import { useEffect, useRef } from "react";

/**
 * Reusable renderer for pasted 3rd-party widget HTML (Elfsight Google Reviews,
 * Elfsight Instagram, Behold, SnapWidget, …). React's
 * `dangerouslySetInnerHTML` renders inline `<script>` tags as inert text, so
 * we re-execute them manually after mount.
 *
 * Reachable only from admin-editable content, so raw HTML injection is
 * intentional. Guards against double-injection: if the same HTML string is
 * passed twice, the effect returns early (many widget bootstrap scripts are
 * not idempotent and complain when re-initialized).
 */
export default function WidgetEmbed({ html, testid = "widget-embed", minHeight = 300, className = "" }) {
  const ref = useRef(null);
  const injectedHtmlRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    if (injectedHtmlRef.current === html) return; // already injected this exact HTML
    injectedHtmlRef.current = html;
    try {
      ref.current.innerHTML = html;
      ref.current.querySelectorAll("script").forEach((oldScript) => {
        const s = document.createElement("script");
        Array.from(oldScript.attributes).forEach((a) => s.setAttribute(a.name, a.value));
        s.text = oldScript.textContent;
        oldScript.parentNode.replaceChild(s, oldScript);
      });
    } catch (err) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(`${testid} bootstrap failed:`, err);
      }
    }
  }, [html, testid]);
  return (
    <div
      ref={ref}
      data-testid={testid}
      className={`widget-embed w-full ${className}`}
      style={{ minHeight: `${minHeight}px` }}
    />
  );
}
