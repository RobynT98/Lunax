import React, { useEffect, useRef, useState } from "react";
import { triggerDownloadExport, importFromFile } from "@/utils/exportImport";
import { getSettings, putSettings, type Settings } from "@/db/schema";

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);
    })();
  }, []);

  // ——— UI Helpers
  const note = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 3500);
  };

  // ——— Actions
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
      // Ladda om settings efter import
      const s = await getSettings();
      setSettings(s);
      // Uppdatera body-klass om tema ändrats
      if (s?.theme) {
        document.body.className = `theme-${s.theme}`;
        localStorage.setItem("lunax-theme", `theme-${s.theme}`);
      }
    } catch (e: any) {
      note(`Import misslyckades: ${e?.message || e}`);
    } finally {
      ev.target.value = "";
      setBusy(false);
    }
  };

  const updateSetting = async (patch: Partial<Settings>, announce?: string) => {
    const next = await putSettings(patch);
    setSettings(next);
    if (announce) note(announce);
  };

  const onThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const themeKey = e.target.value as Settings["theme"];
    await updateSetting({ theme: themeKey }, "Tema uppdaterat.");
    // byt omedelbart i UI
    const cls = `theme-${themeKey}`;
    document.body.className = cls;
    localStorage.setItem("lunax-theme", cls);
  };

  const onBodyFont = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await updateSetting({ fontBody: e.target.value }, "Brödtext-typsnitt uppdaterat.");
    document.documentElement.style.setProperty("--font-sans", e.target.value);
  };

  const onHeadingFont = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await updateSetting({ fontHeading: e.target.value }, "Rubrik-typsnitt uppdaterat.");
  };

  if (!settings) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <div className="card">Laddar inställningar…</div>
      </div>
    );
  }

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
              value={settings.theme}
              onChange={onThemeChange}
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
              value={settings.fontBody}
              onChange={onBodyFont}
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
              value={settings.fontHeading}
              onChange={onHeadingFont}
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

      {/* Tillgänglighet – enklare toggles (kan byggas ut senare) */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-3">Tillgänglighet</h2>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => updateSetting({ highContrast: e.target.checked }, "Högkontrast uppdaterat.")}
            />
            Högkontrastläge
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSetting({ reduceMotion: e.target.checked }, "Animationsnivå uppdaterad.")}
            />
            Minska animationer
          </label>
        </div>
      </section>
    </div>
  );
}