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

function useBrand() {
  const [brand] = useState(() => {
    const t = localStorage.getItem("invity_theme") ?? "orange";
    return THEME_COLORS[t] ?? THEME_COLORS.orange;
  });
  return brand;
}

export default function TermsOfService() {
  const brand = useBrand();

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
            Terms of Service
          </h1>
          <p className="text-sm opacity-60 uppercase tracking-widest" style={{ fontFamily: LG_FONT }}>
            Last updated: {new Date().getFullYear()}
          </p>

          <Block title="The service">
            Invity is an invitation link creator that lets you build and share digital invitation pages. By using Invity you agree to these terms.
          </Block>

          <Block title="Free tier">
            Free accounts are limited to two invitation links per day. Each link expires 8 hours after creation. This limit exists to ensure fair usage and may change in the future as paid tiers are introduced.
          </Block>

          <Block title="Acceptable use">
            You may not use Invity to send spam, harass others, promote illegal activity, or violate any applicable laws. We reserve the right to remove content or terminate accounts that violate these terms without notice.
          </Block>

          <Block title="Content">
            You are responsible for the content of the invitations you create. Invity does not review invitation content and is not liable for anything posted through the service.
          </Block>

          <Block title="Availability">
            We do our best to keep Invity running, but we do not guarantee uptime or availability. Invitation links are temporary and expire after 8 hours — do not rely on them for permanent records.
          </Block>

          <Block title="Limitation of liability">
            Invity is provided as-is without warranties of any kind. We are not liable for any damages arising from the use or inability to use the service.
          </Block>

          <Block title="Changes to these terms">
            We may update these terms at any time. Continued use of the service after changes means you accept the updated terms.
          </Block>

          <Block title="Contact">
            Questions about these terms? Reach us at support@invity.cards.
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
