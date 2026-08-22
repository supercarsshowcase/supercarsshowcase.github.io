import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Loader2, Check, AlertTriangle, RefreshCcw } from "lucide-react";

export interface PageField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

export function PageEditor({
  page,
  title,
  description,
  fields,
  defaults,
}: {
  page: string;
  title: string;
  description: string;
  fields: PageField[];
  defaults: Record<string, string>;
}) {
  const content = useQuery(api.pages.getPageContent, { page });
  const save = useMutation(api.pages.savePageContent);
  const reset = useMutation(api.pages.resetPageContent);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [busy, setBusy] = useState(false);

  // Hydrate the form when the page content first arrives (render-time pattern).
  const [prevContent, setPrevContent] = useState<Record<string, string> | undefined>(content);
  if (content && content !== prevContent) {
    setPrevContent(content);
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = content[f.key] ?? defaults[f.key] ?? "";
    setDraft(next);
    setHydrated(true);
    setStatus("saved");
  }

  const changed = hydrated
    ? fields.some(
        (f) => (content?.[f.key] ?? defaults[f.key] ?? "") !== (draft[f.key] ?? ""),
      )
    : false;

  useEffect(() => {
    if (!hydrated || !changed) return;
    const timer = setTimeout(() => {
      const payload: Record<string, string> = {};
      for (const f of fields) {
        const value = (draft[f.key] ?? "").trim();
        // Only persist fields that differ from the default; empty = default.
        if (value !== (defaults[f.key] ?? "")) payload[f.key] = value;
      }
      void (async () => {
        try {
          await save({ page, fields: payload });
          setStatus("saved");
        } catch (e) {
          setStatus("error");
          toast.error(e instanceof Error ? e.message : "Could not save");
        }
      })();
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hydrated, changed]);

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await reset({ page });
      toast.success("Page restored to defaults");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-apex-line bg-apex-panel">
      <div className="flex items-center justify-between border-b border-apex-line px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-white">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {hydrated && (
            <span
              className={
                status === "error"
                  ? "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-apex-red"
                  : "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40"
              }
            >
              {status === "error" ? (
                <>
                  <AlertTriangle className="size-3.5" /> Save failed
                </>
              ) : changed ? (
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
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={busy || !hydrated}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-white/55 transition-colors hover:border-apex-red hover:text-apex-red disabled:opacity-40"
          >
            <RefreshCcw className="size-3" /> Restore defaults
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="mb-5 text-sm text-apex-muted">{description}</p>

        {content === undefined ? (
          <div className="flex items-center gap-2 py-6 text-sm text-white/50">
            <Loader2 className="size-4 animate-spin" /> Loading page copy…
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                <label className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    value={draft[f.key] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                    }
                    rows={3}
                    maxLength={600}
                    placeholder={defaults[f.key]}
                    className="mt-2 w-full resize-none rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
                  />
                ) : (
                  <input
                    type="text"
                    value={draft[f.key] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                    }
                    maxLength={120}
                    placeholder={defaults[f.key]}
                    className="mt-2 w-full rounded-md border border-white/[0.08] bg-[#0b0b0c] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-apex-red"
                  />
                )}
                {f.hint && (
                  <p className="mt-1.5 text-[11px] text-white/25">{f.hint}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
