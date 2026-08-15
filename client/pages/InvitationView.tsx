import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Invitation } from "@shared/api";
import Postcard from "@/components/Postcard";
import { supabase } from "@/lib/supabase";
import { getViewerToken } from "@/lib/identity";

type ViewState = "loading" | "ok" | "not-found" | "expired" | "responded";

// ── Shared layout shell for error / status pages ──────────────────────────────
function ErrorPage({
  emoji,
  headline,
  sub,
  cta = "Create Your Own",
}: {
  emoji: string;
  headline: string;
  sub: string;
  cta?: string;
}) {
  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center text-center p-8 gap-6"
      style={{ background: "#110500" }}
    >
      <div className="text-7xl select-none">{emoji}</div>
      <h1
        className="text-5xl md:text-7xl uppercase leading-none"
        style={{ fontFamily: "'Luckiest Guy', cursive", color: "#F05A28" }}
      >
        {headline}
      </h1>
      <p
        className="text-base max-w-xs"
        style={{ fontFamily: "'Montserrat', sans-serif", color: "rgba(255,255,255,0.45)" }}
      >
        {sub}
      </p>
      <Link
        to="/"
        className="mt-2 px-10 py-4 text-xl uppercase tracking-wider transition-all"
        style={{
          fontFamily: "'Luckiest Guy', cursive",
          border: "2px solid #F05A28",
          color: "#F05A28",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "#F05A28";
          (e.currentTarget as HTMLElement).style.color = "#fff";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "#F05A28";
        }}
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function InvitationView() {
  const { id } = useParams();
  const [state, setState]           = useState<ViewState>("loading");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [expiresAt, setExpiresAt]   = useState<number>(0);

  useEffect(() => {
    if (!id) { setState("not-found"); return; }

    // Check localStorage first — no round-trip needed if already responded
    if (localStorage.getItem(`invity_responded_${id}`)) {
      setState("responded");
      return;
    }

    supabase
      .rpc("get_invitation_public", { p_id: id })
      .then(({ data: rows, error }) => {
        const data = rows?.[0];
        if (error || !data) { setState("not-found"); return; }

        const expiry = new Date(data.expires_at as string).getTime();
        if (Date.now() > expiry) { setState("expired"); return; }

        setExpiresAt(expiry);
        setInvitation({
          id:        data.id,
          title:     data.title,
          message:   data.message,
          designId:  data.design_id,
          effectId:  data.effect_id,
          fontId:    data.font_id    ?? undefined,
          fontColor: data.font_color ?? undefined,
          date:      data.date       ?? undefined,
          location:  data.location   ?? undefined,
        });
        setState("ok");
      });
  }, [id]);

  const handleRsvp = async (name: string, status: "accepted" | "declined", note?: string) => {
    if (!id) return;

    // The edge function records the RSVP (deduped per device) AND emails the host
    try {
      await supabase.functions.invoke("notify-rsvp", {
        body: { invitation_id: id, name, status, note, viewer_token: getViewerToken() },
      });
    } catch (_) { /* non-blocking — don't trap the guest on an error */ }

    // Persist response so re-visits show the "already responded" page
    localStorage.setItem(`invity_responded_${id}`, status);
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (state === "loading") return (
    <div
      className="h-screen w-screen flex items-center justify-center text-4xl animate-pulse uppercase tracking-widest"
      style={{ background: "#F05A28", color: "#fff", fontFamily: "'Luckiest Guy', cursive" }}
    >
      Loading...
    </div>
  );

  if (state === "not-found") return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center text-center p-8 gap-8"
      style={{ background: "#F05A28", color: "#fff" }}
    >
      <h1 className="text-5xl md:text-6xl uppercase" style={{ fontFamily: "'Luckiest Guy', cursive" }}>
        404 — NOT FOUND
      </h1>
      <p className="text-lg opacity-70" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        This invitation doesn't exist. Maybe the link was mistyped?
      </p>
      <Link
        to="/"
        className="bg-white text-[#F05A28] text-2xl py-5 px-12 hover:bg-white/90 transition-colors uppercase tracking-wider"
        style={{ fontFamily: "'Luckiest Guy', cursive" }}
      >
        Create Your Own
      </Link>
    </div>
  );

  if (state === "expired") return (
    <ErrorPage
      emoji="⌛"
      headline="THIS ONE'S GONE"
      sub="This invitation expired. Ask the host to send you a fresh link — the party's still on!"
    />
  );

  if (state === "responded") return (
    <ErrorPage
      emoji="✅"
      headline="ALREADY REPLIED"
      sub="You've already responded to this invitation. See you (or not)!"
      cta="Make Your Own Invite"
    />
  );

  const remainingHours = Math.max(0, (expiresAt - Date.now()) / 3_600_000);

  // 100dvh, not 100vh: on mobile 100vh includes the area behind the browser
  // chrome, which pushed the RSVP buttons below the visible fold.
  return (
    <div className="w-screen h-[100dvh] overflow-hidden">
      <Postcard
        invitation={invitation!}
        isLiveView={true}
        expiresInHours={remainingHours}
        onRsvp={handleRsvp}
      />
    </div>
  );
}
