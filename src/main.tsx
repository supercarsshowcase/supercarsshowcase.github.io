import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { AppShell } from "@/components/AppShell";
import { GemProvider } from "@/context/gem-context";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import "./types/global.d.ts";

import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import Landing from "./pages/Landing.tsx";
import Roulette from "./pages/Roulette.tsx";
import Tower from "./pages/Tower.tsx";
import Mines from "./pages/Mines.tsx";
import Blackjack from "./pages/Blackjack.tsx";
import Multibattles from "./pages/Multibattles.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Promo from "./pages/Promo.tsx";
import Earn from "./pages/Earn.tsx";
import AuthPage from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

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

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <GemProvider>
          <BrowserRouter>
            <RouteSyncer />
            <ScrollToTop />
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Landing />} />
                <Route path="/roulette" element={<Roulette />} />
                <Route path="/tower" element={<Tower />} />
                <Route path="/mines" element={<Mines />} />
                <Route path="/blackjack" element={<Blackjack />} />
                <Route path="/multibattles" element={<Multibattles />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/promo" element={<Promo />} />
                <Route path="/earn" element={<Earn />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/roulette" />}
              />
            </Routes>
          </BrowserRouter>
        </GemProvider>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
