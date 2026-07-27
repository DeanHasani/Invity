import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/lib/supabase";
import { openProCheckout, type BillingCycle } from "@/lib/paddle";
import { useSubscription, awaitProActivation } from "@/hooks/useSubscription";
import { PRICE_MONTHLY_LABEL, PRICE_YEARLY_LABEL } from "@shared/premium";

const LG_FONT = "'Luckiest Guy', cursive";

const PRO_FEATURES = [
  "Unlimited invitations",
  "Links last 30 days (not 8 hours)",
  "All premium designs & effects",
  "Guest lists with CSV export",
];

type Phase = "plan" | "activating" | "slow";

export function UpgradeModal({
  onClose,
  subtitle = "Everything Invity has to offer, for less than a coffee.",
}: {
  onClose: () => void;
  subtitle?: string;
}) {
  const { user, isPro, refetch } = useSubscription();
  const [cycle, setCycle] = useState<BillingCycle>("month");
  const [phase, setPhase] = useState<Phase>("plan");
  const [busy, setBusy] = useState(false);

  // Opened from a page without the Index message listener — close the loop
  // ourselves when the OAuth popup finishes (cross-tab session sync also fires
  // onAuthStateChange, which useSubscription already listens to).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "INVITY_AUTH_DONE") setBusy(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Already Pro (e.g. activated in another tab) — nothing to sell
  useEffect(() => {
    if (isPro && phase === "plan") onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const handleSignIn = async () => {
    setBusy(true);
    try { await signInWithGoogle(); }
    catch { setBusy(false); toast.error("Sign-in failed. Try again."); }
  };

  const handleBuy = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await openProCheckout(cycle, user, async () => {
        setPhase("activating");
        const activated = await awaitProActivation(refetch as any);
        if (activated) {
          toast.success("You're Pro! 🎉 Party without limits.");
          onClose();
        } else {
          setPhase("slow");
        }
      });
    } catch {
      toast.error("Couldn't load checkout — an ad blocker may be interfering.");
    } finally {
      setBusy(false);
    }
  };

  const price = cycle === "month" ? `${PRICE_MONTHLY_LABEL}/MO` : `${PRICE_YEARLY_LABEL}/YR`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={phase === "plan" ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center text-center gap-5 p-8 relative"
        style={{ background: "var(--surface, #1a0800)", border: "2px solid rgba(var(--accent-rgb, 240,90,40),0.45)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/30 hover:text-white transition-colors text-2xl leading-none"
        >
          ×
        </button>

        {phase !== "plan" ? (
          <>
            <div className="text-5xl">{phase === "activating" ? "⏳" : "✅"}</div>
            <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT, color: "var(--accent, #F05A28)" }}>
              {phase === "activating" ? "Activating Pro..." : "Payment received!"}
            </p>
            <p className="text-xs opacity-50 text-white">
              {phase === "activating"
                ? "Hang tight — confirming your subscription."
                : "Pro will unlock within a minute or two. You can keep using Invity meanwhile."}
            </p>
            {phase === "slow" && (
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
                style={{ fontFamily: LG_FONT, border: "1px solid rgba(255,255,255,0.25)" }}
              >
                Close
              </button>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-3xl uppercase" style={{ fontFamily: LG_FONT, color: "var(--accent, #F05A28)" }}>
                Go Pro
              </p>
              <p className="text-xs opacity-50 text-white">{subtitle}</p>
            </div>

            <ul className="w-full space-y-2 text-left">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-white/85">
                  <span style={{ color: "var(--accent, #F05A28)" }}>✔</span>
                  {f}
                </li>
              ))}
            </ul>

            {/* Cycle toggle */}
            <div className="w-full grid grid-cols-2 gap-2">
              {(["month", "year"] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className="py-3 px-2 text-center transition-all"
                  style={{
                    fontFamily: LG_FONT,
                    border: cycle === c
                      ? "2px solid var(--accent, #F05A28)"
                      : "2px solid rgba(255,255,255,0.15)",
                    background: cycle === c ? "rgba(255,255,255,0.06)" : "transparent",
                    color: cycle === c ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                >
                  <span className="block text-lg uppercase leading-none">
                    {c === "month" ? `${PRICE_MONTHLY_LABEL}` : `${PRICE_YEARLY_LABEL}`}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wider mt-1 opacity-70">
                    {c === "month" ? "per month" : "per year · save 44%"}
                  </span>
                </button>
              ))}
            </div>

            {user ? (
              <button
                onClick={handleBuy}
                disabled={busy}
                className="w-full py-4 text-lg font-bold uppercase tracking-wider transition-colors disabled:opacity-60"
                style={{ fontFamily: LG_FONT, background: "var(--accent-fill, #F05A28)", color: "var(--accent-fg, #fff)" }}
              >
                {busy ? "OPENING..." : `GO PRO — ${price}`}
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={busy}
                className="flex items-center gap-3 bg-white text-[#1a1a1a] w-full justify-center px-6 py-4 text-sm font-bold uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: LG_FONT }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                {busy ? "OPENING..." : "SIGN IN TO GO PRO"}
              </button>
            )}

            <p className="text-[10px] opacity-30 text-white">
              Prices in USD — taxes may apply and are calculated at checkout. Secure checkout by
              Paddle. Auto-renews until cancelled. Cancel anytime. 14-day money-back guarantee.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
