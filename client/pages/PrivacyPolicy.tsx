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

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-sm opacity-60 uppercase tracking-widest" style={{ fontFamily: LG_FONT }}>
            Last updated: {new Date().getFullYear()}
          </p>

          <Block title="What we collect">
            When you sign in with Google, we store your email address to identify your account and enforce fair usage limits. When you create an invitation, we store the invitation content (title, date, location, theme, message) along with your email and an anonymous device identifier. Guests who view an invitation are assigned an anonymous session — no personal data is collected from them unless they submit an RSVP, in which case we store their name and response.
          </Block>

          <Block title="How we use it">
            Your email is used solely to associate invitations with your account and to limit creation to two free invitations per day. We do not sell, share, or use your data for advertising. RSVP responses are stored so you can see who responded to your invitation.
          </Block>

          <Block title="Third-party services">
            Invity is built on Supabase (database and authentication) and uses Google OAuth for sign-in. Your sign-in is handled directly by Google — we never see your Google password. Data is stored on Supabase infrastructure. If you purchase Invity Pro, payment is processed by Paddle.com, our merchant of record — Paddle collects your payment details and billing information directly, and we never see your card number. Please refer to their respective privacy policies for how they handle data.
          </Block>

          <Block title="Data retention">
            Invitation links expire automatically — after 8 hours on the free tier, or 30 days for Pro subscribers. Your account data (email, creation history, and subscription status if you're a Pro subscriber) remains stored until you delete your account. You can delete your account at any time from the account menu — this removes your invitations from our database, cancels any active subscription, and signs you out.
          </Block>

          <Block title="Cookies & storage">
            We use browser local storage to store an anonymous device identifier used for rate-limiting purposes. No advertising cookies are used.
          </Block>

          <Block title="Contact">
            For any privacy-related questions, contact us at cardsinvity@gmail.com.
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
