import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SignInPanel } from "@/components/SignInPanel";
import { openProCheckout, type BillingCycle } from "@/lib/paddle";
import { useSubscription, awaitProActivation } from "@/hooks/useSubscription";
import { PRICE_MONTHLY_LABEL, PRICE_YEARLY_LABEL } from "@shared/premium";

const LG_FONT = "'Luckiest Guy', cursive";

const PRO_FEATURES = [
  "Unlimited invitations",
  "Links last 30 days (not 5 hours)",
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
              <SignInPanel
                heading="Sign In to Go Pro"
                subheading="Your subscription is tied to this account — sign in first."
              />
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
