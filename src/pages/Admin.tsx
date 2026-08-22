import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  Crown,
  BadgeCheck,
  Trash2,
  Palette,
  Megaphone,
  Inbox,
  Newspaper,
  Car,
  UserPlus,
  Users,
  Eye,
  Activity,
  CalendarDays,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
  Save,
  Pencil,
  X,
  Plus,
  Flame,
  Gift,
  Zap,
} from "lucide-react";
import { carsList } from "@/data/cars";
import { BRANDS } from "@/data/brands";
import { getBrandImage } from "@/data/images";
import { PageEditor } from "@/components/PageEditor";
import {
  HOME_COPY,
  SITE_UPDATES_COPY,
  NAV_COPY,
  GARAGE_COPY,
} from "@/data/page-copy";
import { GAME_CAR_MAP } from "@/game/data";
import type { Id } from "@/convex/_generated/dataModel";

// ── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: typeof Shield;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-apex-line bg-apex-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b border-apex-line px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-apex-red" />
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">
            {title}
          </h2>
          {badge && (
            <span className="rounded-full bg-apex-red/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-apex-red">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-white/40 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

// ── Accent Presets ───────────────────────────────────────────────────────────
const ACCENT_PRESETS = [
  { name: "Racing Red", value: "#ff2e00" },
  { name: "Amber", value: "#ff9500" },
  { name: "Lime", value: "#8bd450" },
  { name: "Cyan", value: "#2dd4bf" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Gold", value: "#d4a953" },
];

// ── Car edit fields ──────────────────────────────────────────────────────────
const CAR_EDIT_FIELDS = [
  { key: "displayName", label: "Display name" },
  { key: "priceUSD", label: "Price (USD)", hint: "Raw number, e.g. 3900000" },
  { key: "horsepower", label: "Horsepower", hint: "Raw number" },
  { key: "topSpeedKmh", label: "Top speed (km/h)", hint: "Raw number" },
  { key: "zeroToHundredKmh", label: "0-100 km/h (s)", hint: "Seconds" },
  { key: "engine", label: "Engine" },
  { key: "description", label: "Description", multiline: true },
];

// ── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  // ── Announcements ──
  const [announce, setAnnounce] = useState("");
  const broadcastAnnouncement = useMutation(api.site.postAnnouncement);
  const broadcast = useCallback(async () => {
    const msg = announce.trim();
    if (!msg) return;
    try {
      await broadcastAnnouncement({ message: msg });
      setAnnounce("");
      toast.success("Announcement broadcast!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to broadcast");
    }
  }, [announce, broadcastAnnouncement]);

  // ── Queries ──
  const stats = useQuery(api.site.getAdminStats);
  const users = useQuery(api.site.listUsers);
  const settings = useQuery(api.site.getSiteSettings);
  const feedback = useQuery(api.feedback.listFeedback);
  const carOverrides = useQuery(api.cars.getCarOverrides);

  // ── Mutations ──
  const setUserRole = useMutation(api.site.setUserRole);
  const deleteUser = useMutation(api.site.deleteUser);
  const updateSettings = useMutation(api.site.updateSiteSettings);
  const giveMoney = useMutation(api.adminAbuse.giveMoney);
  const giveCar = useMutation(api.adminAbuse.giveCar);
  const setMultiplierEvent = useMutation(api.adminAbuse.setMultiplierEvent);
  const clearMultiplierEvent = useMutation(api.adminAbuse.clearMultiplierEvent);
  const setFeedbackStatus = useMutation(api.feedback.setFeedbackStatus);
  const deleteFeedback = useMutation(api.feedback.deleteFeedback);
  const saveCarEdit = useMutation(api.cars.saveCarEdit);
  const resetCarEdit = useMutation(api.cars.resetCarEdit);
  const resetAllCarEdits = useMutation(api.cars.resetAllCarEdits);

  // ── UI Settings state ──
  const [accent, setAccent] = useState("#ff2e00");
  const [siteName, setSiteName] = useState("Supercars Showcase");
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");

  useEffect(() => {
    if (settings && !hydrated) {
      setAccent(settings.accent ?? "#ff2e00");
      setSiteName(settings.siteName ?? "Supercars Showcase");
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const dirty =
    hydrated && (accent !== (settings?.accent ?? "#ff2e00") || siteName !== (settings?.siteName ?? "Supercars Showcase"));

  const persist = useCallback(
    async (a: string, n: string) => {
      setSaveStatus("saving");
      try {
        await updateSettings({
          accent: a,
          siteName: n,
          bannerText: settings?.bannerText ?? "",
          bannerEnabled: settings?.bannerEnabled ?? false,
        });
        setSaveStatus("idle");
      } catch {
        setSaveStatus("error");
      }
    },
    [updateSettings, settings?.bannerText, settings?.bannerEnabled],
  );

  // Auto-save on change after hydration
  useEffect(() => {
    if (!hydrated || !dirty) return;
    const t = setTimeout(() => void persist(accent, siteName), 600);
    return () => clearTimeout(t);
  }, [accent, siteName, hydrated, dirty, persist]);

  // ── Admin Abuse state ──
  const [abuseTarget, setAbuseTarget] = useState("");
  const [abuseMoney, setAbuseMoney] = useState("");
  const [abuseCarId, setAbuseCarId] = useState("");
  const [eventMultiplier, setEventMultiplier] = useState("100");
  const [eventDuration, setEventDuration] = useState("30");
  const [eventLabel, setEventLabel] = useState("100x EVENT");

  const sortedGameCars = Object.entries(GAME_CAR_MAP)
    .filter(([, c]) => !c.secret)
    .sort(([, a], [, b]) => b.value - a.value);

  const newFeedbackCount = feedback?.filter((f) => f.status === "new").length ?? 0;

  // ── User role handler ──
  const setRole = async (userId: string, role: "owner" | "admin" | "moderator" | "user") => {
    try {
      await setUserRole({ userId: userId as unknown as Id<"users">, role });
      toast.success(`Role updated to ${role}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  // ── Car editor state ──
  const [editCarSlug, setEditCarSlug] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const openCarEditor = (slug: string) => {
    setEditCarSlug(slug);
    const ov: Record<string, unknown> = (carOverrides as Record<string, Record<string, unknown>> | undefined)?.[slug] ?? {};
    setEditDraft({
      displayName: String(ov.displayName ?? ""),
      priceUSD: ov.priceUSD != null ? String(ov.priceUSD) : "",
      horsepower: ov.horsepower != null ? String(ov.horsepower) : "",
      topSpeedKmh: ov.topSpeedKmh != null ? String(ov.topSpeedKmh) : "",
      zeroToHundredKmh: ov.zeroToHundredKmh != null ? String(ov.zeroToHundredKmh) : "",
      engine: String(ov.engine ?? ""),
      description: String(ov.description ?? ""),
    });
  };

  const saveCarEdits = async () => {
    if (!editCarSlug) return;
    const patch: Record<string, string | number | undefined> = {};
    for (const f of CAR_EDIT_FIELDS) {
      const raw = String(editDraft[f.key] ?? "").trim();
      if (!raw) {
        patch[f.key] = undefined;
        continue;
      }
      if (f.key === "priceUSD" || f.key === "horsepower" || f.key === "topSpeedKmh") {
        patch[f.key] = Number(raw) || undefined;
      } else if (f.key === "zeroToHundredKmh") {
        patch[f.key] = Number(raw) || undefined;
      } else {
        patch[f.key] = raw;
      }
    }
    try {
      await saveCarEdit({ slug: editCarSlug, fields: patch as Record<string, string> });
      toast.success("Car edits saved");
      setEditCarSlug(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save car edits");
    }
  };

  // ── Stat cards ──
  const statCards = [
    { label: "Accounts created", value: stats?.accounts ?? 0, icon: UserPlus },
    { label: "Sign-ins recorded", value: stats?.signIns ?? 0, icon: Users },
    { label: "Unique visitors", value: stats?.visitors ?? 0, icon: Eye },
    { label: "Page views", value: stats?.visits ?? 0, icon: Activity },
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
          Admin
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-apex-line bg-apex-panel p-4"
          >
            <s.icon className="mb-2 size-4 text-apex-red" />
            <p className="font-display text-2xl font-black text-white">
              {(s.value ?? 0).toLocaleString()}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Users & Roles + Quick UI Settings ───────────────────────────── */}
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {/* Users */}
        <CollapsibleSection title="Users & Roles" icon={Shield} defaultOpen={false}>
          {users === undefined ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" /> Loading users…
            </div>
          ) : (
            <ul className="divide-y divide-apex-line">
              {users.map((u) => (
                <li key={u._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {u.image ? (
                      <img src={u.image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-apex-red/15 font-display text-xs font-bold text-apex-red">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {u.name}
                        {u.role === "owner" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-400">
                            <Crown className="size-3" /> Owner
                          </span>
                        )}
                        {u.role === "admin" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-apex-red/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-apex-red">
                            <ShieldCheck className="size-3" /> Admin
                          </span>
                        )}
                        {u.role === "moderator" && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-400">
                            <BadgeCheck className="size-3" /> Moderator
                          </span>
                        )}
                      </p>
                      {u.email && (
                        <p className="truncate text-xs text-white/40">{u.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={u.role ?? "user"}
                      onChange={(e) => void setRole(u._id, e.target.value as "owner" | "admin" | "moderator" | "user")}
                      className="cursor-pointer rounded-md border border-white/[0.08] bg-[#0b0b0c] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white outline-none focus:border-apex-red"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Permanently delete ${u.name}'s account? This cannot be undone.`)) return;
                        void deleteUser({ userId: u._id }).catch((e: unknown) => {
                          toast.error(e instanceof Error ? e.message : "Could not delete user");
                        });
                      }}
                      aria-label={`Delete ${u.name}'s account`}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-white/15 text-white/40 transition-colors hover:border-apex-red hover:text-apex-red"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>

      {/* Quick UI Settings — full width */}
      <div className="mt-12">
        <CollapsibleSection title="Quick UI Settings" icon={Palette} defaultOpen={false}>
          <div className="flex items-center justify-end border-b border-apex-line px-5 py-4">
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
                  <><AlertTriangle className="size-3.5" /> Save failed</>
                ) : dirty ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Saving…</>
                ) : (
                  <><Check className="size-3.5" /> Saved</>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => void persist(accent, siteName)}
              disabled={!hydrated}
              className="inline-flex items-center gap-1.5 rounded-md bg-apex-red px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Save className="size-3.5" /> Save
            </button>
          </div>

          {settings === undefined ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <div className="space-y-6 px-5 py-5">
              {/* Site name */}
              <div>
                <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Site name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  maxLength={40}
                  className="mt-3 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
                  placeholder="e.g. My Supercar Archive"
                />
                <p className="mt-1.5 text-[11px] text-white/25">Appears as the site logo in the header and footer. Saved automatically.</p>
              </div>

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
                    <span className="size-3 rounded-full" style={{ backgroundColor: accent }} />
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

              <p className="flex items-center gap-1.5 text-[11px] text-white/30">
                Change the site name, accent color and page copy below — all
                saved automatically.
              </p>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* ── Announcements ───────────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection
          title="Announcements"
          icon={Megaphone}
          badge="Admin power"
          defaultOpen={false}
        >
          <div className="px-5 py-5">
            <p className="text-sm text-white/50">
              Type a message and press Enter to send it — send another and it
              stacks underneath. Every visitor sees them pop up at the top-center
              of the page (just below the header) as your name + message. Each
              one fades on its own: short messages vanish quickly, long ones
              linger.
            </p>
            <div className="mt-4 flex items-stretch gap-3">
              <textarea
                value={announce}
                onChange={(e) => setAnnounce(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void broadcast();
                  }
                }}
                rows={3}
                placeholder="Type a message…"
                className="flex-1 resize-none rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
              />
              <button
                type="button"
                onClick={() => void broadcast()}
                className="self-end rounded-md bg-apex-red px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
              >
                Broadcast
              </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Admin Abuse ─────────────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection
          title="Admin Abuse"
          icon={Zap}
          badge="Powers"
          defaultOpen={false}
        >
          <div className="space-y-6 px-5 py-5">
            {/* Give Money */}
            <div>
              <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                <Gift className="mr-1 inline size-3.5" /> Send Gift
              </h3>
              <select
                value={abuseTarget}
                onChange={(e) => setAbuseTarget(e.target.value)}
                className="mb-3 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
              >
                <option value="">Select a user…</option>
                {users?.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email || "no email"}) — {u.role}
                  </option>
                ))}
              </select>

              {/* Give Cash */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    Cash amount
                  </label>
                  <input
                    type="number"
                    value={abuseMoney}
                    onChange={(e) => setAbuseMoney(e.target.value)}
                    placeholder="1000000"
                    className="w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!abuseTarget || !abuseMoney) { toast.error("Select a user and enter an amount"); return; }
                    const amt = Number(abuseMoney);
                    if (amt <= 0 || !isFinite(amt)) { toast.error("Enter a valid amount"); return; }
                    try {
                      await giveMoney({ userId: abuseTarget as Id<"users">, amount: amt });
                      toast.success(`Sent $${amt.toLocaleString()} to user`);
                      setAbuseMoney("");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                  className="rounded-md bg-apex-red px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
                >
                  Send
                </button>
              </div>
              {/* Quick presets */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1000, 10000, 100000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAbuseMoney(String(v))}
                    className="rounded bg-white/5 px-2 py-1 text-[10px] font-bold text-white/60 hover:bg-white/10"
                  >
                    {v >= 1_000_000_000 ? "$1B" : v >= 1_000_000 ? `$${v / 1_000_000}M` : v >= 1000 ? `$${v / 1000}K` : `$${v}`}
                  </button>
                ))}
              </div>

              {/* Give Car */}
              <div className="mt-4 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    Car
                  </label>
                  <select
                    value={abuseCarId}
                    onChange={(e) => setAbuseCarId(e.target.value)}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                  >
                    <option value="">Select a car…</option>
                    {sortedGameCars.map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.brand} {c.name} ({c.year}) — ${(c.value).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!abuseTarget || !abuseCarId) { toast.error("Select a user and a car"); return; }
                    try {
                      await giveCar({ userId: abuseTarget as Id<"users">, carId: abuseCarId });
                      toast.success("Car sent!");
                      setAbuseCarId("");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                  className="rounded-md bg-apex-red px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
                >
                  Send Car
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-apex-line" />

            {/* Multiplier Event */}
            <div>
              <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                <Flame className="mr-1 inline size-3.5" /> Multiplier Event
              </h3>

              {/* Multiplier presets */}
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Multiplier
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[10, 50, 100, 500, 1000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setEventMultiplier(String(v)); setEventLabel(`${v}x EVENT`); }}
                    className={cn(
                      "rounded px-3 py-1.5 text-[10px] font-bold transition-colors",
                      eventMultiplier === String(v) ? "bg-apex-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10",
                    )}
                  >
                    {v}x
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={eventMultiplier}
                onChange={(e) => setEventMultiplier(e.target.value)}
                max={10000}
                className="mb-2 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                placeholder="Multiplier (e.g. 100)"
              />

              {/* Duration presets */}
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Duration (minutes)
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[5, 15, 30, 60, 120, 1440].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEventDuration(String(v))}
                    className={cn(
                      "rounded px-3 py-1.5 text-[10px] font-bold transition-colors",
                      eventDuration === String(v) ? "bg-apex-red text-white" : "bg-white/5 text-white/60 hover:bg-white/10",
                    )}
                  >
                    {v >= 60 ? `${v / 60}h` : `${v}m`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={eventDuration}
                onChange={(e) => setEventDuration(e.target.value)}
                max={1440}
                className="mb-2 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                placeholder="Duration in minutes"
              />

              {/* Event label */}
              <input
                type="text"
                value={eventLabel}
                onChange={(e) => setEventLabel(e.target.value.slice(0, 50))}
                maxLength={50}
                className="mb-3 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                placeholder="Event label (e.g. 100x EVENT)"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const mult = Number(eventMultiplier);
                    const dur = Number(eventDuration);
                    if (mult <= 0 || !isFinite(mult)) { toast.error("Invalid multiplier"); return; }
                    if (dur <= 0 || !isFinite(dur)) { toast.error("Invalid duration"); return; }
                    try {
                      await setMultiplierEvent({
                        multiplier: mult,
                        durationMinutes: dur,
                        label: eventLabel.trim().slice(0, 50) || `${mult}x EVENT`,
                      });
                      toast.success("Event activated!");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                  className="rounded-md bg-apex-red px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
                >
                  Activate
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clearMultiplierEvent();
                      toast.success("Event ended");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                  className="rounded-md border border-white/15 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 hover:border-white/30"
                >
                  End Event
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Feedback Inbox ──────────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection
          title="Feedback Inbox"
          icon={Inbox}
          badge={newFeedbackCount > 0 ? `${newFeedbackCount} new` : undefined}
          defaultOpen={false}
        >
          <div className="px-5 py-5">
            {feedback === undefined ? (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Loader2 className="size-4 animate-spin" /> Loading feedback…
              </div>
            ) : feedback.length === 0 ? (
              <p className="text-sm text-white/40">No feedback yet.</p>
            ) : (
              <ul className="divide-y divide-apex-line">
                {feedback.map((f) => (
                  <li key={f._id} className="space-y-2 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-apex-red/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-apex-red">
                            {f.type}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-white/80">{f.message}</p>
                        {f.authorName && (
                          <p className="mt-0.5 text-[10px] text-white/30">— {f.authorName}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <select
                          value={f.status}
                          onChange={(e) =>                          void setFeedbackStatus({ feedbackId: f._id, status: e.target.value as "new" | "read" })}
                          className="cursor-pointer rounded border border-white/[0.08] bg-[#0b0b0c] px-1.5 py-1 text-[10px] text-white outline-none"
                        >
                          <option value="new">New</option>
                          <option value="read">Read</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>                          void deleteFeedback({ feedbackId: f._id })}
                          className="inline-flex size-6 items-center justify-center rounded border border-white/15 text-white/40 hover:border-apex-red hover:text-apex-red"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Site Updates ────────────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection
          title="Site Updates"
          icon={Newspaper}
          defaultOpen={false}
        >
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-white/50">
              Write the update message that everyone sees on the landing page
              above the Hall of Legends. It stays until you change it.
            </p>
          </div>
          <div className="px-5 pb-5">
            <PageEditor
              page="siteUpdates"
              title="Site Updates — Landing Page"
              description="The update notice shown at the top of the landing page above the Hall of Legends. Everyone sees it; only you can change it."
              fields={[
                { key: "updatesEyebrow", label: "Eyebrow label" },
                { key: "updatesTitle", label: "Title" },
                { key: "updatesBody", label: "Body text", multiline: true },
              ]}
              defaults={SITE_UPDATES_COPY}
            />
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Cars Editor ─────────────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection
          title="Cars Editor"
          icon={Car}
          defaultOpen={false}
        >
          <div className="px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-white/50">
                Edit car details (name, price, specs) without touching source code.
                Edits are applied on top of the original data.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Reset ALL car edits? This reverts every override.")) return;
                  try { await resetAllCarEdits(); toast.success("All car edits reset"); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
                }}
                className="rounded border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60 hover:border-apex-red hover:text-apex-red"
              >
                Reset All
              </button>
            </div>

            {/* Car list */}
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {carsList().map((c) => {
                const ov = carOverrides?.[c.slug];
                const hasEdits = ov && Object.values(ov).some((v) => v != null && v !== "");
                return (
                  <div key={c.slug} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/[0.03]">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {c.brand} {c.model} ({c.year})
                        {hasEdits && <span className="ml-1.5 text-[9px] text-apex-red">edited</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCarEditor(c.slug)}
                      className="shrink-0 rounded p-1 text-white/40 hover:text-white"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline editor modal */}
          {editCarSlug && (
            <div className="border-t border-apex-line px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-white">
                  Editing: {editCarSlug}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try { await resetCarEdit({ slug: editCarSlug }); toast.success("Car edits reset"); setEditCarSlug(null); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
                    }}
                    className="rounded border border-white/15 px-2 py-1 text-[10px] font-bold text-white/60 hover:text-white"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCarSlug(null)}
                    className="rounded p-1 text-white/40 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {CAR_EDIT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                      {f.label}
                    </label>
                    {f.multiline ? (
                      <textarea
                        value={editDraft[f.key] ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        rows={4}
                        className="w-full resize-none rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                      />
                    ) : (
                      <input
                        type={f.key === "priceUSD" || f.key === "horsepower" || f.key === "topSpeedKmh" || f.key === "zeroToHundredKmh" ? "number" : "text"}
                        value={editDraft[f.key] ?? ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        placeholder={f.hint ?? ""}
                        className="w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3 py-2 text-sm text-white outline-none focus:border-apex-red"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void saveCarEdits()}
                className="mt-4 rounded-md bg-apex-red px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:opacity-90"
              >
                Save Edits
              </button>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* ── Page Copy Editors ───────────────────────────────────────────── */}
      <div className="mt-12">
        <CollapsibleSection title="Page Copy" icon={Pencil} defaultOpen={false}>
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-white/50">
              Override any on-page text. Leave a field blank to keep the
              default. All changes save automatically.
            </p>
          </div>

          {/* Home page */}
          <div className="px-5 pb-5">
            <PageEditor
              page="home"
              title="Home Page"
              description="Hero section, CTAs, featured cars and marque headings."
              fields={Object.keys(HOME_COPY).map((k) => ({
                key: k,
                label: k,
                multiline: k.includes("Body") || k.includes("body") || k.includes("Slugs"),
              }))}
              defaults={HOME_COPY}
            />
          </div>

          {/* Navigation labels */}
          <div className="px-5 pb-5">
            <PageEditor
              page="nav"
              title="Navigation Labels"
              description="Labels shown in the navigation bar."
              fields={Object.keys(NAV_COPY).map((k) => ({ key: k, label: k }))}
              defaults={NAV_COPY}
            />
          </div>

          {/* Garage page */}
          <div className="px-5 pb-5">
            <PageEditor
              page="garage"
              title="Garage / Machines Page"
              description="Filter labels, headings, and empty states."
              fields={Object.keys(GARAGE_COPY).map((k) => ({ key: k, label: k }))}
              defaults={GARAGE_COPY}
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
