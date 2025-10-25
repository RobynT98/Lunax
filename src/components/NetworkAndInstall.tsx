import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * NetworkAndInstall
 * - Visar en fast banner längst ner när du är OFFLINE.
 * - Visar en install-knapp (PWA) när beforeinstallprompt är tillgänglig.
 * - Döljer install-knappen om appen redan körs i standalone eller om användaren avböjt.
 *
 * Användning: lägg <NetworkAndInstall /> högt i appen (t.ex. i App.tsx).
 */

function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  const isStandalone = useMemo(() => {
    const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
    // iOS Safari har navigator.standalone
    // @ts-ignore
    const ios = typeof navigator !== "undefined" && (navigator as any).standalone;
    return !!mq || !!ios;
  }, []);

  useEffect(() => {
    // Om redan installerad – visa inte knapp
    if (isStandalone) return;

    const dismissed = localStorage.getItem("lunax-install-dismissed") === "1";
    if (dismissed) return;

    const handler = (e: any) => {
      // Stoppa Chrome från att visa sin egen prompt
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, [isStandalone]);

  const promptInstall = async () => {
    const evt = deferredPromptRef.current;
    if (!evt) return;
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      // { outcome: "accepted" | "dismissed" }
      if (choice?.outcome === "dismissed") {
        localStorage.setItem("lunax-install-dismissed", "1");
      }
    } catch {
      // noop
    } finally {
      deferredPromptRef.current = null;
      setCanInstall(false);
    }
  };

  const dismissInstall = () => {
    localStorage.setItem("lunax-install-dismissed", "1");
    setCanInstall(false);
  };

  return { canInstall: canInstall && !isStandalone, promptInstall, dismissInstall, isStandalone };
}

export default function NetworkAndInstall() {
  const online = useOnline();
  const { canInstall, promptInstall, dismissInstall } = usePWAInstall();

  return (
    <>
      {/* Offline-banner */}
      {!online && (
        <div
          className="fixed inset-x-3 bottom-3 z-50 rounded-lg px-4 py-3"
          style={{
            background: "var(--surface-alt)",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 8px 28px rgba(0,0,0,.35)"
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden>⚠️</span>
            <div className="text-sm">
              <strong>Offline.</strong> Du kan fortsätta skriva. Allt sparas lokalt tills nät finns igen.
            </div>
          </div>
        </div>
      )}

      {/* Install-knapp (flytande) */}
      {canInstall && (
        <div className="fixed right-3 bottom-20 z-50 flex items-center gap-2">
          <button
            onClick={promptInstall}
            className="px-3 py-2 rounded-lg font-medium"
            style={{
              background: "var(--brand)",
              color: "var(--brand-fg)",
              boxShadow: "0 8px 28px rgba(0,0,0,.35)"
            }}
            title="Installera Lunax"
          >
            ⬇️ Installera
          </button>
          <button
            onClick={dismissInstall}
            className="px-2 py-2 rounded-lg text-sm opacity-80"
            style={{ background: "var(--surface-alt)", color: "var(--text)" }}
            title="Visa inte igen"
          >
            Stäng
          </button>
        </div>
      )}
    </>
  );
}