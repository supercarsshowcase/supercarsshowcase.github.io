import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Camera,
  Loader2,
  Check,
  AlertTriangle,
  User,
  Warehouse,
  MessageSquare,
} from "lucide-react";

const ACCENT_PRESETS = [
  { name: "Racing Red", value: "#ff2e00" },
  { name: "Amber", value: "#ff9500" },
  { name: "Lime", value: "#8bd450" },
  { name: "Cyan", value: "#2dd4bf" },
  { name: "Violet", value: "#a78bfa" },
  { name: "Champagne", value: "#e8c98a" },
];

export default function Profile() {
  const { user } = useAuth();
  const updateProfile = useMutation(api.profile.updateProfile);
  const generateUploadUrl = useMutation(api.profile.generateUploadUrl);
  const updateAvatar = useMutation(api.profile.updateAvatar);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [accent, setAccent] = useState("#ff2e00");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Hydrate the form from the current user once (render-time pattern).
  const [prevUser, setPrevUser] = useState(user);
  if (user && user !== prevUser) {
    setPrevUser(user);
    if (!hydrated) {
      setHydrated(true);
      setName(user.name ?? "");
      setBio(user.bio ?? "");
      setAccent(user.accent ?? "#ff2e00");
    }
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 text-center">
        <p className="font-display text-2xl font-black text-white">Sign in to edit your profile</p>
        <Link
          to="/auth"
          className="mt-6 rounded-md bg-apex-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const memberSince = new Date(user._creationTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Max file size is 5 MB.");
      return;
    }
    setAvatarError("");
    setUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed — try again.");
      const { storageId } = (await res.json()) as { storageId: string };
      await updateAvatar({ storageId: storageId as Id<"_storage"> });
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Upload failed — try again.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Your name can't be empty.");
      setStatus("error");
      return;
    }
    setSaving(true);
    setStatus("idle");
    setError("");
    try {
      await updateProfile({ name, bio, accent });
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          <span className="inline-block size-1.5 rounded-full bg-apex-red" /> Your identity
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          PROFILE
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-apex-muted">
          Your name and picture follow you across the site — on the feedback
          wall, your garage, and in the owner&apos;s records. Make it yours.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* Avatar card */}
        <section className="h-fit rounded-lg border border-apex-line bg-apex-panel p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                className="flex size-28 items-center justify-center overflow-hidden rounded-full border-2 bg-apex-ink"
                style={{ borderColor: accent }}
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "Profile"}
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="font-display text-4xl font-black" style={{ color: accent }}>
                    {initial}
                  </span>
                )}
              </div>
              <label
                className="absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black text-white/85 transition-colors hover:border-apex-red hover:text-apex-red"
                title="Change photo"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </label>
            </div>
            {avatarError && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-apex-red">
                <AlertTriangle className="size-3.5" /> {avatarError}
              </p>
            )}

            <h2 className="mt-5 font-display text-xl font-black tracking-tight text-white">
              {user.name ?? "You"}
            </h2>
            <p className="mt-1 text-sm text-white/45">{user.email}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/30">
              Member since {memberSince}
            </p>

            {user.bio && (
              <p className="mt-4 rounded-md border border-apex-line bg-apex-ink px-4 py-3 text-sm leading-6 text-white/65">
                {user.bio}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-apex-line pt-5">
            <Link
              to="/my-garage"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
            >
              <Warehouse className="size-4" /> My garage
            </Link>
            <Link
              to="/feedback"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-apex-red hover:text-white"
            >
              <MessageSquare className="size-4" /> Give feedback
            </Link>
          </div>
        </section>

        {/* Edit form */}
        <section className="rounded-lg border border-apex-line bg-apex-panel p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.16em] text-white">
              <User className="size-4 text-apex-red" /> Edit details
            </h2>
            {status === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {/* Name */}
            <div>
              <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="How the archive should call you"
                className="mt-2 w-full rounded-md border border-white/10 bg-[#0b0b0c] px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Bio <span className="normal-case text-white/25">— shown on your notes</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="e.g. Petrolhead since 2009. V12s only."
                className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0b0b0c] px-3.5 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
              />
              <p className="mt-1 text-right text-[11px] text-white/30">{bio.length}/160</p>
            </div>

            {/* Accent */}
            <div>
              <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Accent color <span className="normal-case text-white/25">— rings your avatar</span>
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

            {error && (
              <p className="flex items-center gap-1.5 rounded-md border border-apex-red/30 bg-apex-red/10 px-3 py-2 text-xs text-apex-red">
                <AlertTriangle className="size-3.5" /> {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-apex-red px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:brightness-110 disabled:opacity-50 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="size-4" /> Save changes
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
