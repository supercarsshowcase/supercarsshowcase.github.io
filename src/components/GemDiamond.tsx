import { cn } from "@/lib/utils";

export function GemDiamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("text-petbet-gem", className)}>
      <path d="M12 2L2 9l10 13L22 9l-10-7zm0 2.5L19 9l-7 9.5L5 9l7-4.5z" />
    </svg>
  );
}
