import { useEffect, useState } from "react";
import { SignInPanel } from "@/components/SignInPanel";
import { supabase } from "@/lib/supabase";
import { readStoredTheme, themeVars } from "@/lib/theme";

const LG_FONT = "'Luckiest Guy', cursive";

/**
 * Only same-origin relative paths are allowed through. `next` comes off the
 * query string, so anything else is an open redirect.
 */
function safeNext(): string {
  const raw = new URLSearchParams(window.location.search).get("next") ?? "/";
  return /^\/(?!\/)/.test(raw) ? raw : "/";
}

/**
 * Standalone sign-in page. Built as its own Vite entry rather than a SPA route
 * so crawlers get real HTML with its own title and canonical. The SPA
 * catch-all would otherwise serve them the homepage shell.
 *
 * The in-flow modal still exists and is still the primary path: it keeps the
 * half-filled invitation on screen, which navigating here would discard.
 */
export default function SignIn() {
  const theme = readStoredTheme();
  const [checking, setChecking] = useState(true);

  // Already signed in (another tab, or arrived by bookmark), so don't make them
  // sign in twice, just send them on.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous && session.user.email) {
        window.location.replace(safeNext());
      } else {
        setChecking(false);
      }
    });
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-8"
      style={{
        ...themeVars(theme),
        background: "var(--brand)",
        fontFamily: "'Montserrat', sans-serif",
        color: "#fff",
      } as React.CSSProperties}
    >
      <a href="/" className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
        <img src="/brand/invity-mark-white.svg" alt="" width={56} height={56} />
        <span className="text-3xl uppercase tracking-wide" style={{ fontFamily: LG_FONT }}>
          Invity
        </span>
      </a>

      <div
        className="w-full max-w-sm flex flex-col items-center text-center gap-6 p-8"
        style={{ background: "var(--surface)", border: "2px solid rgba(var(--accent-rgb),0.45)" }}
      >
        {checking ? (
          <p className="text-sm uppercase tracking-widest opacity-50" style={{ fontFamily: LG_FONT }}>
            Loading...
          </p>
        ) : (
          <>
            <SignInPanel
              heading="Sign In"
              subheading="Sign in to create invitations and track your RSVPs."
              onSignedIn={() => window.location.assign(safeNext())}
            />
            <p className="text-[10px] opacity-30">
              We only use your email to send RSVP notifications.
            </p>
          </>
        )}
      </div>

      <a href="/" className="text-[11px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
        ← Back to Invity
      </a>
    </div>
  );
}
