import React, { useEffect, useState } from "react";
import AppRouter from "@/app/router";
import { getSettings, putSettings, type Settings } from "@/db/schema";

export default function App() {
  const [theme, setTheme] = useState("theme-dark");

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        if (settings?.theme) {
          setTheme(`theme-${settings.theme}`);
        } else {
          const local = localStorage.getItem("lunax-theme");
          if (local) setTheme(local);
        }
      } catch {
        const local = localStorage.getItem("lunax-theme");
        if (local) setTheme(local);
      }
    })();
  }, []);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = async () => {
    const next =
      theme === "theme-dark"
        ? "theme-parchment"
        : theme === "theme-parchment"
        ? "theme-midnight"
        : "theme-dark";
    setTheme(next);
    localStorage.setItem("lunax-theme", next);
    await putSettings({ theme: next.replace("theme-", "") as Settings["theme"] });
  };

  return (
    <div className="min-h-screen">
      <button
        className="fixed top-4 right-4 px-3 py-1 text-sm bg-[color:var(--brand)] text-[color:var(--brand-fg)] rounded-lg opacity-80 hover:opacity-100 transition z-50"
        onClick={toggleTheme}
        title="Byt tema"
      >
        🎨
      </button>
      <AppRouter />
    </div>
  );
}