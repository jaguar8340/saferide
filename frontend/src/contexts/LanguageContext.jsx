import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);

const STORAGE_KEY = "saferide_lang";

const STRINGS = {
  de: {
    nav: {
      about: "Über mich",
      services: "Angebot",
      fleet: "Fahrzeuge",
      pricing: "Preise",
      gallery: "Galerie",
      reviews: "Bewertungen",
      contact: "Kontakt",
      ctaShort: "Anfragen",
      admin: "Admin",
    },
    hero: { scroll: "Scroll" },
    about: { trust: "Lizenzierte Fahrlehrerin" },
    services: { overline: "Was du bekommst", title: "Mehr als nur Fahrstunden" },
    fleet: { overline: "Unsere Flotte", title: "Premium am Steuer" },
    pricing: { ctaText: "Anfragen", everyDay: "Verfügbar 6 Tage / Woche" },
    gallery: { overline: "Galerie", title: "Eindrücke" },
    reviews: {
      overline: "Bewertungen",
      title: "Was Schüler:innen sagen",
      rating: "Bewertung auf Google",
    },
    contact: {
      overline: "Kontakt",
      title: "Bereit für deine erste Lektion?",
      sub: "Melde dich – ich freue mich auf dich.",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail",
      phone: "Telefonnummer",
      message: "Deine Nachricht",
      send: "Nachricht senden",
      sending: "Wird gesendet…",
      success: "Danke! Ich melde mich bei dir.",
      hours: "Erreichbarkeit",
      address: "Region",
    },
    footer: {
      rights: "Alle Rechte vorbehalten.",
      tagline: "Anders. Besser. Mutiger.",
      imprint: "Impressum",
      privacy: "Datenschutz",
    },
    admin: {
      title: "CMS Login",
      subtitle: "Verwalte deine Website-Inhalte",
      email: "E-Mail",
      password: "Passwort",
      login: "Einloggen",
      loggingIn: "Wird angemeldet…",
      logout: "Abmelden",
      tabs: {
        content: "Inhalte",
        testimonials: "Bewertungen",
        gallery: "Galerie",
        submissions: "Anfragen",
      },
      save: "Speichern",
      saved: "Gespeichert",
      saving: "Speichere…",
      add: "Hinzufügen",
      delete: "Löschen",
      edit: "Bearbeiten",
      cancel: "Abbrechen",
      noItems: "Noch keine Einträge.",
      upload: "Datei wählen",
      uploading: "Lade hoch…",
      uploaded: "Hochgeladen",
      dropHere: "Bild hierher ziehen oder klicken",
    },
  },
  en: {
    nav: {
      about: "About",
      services: "Services",
      fleet: "Fleet",
      pricing: "Pricing",
      gallery: "Gallery",
      reviews: "Reviews",
      contact: "Contact",
      ctaShort: "Get in touch",
      admin: "Admin",
    },
    hero: { scroll: "Scroll" },
    about: { trust: "Licensed driving instructor" },
    services: { overline: "What you get", title: "More than driving lessons" },
    fleet: { overline: "Our fleet", title: "Premium behind the wheel" },
    pricing: { ctaText: "Book now", everyDay: "Available 6 days / week" },
    gallery: { overline: "Gallery", title: "Impressions" },
    reviews: {
      overline: "Reviews",
      title: "What our students say",
      rating: "Rating on Google",
    },
    contact: {
      overline: "Contact",
      title: "Ready for your first lesson?",
      sub: "Get in touch – I'm looking forward to meeting you.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone number",
      message: "Your message",
      send: "Send message",
      sending: "Sending…",
      success: "Thanks! I'll get back to you soon.",
      hours: "Hours",
      address: "Region",
    },
    footer: {
      rights: "All rights reserved.",
      tagline: "Different. Better. Bolder.",
      imprint: "Imprint",
      privacy: "Privacy",
    },
    admin: {
      title: "CMS Login",
      subtitle: "Manage your website content",
      email: "Email",
      password: "Password",
      login: "Sign in",
      loggingIn: "Signing in…",
      logout: "Logout",
      tabs: {
        content: "Content",
        testimonials: "Reviews",
        gallery: "Gallery",
        submissions: "Inquiries",
      },
      save: "Save",
      saved: "Saved",
      saving: "Saving…",
      add: "Add",
      delete: "Delete",
      edit: "Edit",
      cancel: "Cancel",
      noItems: "No entries yet.",
      upload: "Choose file",
      uploading: "Uploading…",
      uploaded: "Uploaded",
      dropHere: "Drop image here or click",
    },
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "de";
    return localStorage.getItem(STORAGE_KEY) || "de";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: STRINGS[lang],
      pick: (de, en) => (lang === "de" ? de : en),
    }),
    [lang],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
