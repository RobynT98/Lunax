import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * BottomNav – mobilvänlig bottenmeny med safe-area padding.
 * Läggs längst ner i layouten (t.ex. i App eller en RootLayout).
 */

type Item = {
  to: string;
  label: string;
  icon: React.ReactNode;
  matchExact?: boolean;
};

const ITEMS: Item[] = [
  { to: "/",        label: "Hem",       icon: <span aria-hidden>🏠</span>, matchExact: true },
  { to: "/new",     label: "Ny",        icon: <span aria-hidden>✍️</span> },
  { to: "/settings",label: "Inställn.", icon: <span aria-hidden>⚙️</span> }
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (it: Item) => {
    if (it.matchExact) return location.pathname === withBase(it.to);
    return location.pathname.startsWith(withBase(it.to));
  };

  // När vi kör under GitHub Pages behövs base-path för jämförelser
  function withBase(path: string) {
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
    return `${base}${path}`;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primär"
    >
      <div
        className="mx-3 mb-3 rounded-xl3"
        style={{
          background: "var(--surface-alt)",
          borderRadius: "1rem",
          boxShadow: "0 10px 30px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.12)",
          border: "1px solid rgba(255,255,255,.06)"
        }}
      >
        <ul className="flex items-stretch justify-around">
          {ITEMS.map((it) => {
            const active = isActive(it);
            return (
              <li key={it.to} className="flex-1">
                <Link
                  to={it.to}
                  className="flex flex-col items-center justify-center gap-1 py-2 text-sm"
                  aria-current={active ? "page" : undefined}
                  style={{
                    color: active ? "var(--brand-fg)" : "var(--text)",
                    background: active ? "var(--brand)" : "transparent",
                    borderRadius: "1rem",
                    margin: "6px"
                  }}
                >
                  <span className="text-base leading-none">{it.icon}</span>
                  <span className="leading-none">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}