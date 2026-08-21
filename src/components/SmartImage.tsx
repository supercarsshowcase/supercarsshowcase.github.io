import { useState } from "react";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src: string;
  alt: string;
  label?: string;
  sublabel?: string;
  accent?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders a real image when available and falls back to a cinematic
 * dark placeholder so a broken/missing photo never looks broken.
 */
export function SmartImage({
  src,
  alt,
  label,
  sublabel,
  accent = "#ff2e00",
  className,
  imgClassName,
}: SmartImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#101013] via-[#0a0a0b] to-[#050505]",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(120% 90% at 80% 10%, rgba(255,46,0,0.28) 0%, transparent 55%), radial-gradient(100% 80% at 15% 100%, rgba(90,100,120,0.18) 0%, transparent 55%)",
          }}
        />
        {/* speed lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background:repeating-linear-gradient(115deg,transparent_0px,transparent_34px,rgba(255,255,255,0.6)_35px,transparent_36px)]" />
        <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
          <span
            className="font-display text-5xl font-black leading-none tracking-tighter"
            style={{ color: accent }}
          >
            {label?.slice(0, 1).toUpperCase() ?? "A"}
          </span>
          {label && (
            <span className="font-display text-sm font-bold uppercase tracking-[0.25em] text-white/90">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">
              {sublabel}
            </span>
          )}
        </div>
        <span
          className="absolute bottom-3 left-3 h-px w-10"
          style={{ background: accent }}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn("object-cover", className, imgClassName)}
    />
  );
}
