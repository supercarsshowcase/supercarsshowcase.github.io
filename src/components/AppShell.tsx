import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  Heart,
  Menu,
  ChevronDown,
  Shuffle,
  X,
  User,
  LogOut,
  LogIn,
  Shield,
  Megaphone,
  Warehouse,
  UserRound,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useApp } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { Analytics } from "./Analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES } from "@/lib/format";
import { CARS } from "@/data/cars";
import { BRANDS } from "@/data/brands";
import type { CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/garage", label: "Garage" },
  { to: "/rankings", label: "Rankings" },
  { to: "/favorites", label: "Favorites" },
  { to: "/my-garage", label: "My Garage" },
  { to: "/feedback", label: "Feedback" },
];

const REGIONS = ["GB EN", "US EN", "DE DE", "FR FR", "IT IT", "AE EN"];

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-1.5">
      <span className="font-display text-base font-black tracking-tight text-white sm:text-lg">
        SUPERCARS
      </span>
      <span className="size-1.5 shrink-0 rounded-full bg-apex-red transition-transform group-hover:scale-150" />
      <span className="font-display text-base font-black tracking-tight text-white sm:text-lg">
        SHOWCASE
      </span>
    </Link>
  );
}

export function AppShell() {
  const { currency, setCurrency, region, setRegion, favorites } = useApp();
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  // Site settings (banner + accent) from the admin panel.
  const settings = useQuery(api.site.getSiteSettings);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--color-apex-red", settings.accent);
    root.style.setProperty(
      "--color-apex-red-bright",
      `color-mix(in srgb, ${settings.accent}, white 18%)`,
    );
    root.style.setProperty(
      "--color-apex-red-deep",
      `color-mix(in srgb, ${settings.accent}, black 30%)`,
    );
  }, [settings]);

  const surpriseMe = () => {
    const car = CARS[Math.floor(Math.random() * CARS.length)];
    navigate(`/cars/${car.slug}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-apex-ink text-white">
      <Analytics />
      <header className="sticky top-0 z-50 border-b border-apex-line bg-black/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    cn(
                      "relative px-3 py-2 font-display text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors",
                      isActive
                        ? "text-white"
                        : "text-white/55 hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-[1px] h-0.5 bg-apex-red" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      "relative inline-flex items-center gap-1.5 px-3 py-2 font-display text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors",
                      isActive
                        ? "text-apex-red"
                        : "text-white/55 hover:text-apex-red",
                    )
                  }
                >
                  <Shield className="size-3.5" />
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={surpriseMe}
              className="hidden items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-apex-red hover:text-white md:flex"
            >
              <Shuffle className="size-3.5" />
              Surprise
            </button>

            {/* Region selector */}
            <div className="relative hidden sm:block">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-label="Region"
                className="h-9 cursor-pointer appearance-none rounded-md border border-white/15 bg-transparent pl-3 pr-8 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80 outline-none transition-colors hover:border-white/30 focus:border-apex-red"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-[#0b0b0c] text-white">
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-white/50" />
            </div>

            {/* Currency selector */}
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                aria-label="Currency"
                className="h-9 cursor-pointer appearance-none rounded-md border border-white/15 bg-transparent pl-3 pr-8 font-display text-[12px] font-semibold uppercase tracking-[0.1em] text-white/80 outline-none transition-colors hover:border-white/30 focus:border-apex-red"
              >
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code} className="bg-[#0b0b0c] text-white">
                    {CURRENCIES[code].symbol} {code}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-white/50" />
            </div>

            <Link
              to="/favorites"
              className="relative flex size-9 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:border-apex-red hover:text-white"
              aria-label="Favorites"
            >
              <Heart className="size-4" />
              {favorites.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-apex-red px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-md border border-white/15 text-white/80 transition-colors hover:border-apex-red hover:text-white"
                    aria-label="Account"
                  >
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-5 rounded-full object-cover"
                        style={
                          user?.accent
                            ? { boxShadow: `0 0 0 2px ${user.accent}` }
                            : undefined
                        }
                      />
                    ) : (
                      <span
                        className="flex size-5 items-center justify-center rounded-full"
                        style={
                          user?.accent
                            ? { boxShadow: `0 0 0 2px ${user.accent}` }
                            : undefined
                        }
                      >
                        <User className="size-4" />
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {user?.name ?? "Signed in"}
                    </p>
                    {user?.email && (
                      <p className="truncate text-xs text-white/50">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/favorites")}
                    className="cursor-pointer"
                  >
                    <Heart className="mr-2 size-4" />
                    My favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/my-garage")}
                    className="cursor-pointer"
                  >
                    <Warehouse className="mr-2 size-4" />
                    My garage
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer"
                  >
                    <UserRound className="mr-2 size-4" />
                    Edit profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/compare")}
                    className="cursor-pointer"
                  >
                    <Shuffle className="mr-2 size-4" />
                    Compare machines
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-apex-red focus:text-apex-red"
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md border border-apex-red/50 bg-apex-red/10 px-3 py-2 font-display text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-apex-red hover:text-white"
              >
                <LogIn className="size-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex size-9 items-center justify-center rounded-md border border-white/15 text-white/80 lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-apex-line bg-black px-4 py-3 lg:hidden">
            <div className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "border-b border-apex-line py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] last:border-0",
                      isActive ? "text-apex-red" : "text-white/70",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to="/compare"
                onClick={() => setMobileOpen(false)}
                className="border-b border-apex-line py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/70"
              >
                Compare
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-apex-line py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] text-apex-red"
                >
                  <Shield className="mr-2 inline size-4" /> Admin
                </NavLink>
              )}
              {!isAuthenticated && (
                <NavLink
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="border-b border-apex-line py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] text-apex-red"
                >
                  Sign in
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  surpriseMe();
                }}
                className="mt-1 flex items-center gap-2 py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/70"
              >
                <Shuffle className="size-4" /> Surprise Me
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Announcement banner (admin-editable) */}
      {settings?.bannerEnabled && settings.bannerText && (
        <div className="border-b border-apex-line bg-apex-red/10">
          <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-4 py-2.5 text-center sm:px-6">
            <Megaphone className="size-3.5 shrink-0 text-apex-red" />
            <p className="text-xs font-medium leading-5 text-white/85 sm:text-[13px]">
              {settings.bannerText}
            </p>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-apex-line bg-black">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <Logo />
              <p className="mt-4 text-sm leading-6 text-apex-muted">
                A cinematic archive of the world&apos;s greatest machines. Real
                specs. Real prices. Nothing for sale — just for the eyes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <span className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Explore
                </span>
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-sm text-white/70 transition-colors hover:text-apex-red"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  to="/compare"
                  className="text-sm text-white/70 transition-colors hover:text-apex-red"
                >
                  Compare
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Marques
                </span>
                {BRANDS.slice(0, 8).map((b) => (
                  <Link
                    key={b.slug}
                    to={`/brands/${b.slug}`}
                    className="text-sm text-white/70 transition-colors hover:text-apex-red"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Account
                </span>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-left text-sm text-white/70 transition-colors hover:text-apex-red"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="text-sm text-white/70 transition-colors hover:text-apex-red"
                  >
                    Sign in
                  </Link>
                )}
                <Link
                  to="/favorites"
                  className="text-sm text-white/70 transition-colors hover:text-apex-red"
                >
                  My favorites
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm text-white/70 transition-colors hover:text-apex-red"
                  >
                    Admin panel
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-apex-line pt-6 text-xs text-apex-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Supercars Showcase. A viewing archive — nothing is for sale.</span>
            <span className="font-display uppercase tracking-[0.2em]">
              Engineered for the eyes
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
