import { useState } from "react";
import { Link } from "react-router-dom";
import { FloatingPhrases } from "@/components/FloatingPhrases";

const LG_FONT = "'Luckiest Guy', cursive";

const THEME_COLORS: Record<string, string> = {
  orange:   "#F05A28",
  sky:      "#0284C7",
  teal:     "#14B8A6",
  warmgray: "#7C6A5E",
};

export default function RefundPolicy() {
  const [brand] = useState(() => {
    const t = localStorage.getItem("invity_theme") ?? "orange";
    return THEME_COLORS[t] ?? THEME_COLORS.orange;
  });

  return (
    <div
      className="min-h-screen w-full text-white flex flex-col select-none relative overflow-x-hidden"
      style={{ fontFamily: "'Montserrat', sans-serif", backgroundColor: brand }}
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
          <h1
            className="text-4xl md:text-6xl uppercase tracking-tight leading-none"
            style={{ fontFamily: LG_FONT }}
          >
            Refund Policy
          </h1>
          <p className="text-sm opacity-60 uppercase tracking-widest" style={{ fontFamily: LG_FONT }}>
            Last updated: {new Date().getFullYear()}
          </p>

          <Block title="Payments & merchant of record">
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
            Merchant of Record for all our orders. Paddle provides all customer service inquiries
            related to payments and handles returns.
          </Block>

          <Block title="14-day money-back guarantee">
            If you're not happy with Invity Pro, you can request a full refund within 14 days of
            your first purchase — no questions asked. This applies to your first subscription
            payment (monthly or yearly); renewal payments are refundable at our discretion if
            requested within 14 days of the charge.
          </Block>

          <Block title="How to request a refund">
            Email us at hasanidean97@gmail.com from the address you used at checkout, or use the
            "Need help?" link in your Paddle receipt email. Refunds are processed by Paddle back
            to your original payment method, typically within 5–10 business days.
          </Block>

          <Block title="Cancelling your subscription">
            You can cancel anytime from the account menu ("Manage Subscription"). Cancellation
            takes effect at the end of your current billing period — you keep Pro until then, and
            you won't be charged again. Cancelling is not the same as a refund: if you also want
            your latest payment back and you're within the 14-day window, request a refund as
            described above.
          </Block>

          <Block title="Contact">
            Questions about billing or refunds? Reach us at hasanidean97@gmail.com.
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2
        className="text-xl md:text-2xl uppercase tracking-tight"
        style={{ fontFamily: LG_FONT }}
      >
        {title}
      </h2>
      <p className="text-[15px] leading-relaxed opacity-85">
        {children}
      </p>
    </div>
  );
}
