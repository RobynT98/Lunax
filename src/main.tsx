import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

function boot() {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    console.error("Hittar inte #root i index.html");
    return;
  }

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Signalera till index.html att appen är igång (stänger ev. fallback)
  try {
    // @ts-ignore
    if (window.__lunaxBootOk) window.__lunaxBootOk();
  } catch (e) {
    // ignore
  }
}

// Kör uppstart
boot();