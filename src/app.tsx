import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { Toaster } from "sileo";

const NcFramePage = lazy(() =>
  import("./features/nc-frame/nc-frame-page").then((module) => ({
    default: module.NcFramePage,
  })),
);

function RouteFallback() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground text-sm">Loading tool…</p>
    </main>
  );
}

function NcFrameRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <NcFramePage />
    </Suspense>
  );
}

function AppHeader() {
  return (
    <nav className="flex h-14 shrink-0 items-center border-b bg-background px-4 sm:px-6">
      <Link
        className="flex items-center gap-3 font-semibold text-lg tracking-tight"
        to="/"
      >
        <img alt="उमेश धिताल" className="h-8 w-auto" src="/logo-tree.png" />
        <span>उमेश धिताल</span>
      </Link>
    </nav>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <AppHeader />
        <Routes>
          <Route element={<NcFrameRoute />} path="/" />
          <Route element={<NcFrameRoute />} path="/nc-frame" />
          <Route
            element={<NcFrameRoute />}
            path="*"
          />
        </Routes>
      </div>
      <Toaster
        offset={16}
        options={{
          roundness: 12,
        }}
        position="top-center"
      />
    </BrowserRouter>
  );
}
