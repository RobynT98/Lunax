import { create } from "zustand";
import { getSettings, putSettings, type Settings } from "@/db/schema";

/**
 * ThemeStore
 * - Håller tema + typografi + tillgänglighet i minne
 * - Läser initialt från IndexedDB (Settings)
 * - Synkar ändringar till IndexedDB
 * - Sätter body-klassen (theme-*)
 */

type ThemeState = {
  // state
  theme: Settings["theme"];          // "dark" | "parchment" | ...
  fontBody: string;
  fontHeading: string;
  highContrast: boolean;
  reduceMotion: boolean;

  // status
  initialized: boolean;

  // actions
  initFromDB: () => Promise<void>;
  setTheme: (t: Settings["theme"]) => Promise<void>;
  setFontBody: (font: string) => Promise<void>;
  setFontHeading: (font: string) => Promise<void>;
  setHighContrast: (v: boolean) => Promise<void>;
  setReduceMotion: (v: boolean) => Promise<void>;
};

export const useThemeStore = create<ThemeState>()((set, get) => ({
  // defaults (om IDB inte laddats ännu)
  theme: "dark",
  fontBody: "Inter",
  fontHeading: "Merriweather",
  highContrast: false,
  reduceMotion: false,

  initialized: false,

  /** Läs in från IndexedDB och applicera direkt i UI */
  initFromDB: async () => {
    if (get().initialized) return;
    try {
      const s = await getSettings();
      if (s) {
        set({
          theme: s.theme ?? "dark",
          fontBody: s.fontBody ?? "Inter",
          fontHeading: s.fontHeading ?? "Merriweather",
          highContrast: !!s.highContrast,
          reduceMotion: !!s.reduceMotion,
          initialized: true
        });
        applyToDOM(s.theme, s.fontBody);
      } else {
        // första körningen – skriv defaults
        await putSettings({
          theme: "dark",
          fontBody: "Inter",
          fontHeading: "Merriweather",
          highContrast: false,
          reduceMotion: false
        });
        set({ initialized: true });
        applyToDOM("dark", "Inter");
      }
    } catch {
      // Om något strular, applicera baseline
      set({ initialized: true });
      applyToDOM("dark", "Inter");
    }
  },

  setTheme: async (t) => {
    set({ theme: t });
    applyToDOM(t, get().fontBody);
    await putSettings({ theme: t });
  },

  setFontBody: async (font) => {
    set({ fontBody: font });
    applyToDOM(get().theme, font);
    await putSettings({ fontBody: font });
  },

  setFontHeading: async (font) => {
    set({ fontHeading: font });
    await putSettings({ fontHeading: font });
  },

  setHighContrast: async (v) => {
    set({ highContrast: v });
    await putSettings({ highContrast: v });
  },

  setReduceMotion: async (v) => {
    set({ reduceMotion: v });
    await putSettings({ reduceMotion: v });
  }
}));

// ----- helpers -----

function applyToDOM(theme: Settings["theme"], fontBody?: string) {
  const cls = `theme-${theme}`;
  document.body.className = cls;
  localStorage.setItem("lunax-theme", cls); // fallback om IDB låser sig

  if (fontBody) {
    // valfritt – kan användas i CSS: font-family: var(--font-sans)
    document.documentElement.style.setProperty("--font-sans", fontBody);
  }
}