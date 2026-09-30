import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. A crash anywhere in the tree (a throwing Convex
 * subscription, a rendering bug) previously unmounted the whole app — the
 * user got a white page plus a pile of cryptic DOM commit errors. This
 * contains the failure to a readable full-screen fallback instead, with a
 * reload as the recovery path.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for the Freebuff/Vly console instrumentation to capture.
    console.error("App crash contained by boundary:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center">
          <span className="font-display text-3xl font-black uppercase tracking-tight text-white">
            The engine stalled
          </span>
          <p className="max-w-md text-sm text-white/60">
            Something went wrong while rendering the site. Your data is safe —
            reloading usually gets everything back on the road.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[#ff2e00] px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#e02a00]"
          >
            Reload the site
          </button>
          <pre className="max-w-xl overflow-auto rounded-md bg-white/5 p-3 text-left text-[11px] text-white/40">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
