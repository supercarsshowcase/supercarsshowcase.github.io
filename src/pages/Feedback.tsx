import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Lightbulb,
  Sparkles,
  Bug,
  Heart,
  MessageSquare,
  Send,
  Check,
  Loader2,
  Car,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CARS, carBySlug } from "@/data/cars";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES = [
  { key: "idea", label: "Idea", hint: "Something we should build", icon: Lightbulb },
  { key: "suggestion", label: "Suggestion", hint: "What to add next", icon: Sparkles },
  { key: "bug", label: "Bug", hint: "Something looks broken", icon: Bug },
  { key: "praise", label: "Praise", hint: "What you love", icon: Heart },
  { key: "other", label: "Other", hint: "Anything else", icon: MessageSquare },
] as const;

const FEEDBACK_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  idea: { label: "Idea", className: "border-amber-300/30 bg-amber-300/10 text-amber-300" },
  suggestion: { label: "Suggestion", className: "border-sky-300/30 bg-sky-300/10 text-sky-300" },
  bug: { label: "Bug", className: "border-rose-300/30 bg-rose-300/10 text-rose-300" },
  praise: { label: "Praise", className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-300" },
  other: { label: "Other", className: "border-white/20 bg-white/5 text-white/70" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

const QUICK_IDEAS = [
  "Add an engine-reel with real sound for every machine.",
  "Let me generate a shareable poster card for my favorite car.",
  "Show which cars appeared in which movies and shows.",
  "Add a night-mode wallpaper download for each car.",
];

export default function Feedback() {
  const { user } = useAuth();
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const publicFeedback = useQuery(api.feedback.listPublicFeedback);

  const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]["key"]>("idea");
  const [carSlug, setCarSlug] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = message.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        carSlug: carSlug || undefined,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setMessage("");
    setCarSlug("");
    setType("idea");
    setError("");
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          <span className="inline-block size-1.5 rounded-full bg-apex-red" /> Have a say
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          FEEDBACK
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-apex-muted">
          Tell us what to add, what to fix, or what you love about the archive.
          Every note lands straight in the owner&apos;s inbox.
        </p>
      </div>

      {submitted ? (
        <div className="mx-auto max-w-xl rounded-lg border border-apex-line bg-apex-panel p-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-apex-red/15 text-apex-red">
            <Check className="size-7" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-black tracking-tight text-white">
            THANK YOU
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Your {FEEDBACK_TYPES.find((t) => t.key === type)?.label.toLowerCase()} has been
            logged. The garage keeps the good ideas — keep them coming.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-apex-red hover:text-white"
            >
              <MessageSquare className="size-4" /> Send another
            </button>
            <Link
              to="/garage"
              className="inline-flex items-center gap-2 rounded-md bg-apex-red px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:brightness-110"
            >
              Back to the garage <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Form */}
          <section className="rounded-lg border border-apex-line bg-apex-panel p-6 sm:p-8">
            {/* Type */}
            <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              What is this about?
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FEEDBACK_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-md border px-3.5 py-3 text-left transition-colors",
                    type === t.key
                      ? "border-apex-red bg-apex-red/10"
                      : "border-white/10 hover:border-white/25",
                  )}
                >
                  <t.icon
                    className={cn(
                      "size-4",
                      type === t.key ? "text-apex-red" : "text-white/50",
                    )}
                  />
                  <span
                    className={cn(
                      "font-display text-xs font-bold uppercase tracking-[0.12em]",
                      type === t.key ? "text-white" : "text-white/70",
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="text-[10px] leading-4 text-white/35">{t.hint}</span>
                </button>
              ))}
            </div>

            {/* Optional car */}
            <label className="mt-7 flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              <Car className="size-3.5" /> About a specific machine? <span className="normal-case text-white/25">(optional)</span>
            </label>
            <select
              value={carSlug}
              onChange={(e) => setCarSlug(e.target.value)}
              className="mt-2 h-11 w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-[#0b0b0c] px-3.5 font-display text-sm font-semibold tracking-tight text-white outline-none transition-colors hover:border-white/25 focus:border-apex-red"
            >
              <option value="" className="bg-[#0b0b0c] text-white/60">
                No specific machine
              </option>
              {CARS.map((c) => (
                <option key={c.slug} value={c.slug} className="bg-[#0b0b0c] text-white">
                  {c.brand} {c.model} · {c.year}
                </option>
              ))}
            </select>

            {/* Message */}
            <label className="mt-7 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="e.g. Add the Mercedes-AMG One's full track telemetry, or a night-mode wallpaper for every car…"
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#0b0b0c] px-3.5 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-white/30">
                {user?.name ? `Signed in as ${user.name}` : "Signed in"}
              </span>
              <span
                className={cn(
                  "text-[11px]",
                  message.length > 950 ? "text-apex-red" : "text-white/30",
                )}
              >
                {message.length}/1000
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded-md border border-apex-red/30 bg-apex-red/10 px-3 py-2 text-xs text-apex-red">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-apex-red px-5 py-3.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" /> Send feedback
                </>
              )}
            </button>
          </section>

          {/* Side card */}
          <aside className="flex flex-col gap-6">
            <section className="rounded-lg border border-apex-line bg-apex-panel p-6">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                Need a starting point?
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Tap an idea to drop it in — then make it yours.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {QUICK_IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setMessage(idea)}
                    className="rounded-md border border-white/10 px-3.5 py-3 text-left text-[13px] leading-5 text-white/70 transition-colors hover:border-apex-red/50 hover:text-white"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-apex-line bg-apex-panel p-6">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">
                What happens next
              </h2>
              <ul className="mt-4 flex flex-col gap-3 text-sm leading-6 text-white/50">
                <li className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-apex-red" />
                  Your note appears on the community wall below — everyone can
                  see it, with your name attached.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-apex-red" />
                  Popular requests get built first — real ideas shape the garage.
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-apex-red" />
                  No spam, no replies promised — just a direct line to the owner.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      {/* Community wall — everything people have submitted */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
              <span className="inline-block size-1.5 rounded-full bg-apex-red" />
              From the community
            </p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              WHAT PEOPLE WANT
            </h2>
          </div>
          {publicFeedback && (
            <span className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {publicFeedback.length} note
              {publicFeedback.length === 1 ? "" : "s"} on the wall
            </span>
          )}
        </div>

        {publicFeedback === undefined ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="size-4 animate-spin" /> Loading the wall…
          </div>
        ) : publicFeedback.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-apex-line px-6 py-12 text-center text-sm text-white/35">
            No notes yet. Be the first to put an idea on the wall.
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {publicFeedback.map((f) => {
              const badge = FEEDBACK_BADGE[f.type] ?? FEEDBACK_BADGE.other;
              const car = f.carSlug ? carBySlug(f.carSlug) : undefined;
              return (
                <li
                  key={f._id}
                  className="flex flex-col rounded-lg border border-apex-line bg-apex-panel p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-sm border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em]",
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="truncate text-[11px] text-white/35">
                      {f.authorName} · {timeAgo(f.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
                    {f.message}
                  </p>
                  {car && (
                    <Link
                      to={`/cars/${car.slug}`}
                      className="mt-3 inline-flex items-center gap-1 self-start font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-apex-red transition-colors hover:text-white"
                    >
                      About: {car.brand} {car.model}{" "}
                      <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
