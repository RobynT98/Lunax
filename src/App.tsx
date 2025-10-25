import React, { useEffect } from "react";
import AppRouter from "@/app/router";
import NetworkAndInstall from "@/components/NetworkAndInstall";
import BottomNav from "@/components/BottomNav";
import { useThemeStore } from "@/state/themeStore";

export default function App() {
  const initFromDB = useThemeStore((s) => s.initFromDB);

  useEffect(() => {
    // Initiera tema/typografi från IndexedDB och applicera på <body>
    initFromDB();
  }, [initFromDB]);

  return (
    <div className="min-h-screen relative pb-24">
      <AppRouter />
      <NetworkAndInstall />
      <BottomNav />
    </div>
  );
}