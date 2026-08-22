import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { paletteFromSeed } from "@/lib/seed";

interface SmartImageProps {
  src: string;
  alt: string;
  label?: string;
  sublabel?: string;
  accent?: string;
  className?: string;
  /** Deterministic seed that makes the fallback scene unique per car/view. */
  seed?: string;
  /** Short caption shown in the corner of a generated scene. */
  viewLabel?: string;
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
 * Renders a real photo when `src` is provided and loads successfully.
 * Falls back to a deterministic, unique generated "studio" scene so every
 * car and gallery view looks distinct — never a broken-image icon.
 */
export function SmartImage({
  src,
  alt,
  label,
  sublabel,
  accent = "#ff2e00",
  className,
  seed,
  viewLabel,
}: SmartImageProps) {
  const [errored, setErrored] = useState(false);
  const fallbackSeed = seed ?? alt ?? "machine";

  // When the src changes, reset the error state so we try the new image.
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setErrored(false);
  }

  if (!src || errored) {
    return (
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
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
    />
  );
}