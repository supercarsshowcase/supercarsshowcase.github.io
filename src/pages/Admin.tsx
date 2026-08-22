import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Eye,
  Activity,
  Radio,
  CalendarDays,
  Shield,
  ShieldCheck,
  Palette,
  Megaphone,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

const ACCENT_PRESETS = [
  { name: "Racing Red", value: "#ff2e00" },
  { name: "Amber", value: "#ff9500" },
  { name: "Lime", value: "#8bd450" },
  { name: "Cyan", value: "#2dd4bf" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Champagne", value: "#e8c98a" },
];

type Settings = { bannerText: string; bannerEnabled: boolean; accent: string } | undefined;

export default function Admin() {
  const stats = useQuery(api.site.getAdminStats);
  const users = useQuery(api.site.listUsers);
  const settings = useQuery(api.site.getSiteSettings);

  const setUserRole = useMutation(api.site.setUserRole);
  const updateSiteSettings = useMutation(api.site.updateSiteSettings);

  const [bannerText, setBannerText] = useState("");
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [accent, setAccent] = useState("#ff2e00");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);

  // Sync the form when settings first load (render-time pattern).
  const [prevSettings, setPrevSettings] = useState<Settings>(settings);
  if (settings && settings !== prevSettings) {
    setPrevSettings(settings);
    if (!hydrated) {
      setHydrated(true);
      setBannerText(settings.bannerText);
      setBannerEnabled(settings.bannerEnabled);
      setAccent(settings.accent);
    }
  }

  const persist = useCallback(
    async (text: string, enabled: boolean, color: string) => {
      try {
        await updateSiteSettings({
          bannerText: text,
          bannerEnabled: enabled,
          accent: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#ff2e00",
        });
        setSaveStatus("saved");
      } catch (e) {
        setSaveStatus("error");
        console.error("Failed to save settings", e);
      }
    },
    [updateSiteSettings],
  );

  // Auto-save (debounced) whenever any setting changes.
  useEffect(() => {
    if (!hydrated) return;
    const unchanged =
      settings &&
      bannerText === settings.bannerText &&
      bannerEnabled === settings.bannerEnabled &&
      accent === settings.accent;
    if (unchanged) return;
    const timer = setTimeout(() => void persist(bannerText, bannerEnabled, accent), 700);
    return () => clearTimeout(timer);
  }, [bannerText, bannerEnabled, accent, settings, hydrated, persist]);

  const dirty =
    hydrated &&
    (!settings ||
      bannerText !== settings.bannerText ||
      bannerEnabled !== settings.bannerEnabled ||
      accent !== settings.accent);

  const toggleRole = async (userId: string, currentRole: string) => {
    const next = currentRole === "admin" ? "user" : "admin";
    try {
      await setUserRole({ userId: userId as unknown as Id<"users">, role: next });
      toast.success(next === "admin" ? "Promoted to admin" : "Demoted to user");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update role");
    }
  };

  const statCards = [
    { label: "Accounts created", value: stats?.accounts ?? 0, icon: UserPlus },
    { label: "Sign-ins recorded", value: stats?.signIns ?? 0, icon: Users },
    { label: "Unique visitors", value: stats?.visitors ?? 0, icon: Eye },
    { label: "Page views", value: stats?.visits ?? 0, icon: Activity },
    { label: "Active sessions", value: stats?.currentSessions ?? 0, icon: Radio },
    { label: "Visitors today", value: stats?.visitorsToday ?? 0, icon: CalendarDays },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          <span className="inline-block size-1.5 rounded-full bg-apex-red" /> Control room
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          ADMIN
        </h1>
        <p className="mt-3 text-sm text-apex-muted">
          Site analytics, user roles, and quick UI settings. Only admins can see
          this page.
        </p>
      </div>

      {/* Stats */}
      {stats === undefined ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="size-4 animate-spin" /> Loading analytics…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-apex-line bg-apex-panel p-4"
            >
              <s.icon className="size-4 text-apex-red" />
              <p className="mt-3 font-display text-3xl font-black tracking-tight text-white">
                {s.value.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Users */}
        <section className="rounded-lg border border-apex-line bg-apex-panel">
          <div className="flex items-center gap-2 border-b border-apex-line px-5 py-4">
            <Shield className="size-4 text-apex-red" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">
              Users & roles
            </h2>
          </div>
          {users === undefined ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" /> Loading users…
            </div>
          ) : (
            <ul className="divide-y divide-apex-line">
              {users.map((u) => (
                <li
                  key={u._id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {u.image ? (
                      <img
                        src={u.image}
                        alt=""
                        className="size-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-apex-red/15 font-display text-xs font-bold text-apex-red">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {u.name}
                        {u.role === "admin" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-apex-red/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-apex-red">
                            <ShieldCheck className="size-3" /> Admin
                          </span>
                        )}
                      </p>
                      {u.email && (
                        <p className="truncate text-xs text-white/40">{u.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleRole(u._id, u.role)}
                    className={cn(
                      "shrink-0 rounded-md border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
                      u.role === "admin"
                        ? "border-white/15 text-white/50 hover:border-apex-red hover:text-apex-red"
                        : "border-apex-red/40 bg-apex-red/10 text-apex-red hover:bg-apex-red hover:text-white",
                    )}
                  >
                    {u.role === "admin" ? "Demote" : "Make admin"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Site settings */}
        <section className="rounded-lg border border-apex-line bg-apex-panel">
          <div className="flex items-center justify-between border-b border-apex-line px-5 py-4">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-apex-red" />
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">
                Quick UI settings
              </h2>
            </div>
            {/* Save status */}
            {hydrated && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  saveStatus === "error"
                    ? "text-apex-red"
                    : dirty
                      ? "text-white/40"
                      : "text-white/40",
                )}
              >
                {saveStatus === "error" ? (
                  <>
                    <AlertTriangle className="size-3.5" /> Save failed
                  </>
                ) : dirty ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" /> Saved
                  </>
                )}
              </span>
            )}
          </div>

          {settings === undefined ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="space-y-6 px-5 py-5">
              {/* Accent color */}
              <div>
                <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Accent color
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      title={p.name}
                      onClick={() => setAccent(p.value)}
                      className={cn(
                        "size-8 rounded-full border-2 transition-transform hover:scale-110",
                        accent === p.value ? "border-white" : "border-transparent",
                      )}
                      style={{ backgroundColor: p.value }}
                    />
                  ))}
                  <label className="ml-1 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs text-white/70">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <input
                      type="color"
                      value={accent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="size-0 cursor-pointer opacity-0"
                      aria-label="Custom accent color"
                    />
                    Custom
                  </label>
                </div>
              </div>

              {/* Announcement banner */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Announcement banner
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={bannerEnabled}
                    onClick={() => setBannerEnabled((v) => !v)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      bannerEnabled ? "bg-apex-red" : "bg-white/15",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
                        bannerEnabled ? "translate-x-[22px]" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
                <textarea
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="e.g. New machines added — the Bugatti Tourbillon is in the garage."
                  className="mt-3 w-full resize-none rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
                />
              </div>

              {/* Live preview — same styling as the site banner */}
              <div className="rounded-md border border-apex-line bg-white/[0.02] p-3">
                <p className="mb-2 font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  {bannerEnabled && bannerText.trim()
                    ? "Live preview — appears at the top of every page"
                    : "Preview — the banner is hidden while off or empty"}
                </p>
                {bannerEnabled && bannerText.trim() ? (
                  <div className="flex items-center justify-center gap-2 rounded-sm bg-apex-red/10 px-3 py-2.5 text-center">
                    <Megaphone className="size-3.5 shrink-0 text-apex-red" />
                    <p className="text-xs font-medium leading-5 text-white/85">
                      {bannerText}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-apex-line px-3 py-2.5 text-center text-xs text-white/30">
                    Turn the banner on and add text to see it here.
                  </div>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-white/30">
                <Megaphone className="size-3.5" /> Changes save automatically as
                you type — no button needed.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
