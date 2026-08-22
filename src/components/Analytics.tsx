import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

const DEVICE_KEY = "ss-device-id";
const VISIT_THROTTLE_MS = 15_000;

// Module-level so the once-per-session flags survive StrictMode remounts.
let signInHandled = false;

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * Lightweight client-side analytics:
 * - records a page view per route change (throttled),
 * - records a sign-in + admin claim once per browser session.
 */
export function Analytics() {
  const trackVisit = useMutation(api.site.trackVisit);
  const trackSignIn = useMutation(api.site.trackSignIn);
  const ensureAdmin = useMutation(api.site.ensureAdmin);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const lastVisit = useRef(0);

  // Page views on route change (throttled to avoid spam).
  useEffect(() => {
    const now = Date.now();
    if (now - lastVisit.current < VISIT_THROTTLE_MS) return;
    lastVisit.current = now;
    void trackVisit({ deviceId: getDeviceId(), path: location.pathname }).catch(() => {});
  }, [location.pathname, trackVisit]);

  // On first successful auth in this session: record the sign-in and claim
  // the admin role if no admin exists yet (first user to arrive becomes admin).
  useEffect(() => {
    if (!isAuthenticated || signInHandled) return;
    signInHandled = true;
    void trackSignIn().catch(() => {});
    void ensureAdmin().catch(() => {});
  }, [isAuthenticated, trackSignIn, ensureAdmin]);

  return null;
}
