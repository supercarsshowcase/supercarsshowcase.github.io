import { Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";

/**
 * Route guard for the admin panel. Signed-out users go to /auth with a
 * returnTo; signed-in non-admins see an access-denied screen.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-apex-ink">
        <Loader2 className="size-6 animate-spin text-apex-red" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-apex-red/10">
          <ShieldAlert className="size-7 text-apex-red" />
        </span>
        <p className="mt-6 font-display text-2xl font-black tracking-tight text-white">
          ACCESS DENIED
        </p>
        <p className="mt-3 text-sm leading-6 text-apex-muted">
          The control room is for admins only. If you believe this is a mistake,
          ask the site owner to promote your account.
        </p>
        <Link
          to="/garage"
          className="mt-8 rounded-md bg-apex-red px-6 py-3 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright"
        >
          Back to the garage
        </Link>
      </div>
    );
  }

  return children;
}
