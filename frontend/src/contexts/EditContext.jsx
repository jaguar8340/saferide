import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EditContext = createContext(null);

// Helper: deeply set a value at a dot-path in an object (supports numeric indices).
function setNestedPath(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj || {}));
  const parts = path.split(".");
  let cur = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
    if (cur[key] === undefined || cur[key] === null) {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[key];
  }
  const last = parts[parts.length - 1];
  const lastKey = /^\d+$/.test(last) ? parseInt(last, 10) : last;
  cur[lastKey] = value;
  return next;
}

export function EditProvider({ children }) {
  const { user } = useAuth();
  const [content, setContent] = useState(null);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [saving, setSaving] = useState(0);
  const [editMode, setEditMode] = useState(true);
  const pending = useRef({}); // path -> value batched
  const flushTimer = useRef(null);

  const reloadContent = useCallback(async () => {
    const r = await api.get("/content");
    setContent(r.data);
  }, []);

  const reloadTestimonials = useCallback(async () => {
    const r = await api.get("/testimonials");
    setTestimonials(r.data);
  }, []);

  const reloadGallery = useCallback(async () => {
    const r = await api.get("/gallery");
    setGallery(r.data);
  }, []);

  useEffect(() => {
    Promise.all([reloadContent(), reloadTestimonials(), reloadGallery()]);
  }, [reloadContent, reloadTestimonials, reloadGallery]);

  const flush = useCallback(async () => {
    const updates = { ...pending.current };
    pending.current = {};
    if (Object.keys(updates).length === 0) return;
    setSaving((s) => s + 1);
    try {
      const r = await api.patch("/content", updates);
      setContent(r.data);
    } catch (err) {
      toast.error(formatApiError(err, "Speichern fehlgeschlagen"));
      // re-fetch so UI matches server
      await reloadContent();
    } finally {
      setSaving((s) => Math.max(0, s - 1));
    }
  }, [reloadContent]);

  const updateField = useCallback(
    (path, value) => {
      // Optimistic update
      setContent((prev) => setNestedPath(prev, path, value));
      pending.current[path] = value;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  const value = useMemo(
    () => ({
      isAdmin: !!user,
      editMode: !!user && editMode,
      setEditMode,
      content,
      testimonials,
      gallery,
      saving: saving > 0,
      updateField,
      flush,
      reloadContent,
      reloadTestimonials,
      reloadGallery,
    }),
    [user, editMode, content, testimonials, gallery, saving, updateField, flush, reloadContent, reloadTestimonials, reloadGallery],
  );

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useEdit() {
  const ctx = useContext(EditContext);
  if (!ctx) throw new Error("useEdit must be used within EditProvider");
  return ctx;
}
