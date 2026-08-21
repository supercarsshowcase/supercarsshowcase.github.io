import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { AppProvider } from "@/context/app-context";
import { AppShell } from "@/components/AppShell";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Garage = lazy(() => import("./pages/Garage.tsx"));
const CarDetail = lazy(() => import("./pages/CarDetail.tsx"));
const BrandDetail = lazy(() => import("./pages/BrandDetail.tsx"));
const Rankings = lazy(() => import("./pages/Rankings.tsx"));
const Favorites = lazy(() => import("./pages/Favorites.tsx"));
const Compare = lazy(() => import("./pages/Compare.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-apex-ink">
      <div className="animate-pulse font-display text-sm uppercase tracking-[0.3em] text-white/40">
        Loading…
      </div>
    </div>
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <AppProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/garage" element={<Garage />} />
                  <Route path="/cars/:slug" element={<CarDetail />} />
                  <Route path="/brands/:slug" element={<BrandDetail />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route
                  path="/auth"
                  element={<AuthPage redirectAfterAuth="/favorites" />}
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
