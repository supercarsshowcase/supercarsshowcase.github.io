import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petbet-blue">
        Page not found
      </p>
      <h1 className="mt-4 font-display text-8xl font-black tracking-tight text-white">
        404
      </h1>
      <p className="mt-3 text-sm text-petbet-muted">
        This page doesn&apos;t exist.
      </p>
      <Link
        to="/"
        className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-petbet-blue px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-petbet-blue-bright"
      >
        Back to home
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
