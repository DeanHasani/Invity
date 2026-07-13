import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FloatingPhrases } from "@/components/FloatingPhrases";
import { useSubscription, awaitProActivation } from "@/hooks/useSubscription";
import { supabase, signInWithGoogle } from "@/lib/supabase";
import { openProCheckout, type BillingCycle } from "@/lib/paddle";
import { PRICE_MONTHLY_LABEL, PRICE_YEARLY_LABEL } from "@shared/premium";

const LG_FONT = "'Luckiest Guy', cursive";

const THEME_COLORS: Record<string, { hex: string; rgb: string }> = {
  orange:   { hex: "#F05A28", rgb: "240,90,40" },
  sky:      { hex: "#0284C7", rgb: "2,132,199" },
  teal:     { hex: "#14B8A6", rgb: "20,184,166" },
  warmgray: { hex: "#7C6A5E", rgb: "124,106,94" },
};

const ROWS: Array<{ label: string; free: string; pro: string }> = [
  { label: "Invitations per day", free: "2",       pro: "Unlimited" },
  { label: "Link lifetime",       free: "8 hours", pro: "30 days" },
  { label: "Designs",             free: "8 core",  pro: "All 12" },
  { label: "Title effects",       free: "4 core",  pro: "All 7" },
  { label: "RSVP email alerts",   free: "✔",       pro: "✔" },
  { label: "Guest lists + CSV export", free: "—",  pro: "✔" },
];

export default function Pricing() {
  const [theme] = useState(() => {
    const t = localStorage.getItem("invity_theme") ?? "orange";
    return THEME_COLORS[t] ?? THEME_COLORS.orange;
  });
  const { user, isPro, currentPeriodEnd, cancelScheduled, refetch } = useSubscription();
  const [cycle, setCycle] = useState<BillingCycle>("year");
  const [buyBusy, setBuyBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const pendingBuyRef = useRef(false);

  const handleBuy = async (buyUser: { id: string; email: string }) => {
    setBuyBusy(true);
    try {
      await openProCheckout(cycle, buyUser, async () => {
        setActivating(true);
        const ok = await awaitProActivation(refetch as any);
        if (ok) toast.success("You're Pro! 🎉 Party without limits.");
        else toast("Payment received — Pro unlocks within a minute or two.");
        setActivating(false);
      });
    } catch {
      toast.error("Couldn't load checkout — an ad blocker may be interfering.");
    } finally {
      setBuyBusy(false);
    }
  };

  // Signed-out visitors: GO PRO first runs the Google popup, then continues
  // into checkout automatically once the session lands.
  useEffect(() => {
    if (user && pendingBuyRef.current) {
      pendingBuyRef.current = false;
      handleBuy(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGoPro = async () => {
    if (activating || buyBusy) return;
    if (!user) {
      pendingBuyRef.current = true;
      setBuyBusy(true);
      try { await signInWithGoogle(); }
      catch { pendingBuyRef.current = false; toast.error("Sign-in failed. Try again."); }
      finally { setBuyBusy(false); }
      return;
    }
    handleBuy(user);
  };

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-portal", { body: {} });
      if (error || !data?.url) throw error ?? new Error("no url");
      window.open(data.url, "_blank", "noopener");
    } catch {
      toast.error("Couldn't open the billing portal. Try again.");
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full text-white flex flex-col select-none relative overflow-x-hidden"
      style={{
        fontFamily: "'Montserrat', sans-serif",
        backgroundColor: theme.hex,
        "--brand": theme.hex,
        "--brand-mid": `rgba(${theme.rgb},0.45)`,
      } as React.CSSProperties}
    >
      <FloatingPhrases active />

      {/* Back */}
      <div className="relative z-10 px-6 pt-6">
        <Link
          to="/"
          className="text-[22px] uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity"
          style={{ fontFamily: LG_FONT }}
        >
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-16 pt-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="space-y-2">
            <h1
              className="text-4xl md:text-6xl uppercase tracking-tight leading-none"
              style={{ fontFamily: LG_FONT }}
            >
              Invity Pro
            </h1>
            <p className="text-base opacity-80">
              Invity is free forever — two links a day, party on. Invity Pro removes every limit.
            </p>
          </div>

          {/* Comparison */}
          <div className="border-2 border-white/40 bg-black/20 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-white/40">
                  <th className="text-left p-4" />
                  <th className="p-4 text-base uppercase" style={{ fontFamily: LG_FONT }}>Free</th>
                  <th className="p-4 text-base uppercase" style={{ fontFamily: LG_FONT }}>
                    Invity Pro ⭐
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(r => (
                  <tr key={r.label} className="border-b border-white/15 last:border-0">
                    <td className="p-4 font-bold text-[13px] uppercase tracking-wide opacity-85">{r.label}</td>
                    <td className="p-4 text-center opacity-70">{r.free}</td>
                    <td className="p-4 text-center font-bold">{r.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isPro ? (
            <div className="space-y-3">
              <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT }}>
                ⭐ You're Pro!
              </p>
              {currentPeriodEnd && (
                <p className="text-sm opacity-70">
                  {cancelScheduled ? "Pro ends" : "Renews"} on{" "}
                  {new Date(currentPeriodEnd).toLocaleDateString()}.
                </p>
              )}
              <button
                onClick={openPortal}
                disabled={portalBusy}
                className="bg-white text-xl py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: LG_FONT, color: theme.hex }}
              >
                {portalBusy ? "OPENING..." : "Manage Subscription"}
              </button>
            </div>
          ) : (
            <>
              {/* Plan picker — exact prices must match the Paddle checkout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {([
                  { id: "month" as const, tag: "Monthly", price: PRICE_MONTHLY_LABEL, per: "/ month", note: "Billed monthly. Auto-renews until cancelled." },
                  { id: "year"  as const, tag: "Yearly · Save 44%", price: PRICE_YEARLY_LABEL, per: "/ year", note: "Billed annually. Auto-renews until cancelled." },
                ]).map(p => {
                  const selected = cycle === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setCycle(p.id)}
                      className={
                        "text-left p-6 space-y-1 border-2 transition-all duration-200 " +
                        (selected
                          ? "border-white bg-white/10 scale-[1.01]"
                          : "border-white/40 bg-black/20 opacity-70 hover:opacity-95")
                      }
                    >
                      <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
                        {p.tag} {selected && "✓"}
                      </p>
                      <p className="text-4xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
                        {p.price}<span className="text-lg opacity-70"> {p.per}</span>
                      </p>
                      <p className="text-xs opacity-60 pt-1">{p.note}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleGoPro}
                disabled={buyBusy || activating}
                className="w-full bg-white text-2xl py-5 uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: LG_FONT, color: theme.hex }}
              >
                {activating ? "ACTIVATING..." : buyBusy ? "OPENING..." : "GO PRO"}
              </button>
            </>
          )}

          <p className="text-xs opacity-50">
            Prices in USD. Taxes may apply and will be calculated at checkout. Payments are
            processed securely by Paddle.com, our merchant of record. Subscriptions auto-renew
            until cancelled — cancel anytime.{" "}
            <Link to="/refunds" className="underline underline-offset-2">14-day money-back guarantee</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
