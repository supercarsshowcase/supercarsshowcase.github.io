import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { paletteFromSeed } from "@/lib/seed";

interface SmartImageProps {
  src: string;
  alt: string;
  label?: string;
  sublabel?: string;
  accent?: string;
  className?: string;
  imgClassName?: string;
  /** Deterministic seed that makes the fallback scene unique per car/view. */
  seed?: string;
  /** Short caption shown in the corner of a generated scene. */
  viewLabel?: string;
  /** Wikipedia article title used to resolve a real lead image when `src` is missing or fails. */
  resolveTitle?: string;
  /** Width bucket (in px) requested from Wikimedia when resolving the lead image. */
  resolveWidth?: number;
}

function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      className={className}
      fill="none"
      aria-hidden
    >
      {/* body */}
      <path
        d="M22 90
           C23 74 37 64 60 60
           L104 56
           C110 40 132 30 158 32
           C186 34 206 42 224 54
           L258 60
           C284 64 298 73 301 84
           C302 91 296 95 289 95
           L34 95
           C26 95 21 93 22 90 Z"
        fill="currentColor"
      />
      {/* cabin window */}
      <path
        d="M106 55 C118 42 140 35 162 35 C172 36 184 40 192 46 L186 54 C162 44 130 46 114 55 Z"
        fill="rgba(0,0,0,0.35)"
      />
      {/* wheels */}
      <circle cx="80" cy="94" r="14" fill="currentColor" />
      <circle cx="80" cy="94" r="6" fill="#050505" />
      <circle cx="244" cy="94" r="14" fill="currentColor" />
      <circle cx="244" cy="94" r="6" fill="#050505" />
      {/* accent ground line */}
      <path
        d="M30 100 H290"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GeneratedScene({
  label,
  sublabel,
  accent,
  seed,
  viewLabel,
}: {
  label?: string;
  sublabel?: string;
  accent?: string;
  seed: string;
  viewLabel?: string;
}) {
  const palette = useMemo(() => paletteFromSeed(seed), [seed]);

  return (
    <div
      className="relative flex h-full w-full items-end justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
      role="img"
      aria-label={[label, sublabel, viewLabel].filter(Boolean).join(" ")}
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 80% 12%, ${palette.glow} 0%, transparent 55%), radial-gradient(100% 90% at 12% 100%, ${palette.glowSoft} 0%, transparent 55%)`,
        }}
      />
      {/* speed lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background:repeating-linear-gradient(115deg,transparent_0,transparent_42px,rgba(255,255,255,0.7)_43px,transparent_44px)]" />
      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

      {/* silhouette */}
      <CarSilhouette className="relative z-10 mb-2 h-[52%] w-[78%] text-white/85 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />

      {/* labels */}
      {label && (
        <div className="absolute left-3 top-3 z-10">
          <span
            className="font-display text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: accent ?? "#ff2e00" }}
          >
            {label}
          </span>
        </div>
      )}
      {viewLabel && (
        <span className="absolute right-3 top-3 z-10 rounded-sm bg-black/45 px-2 py-1 font-display text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75 backdrop-blur">
          {viewLabel}
        </span>
      )}
      {sublabel && (
        <div className="absolute bottom-3 left-3 z-10 max-w-[80%]">
          <span className="font-display text-sm font-extrabold uppercase tracking-tight text-white/90">
            {sublabel}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * In-flight cache so every card/view for the same article shares one request
 * (and negative results are cached too, avoiding repeat network churn).
 */
const wikiImageCache = new Map<string, Promise<string | null>>();

function fetchWikiLeadImage(
  title: string,
  width: number,
): Promise<string | null> {
  const cacheKey = `${width}::${title}`;
  if (!wikiImageCache.has(cacheKey)) {
    const request = fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title,
      )}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const thumb: unknown = data?.thumbnail?.source;
        if (typeof thumb === "string" && thumb.startsWith("https://")) {
          // Wikimedia only serves its standard thumbnail buckets, so step the
          // ~330px preview up to the requested bucket (e.g. 960px for cards,
          // 1920px for the detail hero).
          return thumb.replace(/\/(\d+)px-/, `/${width}px-`);
        }
        const original: unknown = data?.originalimage?.source;
        return typeof original === "string" && original.startsWith("https://")
          ? original
          : null;
      })
      .catch(() => null);
    wikiImageCache.set(cacheKey, request);
  }
  return wikiImageCache.get(cacheKey) ?? Promise.resolve(null);
}

/**
 * Renders a real image when available and falls back to a deterministic,
 * unique generated "studio" scene so every car and every gallery view looks
 * distinct — never a shared photo or a broken-image icon.
 */
export function SmartImage({
  src,
  alt,
  label,
  sublabel,
  accent = "#ff2e00",
  className,
  imgClassName,
  seed,
  viewLabel,
  resolveTitle,
  resolveWidth = 960,
}: SmartImageProps) {
  const [srcErrored, setSrcErrored] = useState(false);
  const [wikiSrc, setWikiSrc] = useState<string | null>(null);
  const [wikiErrored, setWikiErrored] = useState(false);
  const fallbackSeed = seed ?? alt ?? "machine";

  // Reset error/resolved state whenever the source or article changes.
  useEffect(() => {
    setSrcErrored(false);
    setWikiSrc(null);
    setWikiErrored(false);
  }, [src, resolveTitle, resolveWidth]);

  const needWiki = (!src || srcErrored) && Boolean(resolveTitle);

  useEffect(() => {
    if (!needWiki || !resolveTitle) return;
    let cancelled = false;
    fetchWikiLeadImage(resolveTitle, resolveWidth).then((url) => {
      if (!cancelled) setWikiSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [needWiki, resolveTitle, resolveWidth]);

  const scene = (
    <div className={cn("overflow-hidden bg-apex-ink", className)}>
      <GeneratedScene
        label={label}
        sublabel={sublabel}
        accent={accent}
        seed={fallbackSeed}
        viewLabel={viewLabel}
      />
    </div>
  );

  if (!src || srcErrored) {
    if (wikiSrc && !wikiErrored) {
      return (
        <img
          src={wikiSrc}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setWikiErrored(true)}
          className={cn("object-cover", className, imgClassName)}
        />
      );
    }
    return scene;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setSrcErrored(true)}
      className={cn("object-cover", className, imgClassName)}
    />
  );
}
