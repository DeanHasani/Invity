import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FloatingPhrases } from "@/components/FloatingPhrases";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase, signInWithGoogle } from "@/lib/supabase";

const LG_FONT = "'Luckiest Guy', cursive";

const THEME_COLORS: Record<string, { hex: string; rgb: string }> = {
  orange:   { hex: "#F05A28", rgb: "240,90,40" },
  sky:      { hex: "#0284C7", rgb: "2,132,199" },
  teal:     { hex: "#14B8A6", rgb: "20,184,166" },
  warmgray: { hex: "#7C6A5E", rgb: "124,106,94" },
};

type InvitationRow = {
  id: string;
  title: string;
  date: string | null;
  created_at: string;
  expires_at: string;
};

type RsvpRow = {
  invitation_id: string;
  name: string;
  status: "accepted" | "declined";
  created_at?: string | null;
};

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(invitation: InvitationRow, rsvps: RsvpRow[]) {
  const lines = ["guest_name,status,responded_at"];
  for (const r of rsvps) {
    lines.push([csvEscape(r.name), r.status, r.created_at ?? ""].join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `invity-guests-${invitation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success("Guest list downloaded!");
}

export default function Guests() {
  const [theme] = useState(() => {
    const t = localStorage.getItem("invity_theme") ?? "orange";
    return THEME_COLORS[t] ?? THEME_COLORS.orange;
  });
  const { user, isPro } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["guest-lists", user?.email],
    enabled: !!user && isPro,
    queryFn: async () => {
      const { data: invitations, error } = await supabase
        .from("invitations")
        .select("id, title, date, created_at, expires_at")
        .eq("user_email", user!.email)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (invitations ?? []).map(i => i.id);
      let rsvps: RsvpRow[] = [];
      if (ids.length) {
        const { data: rows, error: rsvpError } = await supabase
          .from("rsvps")
          .select("invitation_id, name, status, created_at")
          .in("invitation_id", ids)
          .order("created_at", { ascending: true });
        if (rsvpError) throw rsvpError;
        rsvps = (rows ?? []) as RsvpRow[];
      }
      return { invitations: (invitations ?? []) as InvitationRow[], rsvps };
    },
  });

  const handleSignIn = async () => {
    setSigningIn(true);
    try { await signInWithGoogle(); }
    catch { toast.error("Sign-in failed. Try again."); }
    finally { setSigningIn(false); }
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
              Guest Lists
            </h1>
            <p className="text-base opacity-80">
              Everyone who accepted or declined your invitations, in one place.
            </p>
          </div>

          {/* Signed out */}
          {!user && (
            <div className="border-2 border-white/40 bg-black/20 p-8 text-center space-y-4">
              <p className="text-xl uppercase" style={{ fontFamily: LG_FONT }}>
                Sign in to see your guests
              </p>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="bg-white text-lg py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
                style={{ fontFamily: LG_FONT, color: theme.hex }}
              >
                {signingIn ? "OPENING..." : "Continue with Google"}
              </button>
            </div>
          )}

          {/* Free user — locked preview */}
          {user && !isPro && (
            <div className="border-2 border-white/40 bg-black/20 p-8 space-y-5 relative overflow-hidden">
              <div className="space-y-3 select-none" style={{ filter: "blur(6px)", opacity: 0.5 }} aria-hidden>
                {["SARAH ✔ ACCEPTED", "MIKE ✘ DECLINED", "LENA ✔ ACCEPTED", "TOM ✔ ACCEPTED"].map(row => (
                  <div key={row} className="border border-white/30 p-3 text-sm font-bold uppercase tracking-wider">
                    {row}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6">
                <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT }}>
                  Guest lists are a Pro thing
                </p>
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="bg-white text-lg py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors"
                  style={{ fontFamily: LG_FONT, color: theme.hex }}
                >
                  GO PRO — $2.99/MO
                </button>
              </div>
            </div>
          )}

          {/* Pro user — the real lists */}
          {user && isPro && (
            isLoading ? (
              <p className="text-xl uppercase animate-pulse" style={{ fontFamily: LG_FONT }}>
                Loading...
              </p>
            ) : !data?.invitations.length ? (
              <div className="border-2 border-white/40 bg-black/20 p-8 text-center space-y-4">
                <p className="text-xl uppercase" style={{ fontFamily: LG_FONT }}>
                  No invitations yet
                </p>
                <Link
                  to="/"
                  className="inline-block bg-white text-lg py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors"
                  style={{ fontFamily: LG_FONT, color: theme.hex }}
                >
                  Create one
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {data.invitations.map(inv => {
                  const guests = data.rsvps.filter(r => r.invitation_id === inv.id);
                  const accepted = guests.filter(g => g.status === "accepted");
                  const declined = guests.filter(g => g.status === "declined");
                  const live = new Date(inv.expires_at).getTime() > Date.now();
                  return (
                    <div key={inv.id} className="border-2 border-white/40 bg-black/20">
                      <div className="p-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/15">
                        <div>
                          <p className="text-xl uppercase leading-tight" style={{ fontFamily: LG_FONT }}>
                            {inv.title}
                          </p>
                          <p className="text-[11px] uppercase tracking-wider opacity-60 font-bold mt-1">
                            {inv.date ? `${inv.date} · ` : ""}
                            {live ? "🟢 LIVE" : "⚪ EXPIRED"} ·{" "}
                            {accepted.length} in · {declined.length} out
                          </p>
                        </div>
                        {guests.length > 0 && (
                          <button
                            onClick={() => downloadCsv(inv, guests)}
                            className="text-[11px] font-bold uppercase tracking-widest border border-white/40 px-4 py-2 hover:bg-white transition-colors"
                            style={{ fontFamily: LG_FONT }}
                            onMouseEnter={e => (e.currentTarget.style.color = theme.hex)}
                            onMouseLeave={e => (e.currentTarget.style.color = "#fff")}
                          >
                            Export CSV
                          </button>
                        )}
                      </div>
                      <div className="p-5">
                        {guests.length === 0 ? (
                          <p className="text-sm opacity-50">No RSVPs yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {guests.map((g, i) => (
                              <div
                                key={`${g.name}-${i}`}
                                className="flex items-center justify-between border border-white/20 px-3 py-2 text-sm"
                              >
                                <span className="font-bold truncate">{g.name}</span>
                                <span className={g.status === "accepted" ? "opacity-90" : "opacity-50"}>
                                  {g.status === "accepted" ? "✔ IN" : "✘ OUT"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
