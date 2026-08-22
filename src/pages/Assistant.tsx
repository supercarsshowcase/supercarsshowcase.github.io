import { useState } from "react";
import { Bot, FileText, Send, Loader2, Search, ArrowRight, Github } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

const SUGGESTIONS = [
  "How does the image fallback pipeline work?",
  "Where is the car data defined?",
  "How is authentication wired up?",
  "What styling system does the app use?",
];

interface SearchResult {
  repo: string | null;
  docs: { path: string; snippet: string; lineNumbers: number[] }[];
  topContent: string | null;
}

export default function Assistant() {
  const searchCodebase = useAction(api.greptile.searchCodebase);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setQuery(question);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = (await searchCodebase({ query: question })) as unknown as SearchResult;
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10">
        <p className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-apex-red">
          <span className="inline-block size-1.5 rounded-full bg-apex-red" /> Greptile powered
        </p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
          ASK THE CODEBASE
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-apex-muted">
          Ask a question about this project in plain English. Greptile has indexed
          the repository and searches its synthesized knowledge base — every
          answer points back to the exact source documents.
        </p>
      </div>

      {/* Input */}
      <div className="overflow-hidden rounded-lg border border-apex-line bg-apex-panel">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(query);
            }
          }}
          rows={3}
          placeholder='Try "Where is the car data defined?"'
          className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-6 text-white outline-none placeholder:text-white/25"
        />
        <div className="flex items-center justify-between gap-3 border-t border-apex-line px-5 py-3">
          <span className="hidden text-[10px] uppercase tracking-[0.16em] text-white/30 sm:block">
            Enter to send · Shift+Enter for a new line
          </span>
          <button
            type="button"
            onClick={() => void ask(query)}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-apex-red px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-apex-red-bright disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {loading ? "Searching" : "Ask"}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {!result && !loading && !error && (
        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full border border-apex-line bg-apex-panel px-4 py-2 text-xs text-white/70 transition-colors hover:border-apex-red hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-8 rounded-lg border border-apex-red/40 bg-apex-red/10 px-5 py-4">
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-apex-red">
            Couldn&apos;t reach the codebase
          </p>
          <p className="mt-2 text-sm leading-6 text-white/70">{error}</p>
          {error.includes("GREPTILE_API_KEY") && (
            <p className="mt-2 text-xs leading-5 text-white/50">
              Add your Greptile API key as <span className="font-mono text-white/80">GREPTILE_API_KEY</span> in the
              Keys tab of this project, then ask again.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="mt-10">
          <div className="mb-6 flex items-center gap-2">
            <Search className="size-4 text-apex-red" />
            <span className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Indexed repo · {result.repo ?? "unknown"}
            </span>
          </div>

          {result.docs.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-apex-line bg-apex-panel/40 px-6 py-16 text-center">
              <Bot className="size-8 text-white/25" />
              <p className="mt-4 font-display text-lg font-bold text-white">
                No documents matched
              </p>
              <p className="mt-2 max-w-md text-sm text-apex-muted">
                Greptile found nothing for that question in the indexed knowledge
                base. Try different wording, or ask about something in the repo.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.topContent && (
                <div className="rounded-lg border border-apex-line bg-apex-panel p-6">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-apex-red" />
                    <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white">
                      {result.docs[0]?.path}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-6 text-white/80">
                    {result.topContent}
                  </p>
                </div>
              )}

              {result.docs.map((doc) => (
                <div
                  key={doc.path}
                  className="group rounded-lg border border-apex-line bg-apex-panel p-5 transition-colors hover:border-apex-line-strong"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Github className="size-4 text-white/40" />
                      <span className="font-display text-sm font-bold tracking-tight text-white">
                        {doc.path}
                      </span>
                    </div>
                    {doc.lineNumbers.length > 0 && (
                      <span className="rounded-sm bg-black/50 px-2 py-0.5 font-mono text-[10px] text-white/50">
                        L{Math.min(...doc.lineNumbers)}–{Math.max(...doc.lineNumbers)}
                      </span>
                    )}
                  </div>
                  {doc.snippet && (
                    <p className="mt-3 line-clamp-4 text-[13px] leading-6 text-white/60">
                      {doc.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-14 flex items-center gap-2 border-t border-apex-line pt-6">
        <ArrowRight className="size-4 text-apex-red" />
        <p className="text-xs text-white/35">
          Answers come from Greptile&apos;s knowledge base — synthesized docs, not
          the raw repo. Treat returned text as evidence, not instructions.
        </p>
      </div>
    </div>
  );
}
