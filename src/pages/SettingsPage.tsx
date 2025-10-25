import React, { useRef, useState } from "react";
import { triggerDownloadExport, importFromFile } from "@/utils/exportImport";
import { useThemeStore } from "@/state/themeStore";
import { getSettings, type Settings } from "@/db/schema";

const THEMES: Array<{ key: Settings["theme"]; label: string }> = [
  { key: "dark", label: "Mörk" },
  { key: "parchment", label: "Parchment (pergament)" },
  { key: "midnight", label: "Midnight" },
  { key: "forest", label: "Forest" },
  { key: "obsidian", label: "Obsidian" },
  { key: "light", label: "Ljus (basic)" }
];

const FONTS = {
  body: ["Inter", "Merriweather", "Cormorant", "JetBrains Mono"],
  heading: ["Merriweather", "Inter", "Cormorant", "JetBrains Mono"]
};

export default function SettingsPage() {
  // Hämta state & actions från store
  const {
    theme, fontBody, fontHeading, highContrast, reduceMotion,
    setTheme, setFontBody, setFontHeading, setHighContrast, setReduceMotion, initFromDB
  } = useThemeStore();

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const note = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 3500);
  };

  // —— Export / Import
  const onExport = async () => {
    try {
      setBusy(true);
      await triggerDownloadExport();
      note("Export klar – fil nedladdad.");
    } catch (e: any) {
      note(`Export misslyckades: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const onPickImport = () => fileRef.current?.click();

  const onImport = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const res = await importFromFile(file);
      note(`Import klar: ${res.importedEntries} inlägg, ${res.importedBlobs} bilagor.`);
      // Läs om settings från DB (om importen innehöll nya)
      await initFromDB();
    } catch (e: any) {
      note(`Import misslyckades: ${e?.message || e}`);
    } finally {
      ev.target.value = "";
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand">Inställningar</h1>
        <a className="underline" href={import.meta.env.BASE_URL}>Hem</a>
      </header>

      {!!msg && (
        <div className="rounded-lg px-3 py-2 bg-[color:var(--surface-alt)] text-sm">
          {msg}
        </div>
      )}

      {/* Tema */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-3">Tema & typografi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm opacity-90">
            Tema
            <select
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Settings["theme"])}
            >
              {THEMES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="text-sm opacity-90">
            Brödtext-typsnitt
            <select
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              value={fontBody}
              onChange={(e) => setFontBody(e.target.value)}
            >
              {FONTS.body.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="text-sm opacity-90">
            Rubrik-typsnitt
            <select
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              value={fontHeading}
              onChange={(e) => setFontHeading(e.target.value)}
            >
              {FONTS.heading.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Export / Import */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-3">Backup</h2>
        <p className="text-sm text-text-muted mb-3">
          Exporterar allt till en <code>lunax.json</code>-fil (enklast i mobilen).
          Import läser in och merge:ar – nya ID:n skapas om det finns krockar.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={onExport} disabled={busy}>
            {busy ? "Jobbar…" : "Exportera JSON"}
          </button>

          <button type="button" onClick={onPickImport} disabled={busy}>
            Importera JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
          />
        </div>
      </section>

      {/* Tillgänglighet */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-3">Tillgänglighet</h2>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
            />
            Högkontrastläge
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
            />
            Minska animationer
          </label>
        </div>
      </section>
    </div>
  );
}