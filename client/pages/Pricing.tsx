import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FloatingPhrases } from "@/components/FloatingPhrases";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
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
  const { isPro, currentPeriodEnd, cancelScheduled } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

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

          {/* Exact prices — must match the Paddle checkout amounts exactly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border-2 border-white/40 bg-black/20 p-6 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">Monthly</p>
              <p className="text-4xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
                {PRICE_MONTHLY_LABEL}<span className="text-lg opacity-70"> / month</span>
              </p>
              <p className="text-xs opacity-60 pt-1">Billed monthly. Auto-renews until cancelled.</p>
            </div>
            <div className="border-2 border-white bg-white/10 p-6 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">Yearly · Save 44%</p>
              <p className="text-4xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
                {PRICE_YEARLY_LABEL}<span className="text-lg opacity-70"> / year</span>
              </p>
              <p className="text-xs opacity-60 pt-1">Billed annually. Auto-renews until cancelled.</p>
            </div>
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

          {/* CTA */}
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
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full bg-white text-2xl py-5 uppercase tracking-wider hover:bg-white/90 transition-colors"
              style={{ fontFamily: LG_FONT, color: theme.hex }}
            >
              GO PRO — {PRICE_MONTHLY_LABEL}/MO
            </button>
          )}

          <p className="text-xs opacity-50">
            Prices in USD. Taxes may apply and will be calculated at checkout. Payments are
            processed securely by Paddle.com, our merchant of record. Subscriptions auto-renew
            until cancelled — cancel anytime.{" "}
            <Link to="/refunds" className="underline underline-offset-2">14-day money-back guarantee</Link>.
          </p>
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
