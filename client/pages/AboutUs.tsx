import { Link } from "react-router-dom";
import { FloatingPhrases } from "@/components/FloatingPhrases";
import { SiteFooter } from "@/components/SiteFooter";
import { THEME_COLORS, readStoredTheme } from "@/lib/theme";

const LG_FONT = "'Luckiest Guy', cursive";
const CONTACT_EMAIL = "cardsinvity@gmail.com";

const OCCASIONS = [
  { href: "/birthday-invitations",      label: "Birthday invitations" },
  { href: "/wedding-invitations",       label: "Wedding e-invites & save the dates" },
  { href: "/baby-shower-invitations",   label: "Baby shower invitations" },
  { href: "/gender-reveal-invitations", label: "Gender reveal invitations" },
  { href: "/anniversary-invitations",   label: "Anniversary invitations" },
  { href: "/graduation-invitations",    label: "Graduation invitations" },
  { href: "/rsvp-link",                 label: "RSVP links for any event" },
];

export default function AboutUs() {
  const brand = THEME_COLORS[readStoredTheme()].hex;

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
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-8 pt-8">
        <div className="w-full max-w-2xl space-y-8">
          <h1
            className="text-4xl md:text-6xl uppercase tracking-tight leading-none"
            style={{ fontFamily: LG_FONT }}
          >
            About Invity
          </h1>

          <Block title="What Invity is">
            Invity is a free online invitation maker. You pick a design, type your event details,
            and get one shareable link — no printing, no app to install, and nothing for your guests
            to sign up for. They open the link, see your invitation, and RSVP in a single tap.
          </Block>

          <Block title="How it works">
            Build your invitation in four short steps: add the details, choose a design, pick a font,
            then set the animation. Hit create and you get a link you can send anywhere — WhatsApp,
            Messenger, email, or a group chat. Every RSVP lands in your guest list, and you get an
            email the moment someone responds.
          </Block>

          <Block title="Free and Pro">
            The free tier gives you two invitation links per day, and each link stays live for 8 hours.{" "}
            <Link to="/pricing" className="underline underline-offset-2">Invity Pro</Link> removes the
            daily limit, keeps links alive for 30 days, and unlocks the premium designs and effects
            plus CSV export for your guest lists. Pro is $2.99/month or $20/year, and it's backed by a{" "}
            <Link to="/refunds" className="underline underline-offset-2">14-day money-back guarantee</Link>.
          </Block>

          <div className="space-y-3">
            <h2 className="text-xl md:text-2xl uppercase tracking-tight" style={{ fontFamily: LG_FONT }}>
              Invitations for every occasion
            </h2>
            <ul className="space-y-2">
              {OCCASIONS.map(o => (
                <li key={o.href}>
                  {/*
                    Plain <a>, not <Link> — these pages are pre-rendered static HTML
                    served by Vercel, not React routes. A client-side navigation would
                    fall through to the SPA 404.
                  */}
                  <a
                    href={o.href}
                    className="text-[15px] leading-relaxed underline underline-offset-2 opacity-85 hover:opacity-100 transition-opacity"
                  >
                    {o.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <Block title="Questions & help">
            Need a hand, found a bug, or want to ask about billing? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>{" "}
            and we'll get back to you. For anything payment-related you can also use the
            "Need help?" link in your Paddle receipt — Paddle.com is our merchant of record and
            handles billing enquiries and refunds.
          </Block>
        </div>
      </div>

      <SiteFooter variant="page" current="/about" />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl md:text-2xl uppercase tracking-tight" style={{ fontFamily: LG_FONT }}>
        {title}
      </h2>
      <p className="text-[15px] leading-relaxed opacity-85">{children}</p>
    </div>
  );
}
