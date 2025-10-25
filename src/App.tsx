import React, { useEffect, useState } from "react";

// Enkel skal-layout för Lunax
export default function App() {
  const [theme, setTheme] = useState<string>(
    localStorage.getItem("lunax-theme") || "theme-dark"
  );

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("lunax-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "theme-dark" ? "theme-parchment" : "theme-dark";
    setTheme(next);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-4 text-brand">Lunax</h1>
      <p className="text-center max-w-lg text-text-muted mb-6">
        Din lokala PWA-dagbok med full redigering, teman och JSON export/import.
      </p>
      <button onClick={toggleTheme}>Byt tema</button>

      <div className="mt-10 card w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Kommande steg</h2>
        <ul className="list-disc list-inside text-sm text-text-muted">
          <li>IndexedDB-lagring</li>
          <li>Rich text-editor (TipTap)</li>
          <li>Export / import</li>
          <li>Temahantering & fontval</li>
          <li>PWA och offline</li>
        </ul>
      </div>
    </div>
  );
}