import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import { AppProvider } from "@/context/app-context";
import { AppShell } from "@/components/AppShell";
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
import Feedback from "./pages/Feedback.tsx";
import MyGarage from "./pages/MyGarage.tsx";
import Profile from "./pages/Profile.tsx";
import Admin from "./pages/Admin.tsx";
import Garage from "./pages/Garage.tsx";
import CarDetail from "./pages/CarDetail.tsx";
import BrandDetail from "./pages/BrandDetail.tsx";
import Rankings from "./pages/Rankings.tsx";
import Favorites from "./pages/Favorites.tsx";
import Compare from "./pages/Compare.tsx";
import AuthPage from "./pages/Auth.tsx";
import Game from "./pages/Game.tsx";
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <AppProvider>
          <BrowserRouter>
            <RouteSyncer />
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Landing />} />
                <Route path="/garage" element={<Garage />} />
                <Route path="/game" element={<Game />} />
                <Route path="/cars/:slug" element={<CarDetail />} />
                <Route path="/brands/:slug" element={<BrandDetail />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route
                  path="/my-garage"
                  element={
                    <RequireAuth>
                      <MyGarage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireAuth>
                      <Profile />
                    </RequireAuth>
                  }
                />
                <Route path="/compare" element={<Compare />} />
                <Route
                  path="/feedback"
                  element={
                    <RequireAuth>
                      <Feedback />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <Admin />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/favorites" />}
              />
            </Routes>
          </BrowserRouter>
        </AppProvider>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
