import { Component, type ReactNode } from "react";
import { THEME_COLORS, readStoredTheme } from "@/lib/theme";

const LG_FONT = "'Luckiest Guy', cursive";

/**
 * Catches render crashes so they show a branded recovery screen instead of a
 * blank white page. This matters most on the invitation view: that's a guest who
 * was sent a link, and a white screen reads as "this invitation is broken".
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Kept as console.error deliberately: there's no error reporting service
    // wired up yet, so this is the only trace a crash leaves.
    console.error("[invity] render crash:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const brand = THEME_COLORS[readStoredTheme()].hex;

    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center text-center gap-5 p-8 text-white select-none"
        style={{ background: brand, fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="text-6xl">🎈</div>
        <h1 className="text-4xl md:text-5xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
          That didn't load
        </h1>
        <p className="text-sm opacity-70 max-w-xs">
          Something broke on our end. Reloading usually fixes it.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-1">
          <button
            onClick={() => window.location.reload()}
            className="bg-white px-8 py-4 text-lg uppercase tracking-wider hover:bg-white/90 transition-colors"
            style={{ fontFamily: LG_FONT, color: brand }}
          >
            Reload
          </button>
          <a
            href="/"
            className="px-8 py-4 text-lg uppercase tracking-wider transition-colors hover:bg-white/10"
            style={{ fontFamily: LG_FONT, border: "2px solid rgba(255,255,255,0.5)", color: "#fff" }}
          >
            Start over
          </a>
        </div>
      </div>
    );
  }
}
