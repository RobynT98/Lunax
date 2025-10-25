import React, { useEffect, useState } from "react";
import AppRouter from "@/app/router";
import { getSettings, type Settings } from "@/db/schema";
import NetworkAndInstall from "@/components/NetworkAndInstall";
import BottomNav from "@/components/BottomNav";

export default function App() {
  const [theme, setTheme] = useState("theme-dark");

  // Läs tema vid start
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

  // Applicera klass på body
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen relative pb-24">
      <AppRouter />
      <NetworkAndInstall />
      <BottomNav />
    </div>
  );
}