import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { paletteFromSeed } from "@/lib/seed";

interface SmartImageProps {
  src: string;
  alt: string;
  label?: string;
  sublabel?: string;
  accent?: string;
  className?: string;
  seed?: string;
  viewLabel?: string;
}

/** Total <img> attempts before giving up to the generated scene. */
const MAX_ATTEMPTS = 3;
/** If a request hasn't even started this long, assume the connection stalled and retry. */
const HANG_TIMEOUT_MS = 8000;
/**
 * Backoff before each retry (indexed by attempt). Retrying instantly after a
 * rate-limit (429) just gets rate-limited again — spacing retries out lets the
 * limit cool down, so burst-loaded grids eventually fill in.
 */
const RETRY_DELAYS_MS = [800, 4000, 15000];
/** After giving up, wait this long before trying the image again automatically. */
const RECOVERY_MS = 60000;
/** Load images this far outside the viewport so scrolling feels instant. */
const VIEW_MARGIN = "400px 0px";
/** Minimum gap between the start of each image request, to avoid tripping the host's rate limiter. */
const REQUEST_GAP_MS = 100;

let lastRequestAt = 0;
function scheduleRequest(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + REQUEST_GAP_MS - now);
  lastRequestAt = Math.max(now, lastRequestAt + REQUEST_GAP_MS);
  return new Promise((resolve) => setTimeout(resolve, wait));
}

/**
 * Wikimedia rate-limits bursts (429) on shared IPs, which is why whole grids
 * of photos can fail to load. wsrv.nl is a free image proxy that serves the
 * same files from its own cache — used as the retry path, and remembered per
 * URL so later views go straight to it.
 */
const PROXY_BASE = "https://wsrv.nl/";
const PROXY_PREFERRED = new Set<string>();

function proxiedSrc(src: string): string {
  return `${PROXY_BASE}?url=${encodeURIComponent(src)}&w=960`;
}

function CarSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 120" className={className} fill="none" aria-hidden>
      <path
        d="M22 90 C23 74 37 64 60 60 L104 56 C110 40 132 30 158 32 C186 34 206 42 224 54 L258 60 C284 64 298 73 301 84 C302 91 296 95 289 95 L34 95 C26 95 21 93 22 90 Z"
        fill="currentColor"
      />
      <path
        d="M106 55 C118 42 140 35 162 35 C172 36 184 40 192 46 L186 54 C162 44 130 46 114 55 Z"
        fill="rgba(0,0,0,0.35)"
      />
      <circle cx="80" cy="94" r="14" fill="currentColor" />
      <circle cx="80" cy="94" r="6" fill="#050505" />
      <circle cx="244" cy="94" r="14" fill="currentColor" />
      <circle cx="244" cy="94" r="6" fill="#050505" />
      <path d="M30 100 H290" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
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
      style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}
      role="img"
      aria-label={[label, sublabel, viewLabel].filter(Boolean).join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 80% 12%, ${palette.glow} 0%, transparent 55%), radial-gradient(100% 90% at 12% 100%, ${palette.glowSoft} 0%, transparent 55%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background:repeating-linear-gradient(115deg,transparent_0,transparent_42px,rgba(255,255,255,0.7)_43px,transparent_44px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
      <CarSilhouette className="relative z-10 mb-2 h-[52%] w-[78%] text-white/85 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
      {label && (
        <div className="absolute left-3 top-3 z-10">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent ?? "#ff2e00" }}>
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
          <span className="font-display text-sm font-extrabold uppercase tracking-tight text-white/90">{sublabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Reliable photo-with-placeholder. The generated scene always renders behind;
 * the real photo mounts only once the container is near the viewport (no
 * `loading="lazy"`, which can defer requests indefinitely inside embedded
 * previews). Failures retry with backoff — a transient rate-limit (429) or
 * dropped connection recovers instead of leaving a permanent silhouette, and
 * after a full give-up the image re-tries itself a minute later.
 */
export function SmartImage({ src, alt, label, sublabel, accent = "#ff2e00", className, seed, viewLabel }: SmartImageProps) {
  const fallbackSeed = seed ?? alt ?? "machine";

  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imgReady, setImgReady] = useState(false);

  // Reset when the requested image changes (render-time adjust, not an effect).
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setAttempt(0);
    setLoaded(false);
    setStarted(false);
    setFailed(false);
    setImgReady(false);
  }
  // A retry is a fresh request — the hang timer must apply to it too.
  const [prevAttempt, setPrevAttempt] = useState(attempt);
  if (prevAttempt !== attempt) {
    setPrevAttempt(attempt);
    setStarted(false);
  }

  // Watch the container: once it nears the viewport, mount the <img> eagerly.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: VIEW_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Direct first; retries go through the proxy (and once a URL proves it
  // needs the proxy, every later view of it uses the proxy straight away).
  const useProxy = PROXY_PREFERRED.has(src) || attempt >= 1;
  const effectiveSrc = useProxy ? proxiedSrc(src) : src;

  const giveUp = attempt >= MAX_ATTEMPTS;
  const showImg = inView && src.length > 0 && !giveUp && !failed && imgReady;
  // Only consider the request stuck if it never even started. Once the
  // browser is actively downloading (loadstart), a slow-but-progressing
  // photo is left alone — remounting it would kill the request and restart.
  const hanging = showImg && !loaded && !started;

  // Stagger the first request of each image so whole grids don't burst the
  // host with 30+ simultaneous connections (which gets rate-limited).
  useEffect(() => {
    if (!inView || giveUp || failed || imgReady || src.length === 0) return;
    let alive = true;
    scheduleRequest().then(() => {
      if (alive) setImgReady(true);
    });
    return () => {
      alive = false;
    };
  }, [inView, giveUp, failed, imgReady, src]);

  // If a mounted request never starts (stalled connection, throttled request),
  // retry it so the photo can't stay stuck behind the placeholder.
  useEffect(() => {
    if (!hanging) return;
    const t = setTimeout(() => setAttempt((a) => a + 1), HANG_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [hanging, attempt, src]);

  // Retry with backoff after a failure — instant retries just get rate-limited again.
  useEffect(() => {
    if (!failed) return;
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    const t = setTimeout(() => {
      setFailed(false);
      setAttempt((a) => a + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [failed, attempt, src]);

  // After giving up entirely, try again later instead of staying dead forever.
  useEffect(() => {
    if (!giveUp) return;
    const t = setTimeout(() => setAttempt(0), RECOVERY_MS);
    return () => clearTimeout(t);
  }, [giveUp, src]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-apex-ink", className)}>
      {/* Placeholder layer — always present, covered by the photo when it loads */}
      <GeneratedScene label={label} sublabel={sublabel} accent={accent} seed={fallbackSeed} viewLabel={viewLabel} />

      {showImg ? (
        <img
          key={`${effectiveSrc}:${attempt}`}
          src={effectiveSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          className="absolute inset-0 z-10 h-full w-full object-cover"
          onLoadStart={() => setStarted(true)}
          onLoad={() => {
            if (useProxy) PROXY_PREFERRED.add(src);
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
