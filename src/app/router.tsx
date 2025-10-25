import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  useRouteError,
} from "react-router-dom";
import EditorPage from "@/pages/EditorPage";

// ——— Stubb för startsida (ersätts senare med riktig listvy)
function HomePage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand">Lunax</h1>
        <nav className="flex gap-3">
          <Link className="underline" to="/new">+ Nytt inlägg</Link>
          <Link className="underline" to="/settings">Inställningar</Link>
        </nav>
      </header>

      <div className="card">
        <h2 className="text-xl font-semibold mb-2">Välkommen</h2>
        <p className="text-text-muted">
          Det här är en temporär startsida. Gå till <Link className="underline" to="/new">Nytt inlägg</Link> för att börja skriva.
          Senare kommer denna vy lista dina senaste inlägg, filter och sök.
        </p>
      </div>
    </div>
  );
}

// ——— Stubb för inställningar (tema/fonter m.m. kommer snart)
function SettingsPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-brand">Inställningar</h1>
        <nav className="flex gap-3">
          <Link className="underline" to="/">Hem</Link>
          <Link className="underline" to="/new">Nytt inlägg</Link>
        </nav>
      </header>

      <div className="card">
        <p className="text-text-muted">
          Här kommer temaväljare, fonter, export/import och lås.
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Sidan finns inte</h1>
      <p className="mb-4 text-text-muted">Klicka nedan för att gå hem.</p>
      <Link className="underline" to="/">Till startsidan</Link>
    </div>
  );
}

function RouteErrorBoundary() {
  const err = useRouteError() as any;
  console.error(err);
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Något gick fel</h1>
      <pre className="text-sm opacity-80 overflow-auto">{String(err?.message || err)}</pre>
      <div className="mt-4">
        <Link className="underline" to="/">Till startsidan</Link>
      </div>
    </div>
  );
}

// Router-konfig
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/new",
    element: <EditorPage />
  },
  {
    path: "/entry/:id",
    // Vi återanvänder EditorPage; i nästa steg läser vi :id via useParams och laddar inlägget.
    element: <EditorPage />
  },
  {
    path: "/settings",
    element: <SettingsPage />
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}