import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CreateInvitationRequest, Invitation } from "@shared/api";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { supabase, signInWithGoogle, signOut } from "@/lib/supabase";
import { getCreatorId } from "@/lib/identity";
import gsap from "gsap";
import { Link } from "react-router-dom";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CANVAS_MAP, DESIGN_BG, DecryptedText } from "@/components/Postcard";

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const DESIGNS = [
  { id: "minimal",    label: "Minimalist", color: "bg-[#f5f0e8] text-[#1a1a1a] border-2 border-[#1a1a1a]" },
  { id: "playful",    label: "Playful",    color: "bg-[#7B2CBF] text-[#FFD60A] border-2 border-[#FFD60A]" },
  { id: "elegant",    label: "Elegant",    color: "bg-[#070707] text-[#c9a84c] border-2 border-[#c9a84c]" },
  { id: "modernist",  label: "Modernist",  color: "bg-[#00FF00] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" },
  { id: "love",       label: "Love",       color: "bg-[#b52a2a] text-white border-2 border-rose-300" },
  { id: "natural",    label: "Natural",    color: "bg-[#1a2e14] text-[#d4e8b0] border-2 border-[#4a7a30]" },
  { id: "scary",      label: "Scary",      color: "bg-[#04040c] text-[#ff4444] border-2 border-[#6b0000]" },
  { id: "futuristic", label: "Futuristic", color: "bg-[#020b18] text-[#22d3ee] border-2 border-[#22d3ee]" },
  { id: "cyberpunk",  label: "Cyberpunk",  color: "bg-[#08000f] text-[#ff00ff] border-2 border-[#ff00ff] shadow-[0_0_16px_rgba(255,0,255,0.4)]" },
  { id: "hacked",     label: "Hacked",     color: "bg-[#010f04] text-[#00ff55] border-2 border-[#00ff55] shadow-[0_0_16px_rgba(0,255,80,0.4)]" },
];

const EFFECTS = [
  { id: "static",    label: "Static",    desc: "Clean fade in, no movement" },
  { id: "glowing",   label: "Glowing",   desc: "Zooms in with a pulsing luminous glow" },
  { id: "glitching", label: "Glitching", desc: "Warps in with random RGB splits" },
  { id: "smoke",     label: "Smoke",     desc: "Drifts in, words billow like rising smoke" },
  { id: "decrypted", label: "Decrypted", desc: "Characters cycle through random glyphs then lock in" },
  { id: "assemble",  label: "Assemble",  desc: "Words fly in from every direction" },
  { id: "bouncing",  label: "Bouncing",  desc: "Pops in with energetic rhythmic bounce" },
];

const FONTS = [
  { id: "funky",    label: "Funky",    family: "'Fontdiner Swanky', cursive" },
  { id: "stampede", label: "Stampede", family: "'Vast Shadow', serif" },
  { id: "militant", label: "Militant", family: "'Black Ops One', sans-serif" },
  { id: "velvet",   label: "Velvet",   family: "'Lobster', cursive" },
  { id: "sleek",    label: "Sleek",    family: "'Basic', sans-serif" },
  { id: "bloom",    label: "Bloom",    family: "'Indie Flower', cursive" },
  { id: "slash",    label: "Slash",    family: "'Rubik Glitch', sans-serif" },
  { id: "fierce",   label: "Fierce",   family: "'Spicy Rice', cursive" },
];

const COLOR_SWATCHES = [
  "#ffffff", "#f5f0e8", "#1a1a1a", "#c9a84c",
  "#22d3ee", "#60a5fa", "#ff00ff", "#c084fc",
  "#00ff55", "#34d399", "#f43f5e", "#ff9999",
  "#fbbf24", "#f87171",
];

const LG_FONT = "'Luckiest Guy', cursive";

const STEP_PHRASES: Record<number, string[]> = {
  1: ["LET'S START", "HERE WE GO", "LET'S BEGIN", "KICK IT OFF"],
  2: ["PICK A LOOK", "DESIGN TIME", "STYLE IT", "LOOKING GOOD"],
  3: ["FONT TIME", "YOUR TYPEFACE", "STYLE YOUR TEXT", "MAKE IT POP", "IT'S FONT O'CLOCK", "DRESS IT UP", "CHOOSE YOUR LETTERS", "MAKE IT SNAPPY"],
  4: ["PICK YOUR VIBE", "SET THE EFFECT", "CHOOSE THE MOOD", "MAKE IT YOURS"],
  5: ["YOU DID IT!", "PARTY TIME!", "READY TO SEND", "BOOM!"],
};

const BG_PHRASES = [
  "CREATE YOUR INVITATION",
  "INVITE YOUR COWORKERS",
  "INVITE YOUR GANG",
  "HAVE THE FUN OF YOUR LIFE",
  "MAKE IT A NIGHT TO REMEMBER",
  "YOUR PARTY YOUR RULES",
  "GOOD TIMES INCOMING",
  "BRING THE CROWD TOGETHER",
  "SEND THE INVITE",
  "DON'T CELEBRATE ALONE",
  "MAKE MEMORIES HAPPEN",
  "THE MORE THE MERRIER",
  "GATHER YOUR PEOPLE",
  "EVERY GREAT PARTY STARTS HERE",
  "START THE PARTY",
  "MAKE SOME NOISE",
  "IT'S PARTY TIME",
  "SPREAD THE WORD",
  "LET THEM KNOW",
  "THE GANG'S ALL HERE",
];

// ─────────────────────────────────────────────────────────────────────────────
// DatePickerInput — custom calendar styled to the Invity orange palette
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function DatePickerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]       = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);
  const today                 = new Date();
  const [view, setView]       = useState({ month: today.getMonth(), year: today.getFullYear() });
  const wrapRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const firstDay  = new Date(view.year, view.month, 1).getDay();
  const totalDays = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const shiftMonth = (delta: number) =>
    setView(v => {
      let m = v.month + delta, y = v.year;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      if (y < today.getFullYear() || (y === today.getFullYear() && m < today.getMonth())) return v;
      return { month: m, year: y };
    });

  const pick = (day: number) => {
    const d = new Date(view.year, view.month, day);
    setSelected(d);
    onChange(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-2 bg-transparent border-white/40 border-t-0 border-x-0 border-b-2 rounded-none px-0 text-white transition-all py-4 text-base hover:border-white"
      >
        <span className={cn("flex-1 leading-none", !value && "text-white/20")}>
          {value || "e.g. Saturday, July 12"}
        </span>
        <svg className="opacity-40 flex-shrink-0 mb-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="3" width="13" height="11.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-3 z-50 shadow-2xl w-72"
          style={{ background: "#1a0a00", border: "2px solid rgba(255,77,0,0.5)", fontFamily: "'Montserrat', sans-serif" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,77,0,0.2)" }}>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xl leading-none"
            >
              ‹
            </button>
            <span className="font-bold text-xs uppercase tracking-[0.18em] text-white">
              {MONTH_NAMES[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xl leading-none"
            >
              ›
            </button>
          </div>

          <div className="px-3 py-3">
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[9px] font-bold tracking-wider pb-2" style={{ color: "rgba(255,77,0,0.55)" }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const isToday = day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();
                const isSel   = selected && day === selected.getDate() && view.month === selected.getMonth() && view.year === selected.getFullYear();
                const isPast  = new Date(view.year, view.month, day) < todayDate;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isPast && pick(day)}
                    disabled={isPast}
                    className="aspect-square flex items-center justify-center text-[13px] font-medium transition-all rounded-sm"
                    style={
                      isPast  ? { color: "rgba(255,255,255,0.2)", cursor: "not-allowed" } :
                      isSel   ? { background: "#FF4D00", color: "#fff", fontWeight: 700 } :
                      isToday ? { outline: "2px solid #FF4D00", outlineOffset: "-2px", color: "#FF4D00" } :
                                { color: "rgba(255,255,255,0.75)" }
                    }
                    onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = "rgba(255,77,0,0.18)"; }}
                    onMouseLeave={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = ""; }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setSelected(null); setOpen(false); }}
              className="w-full py-2.5 text-[11px] uppercase tracking-widest font-bold transition-opacity hover:opacity-60"
              style={{ borderTop: "1px solid rgba(255,77,0,0.2)", color: "#FF4D00" }}
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TitleEffectPreview — animates the title with the chosen effect (step 4)
// Mounted fresh via key prop on every effect selection so animation replays.
// ─────────────────────────────────────────────────────────────────────────────

function TitleEffectPreview({
  title,
  fontFamily,
  fontColor,
  effectId,
  startDelay = 0,
}: {
  title: string;
  fontFamily: string;
  fontColor: string;
  effectId: string;
  startDelay?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ctxRef  = useRef<gsap.Context | null>(null);
  const display = title.trim() || "YOUR TITLE";

  // Empty deps — component remounts via key prop whenever effectId changes
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || effectId === "decrypted") return;
    if (ctxRef.current) ctxRef.current.revert();
    let tid: ReturnType<typeof setTimeout>;

    const runAnim = () => {
      if (ctxRef.current) ctxRef.current.revert();
      const words = Array.from(el.querySelectorAll<HTMLElement>(".ep-word"));

      ctxRef.current = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        switch (effectId) {
          case "static":
            gsap.set(el, { y: 50, opacity: 0 });
            tl.to(el, { y: 0, opacity: 1, duration: 1.2 });
            break;

          case "glowing":
            gsap.set(el, { scale: 0.06, opacity: 0 });
            tl.to(el, { scale: 1, opacity: 1, duration: 1.3, ease: "expo.out" });
            tl.to(el, {
              textShadow: `0 0 40px ${fontColor},0 0 80px ${fontColor}80`,
              duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut",
            }, "+=0.3");
            break;

          case "glitching": {
            gsap.set(el, { scaleX: 4.5, scaleY: 0.05, opacity: 0, filter: "blur(22px)" });
            tl.to(el, { scaleX: 1, scaleY: 1, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "expo.out" });
            const doG = () => {
              if (!wrapRef.current) return;
              const ws = Array.from(wrapRef.current.querySelectorAll<HTMLElement>(".ep-word"));
              if (!ws.length) return;
              const w = ws[Math.floor(Math.random() * ws.length)];
              gsap.timeline()
                .to(w, { x: 6, duration: 0.04, ease: "none" })
                .to(w, { x: -6, duration: 0.04 })
                .to(w, { x: 4, duration: 0.04 })
                .to(w, { x: 0, duration: 0.04 });
              w.style.textShadow = "4px 0 #ff00ff,-4px 0 #00ffff";
              setTimeout(() => { if (w) w.style.textShadow = ""; }, 150);
              setTimeout(doG, 350 + Math.random() * 600);
            };
            setTimeout(doG, 1100);
            break;
          }

          case "smoke":
            gsap.set(el, { x: -150, opacity: 0, filter: "blur(14px)" });
            tl.to(el, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.3 });
            if (words.length)
              tl.to(words, {
                y: "random(-12,12)", opacity: "random(0.78,1)",
                duration: "random(2,4)", repeat: -1, yoyo: true,
                ease: "sine.inOut", stagger: { amount: 0.8, from: "random" },
              }, "+=0.2");
            break;

          case "assemble": {
            if (!words.length) break;
            gsap.set(words, { opacity: 0 });
            const EDGES = [
              { x: -300, y: 0 }, { x: 300, y: 0 },
              { x: 0, y: -200 }, { x: 0, y: 200 },
            ];
            words.forEach((w, i) => {
              const e = EDGES[i % EDGES.length];
              gsap.set(w, { x: e.x, y: e.y, rotation: (Math.random() - 0.5) * 40 });
              tl.to(w, { x: 0, y: 0, opacity: 1, rotation: 0, duration: 0.65, ease: "back.out(1.3)" }, i * 0.1);
            });
            break;
          }

          case "bouncing":
            gsap.set(el, { scale: 0, opacity: 0 });
            tl.to(el, { scale: 1, opacity: 1, duration: 0.9, ease: "back.out(1.7)" });
            tl.to(el, { y: -20, scaleY: 1.05, scaleX: 0.96, duration: 0.45, repeat: -1, yoyo: true, ease: "power2.inOut" }, "+=0.2");
            break;

          default:
            gsap.set(el, { opacity: 0 });
            tl.to(el, { opacity: 1, duration: 0.8 });
        }
      });
    };

    tid = setTimeout(runAnim, startDelay);

    return () => { clearTimeout(tid); ctxRef.current?.revert(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textStyle: React.CSSProperties = {
    fontFamily,
    color: fontColor,
    fontSize: "clamp(1.4rem, 5.5vw, 2.8rem)",
    letterSpacing: "-0.02em",
    lineHeight: "1",
  };

  return (
    <div
      className="w-full flex items-center justify-center overflow-hidden mb-1"
      style={{ height: 120, background: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.12)" }}
    >
      {effectId === "decrypted" ? (
        <DecryptedText
          text={display}
          delay={startDelay + 200}
          charDelay={70}
          shuffleSpeed={55}
          className="uppercase text-center px-6"
          charClassName="ep-word inline-block"
          style={textStyle}
        />
      ) : (
        <div ref={wrapRef} className="uppercase text-center px-6" style={textStyle}>
          {display.split(" ").filter(Boolean).map((word, i, arr) => (
            <span
              key={i}
              className="ep-word inline-block"
              style={{ marginRight: i < arr.length - 1 ? "0.22em" : 0 }}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy modal
// ─────────────────────────────────────────────────────────────────────────────

function PrivacyPolicyModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto"
        style={{ background: "#110500", border: "2px solid rgba(255,77,0,0.35)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4" style={{ background: "#110500", borderBottom: "1px solid rgba(255,77,0,0.2)" }}>
          <h2 className="text-xl uppercase tracking-wider" style={{ fontFamily: LG_FONT, color: "#FF4D00" }}>
            Privacy Policy
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Montserrat', sans-serif" }}>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,77,0,0.6)" }}>
            Last updated: May 2026
          </p>

          <p>
            Invity is a personal invitation creator. We take your privacy seriously and keep data collection to the minimum needed to run the service.
          </p>

          <Section title="What we collect">
            <li>Your <strong>Google account email address</strong> when you sign in — used only to send you RSVP notifications.</li>
            <li>The <strong>content of invitations you create</strong> (title, message, date, location, design choices) — stored to generate your shareable link.</li>
            <li>The <strong>name and response</strong> (accept/decline) submitted by your guests when they open your invitation link.</li>
          </Section>

          <Section title="How we use it">
            <li>Your email is used <em>only</em> to notify you when a guest responds to your invitation.</li>
            <li>We do not sell, share, or use your data for advertising or analytics of any kind.</li>
            <li>Guest names and responses are visible only to you, the invitation creator.</li>
          </Section>

          <Section title="Data retention">
            <li>Invitation links expire automatically after 8 hours.</li>
            <li>You can permanently delete all your invitations and account data at any time via <strong>Account → Delete Everything</strong>.</li>
            <li>If you choose to sign out without deleting, your data remains stored until you return or delete it.</li>
          </Section>

          <Section title="Third-party services">
            <li><strong>Google OAuth</strong> — for sign-in. Google's own privacy policy applies to the authentication step.</li>
            <li><strong>Supabase</strong> — database and authentication infrastructure. Data is stored on Supabase-managed servers.</li>
            <li><strong>Resend</strong> — used to deliver RSVP notification emails to your inbox.</li>
          </Section>

          <Section title="Your rights">
            <li>You can sign out at any time without losing your data.</li>
            <li>You can delete everything — all invitations and associated data — instantly via the Account menu.</li>
            <li>You have the right to request data deletion by contacting us directly.</li>
          </Section>

          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Questions? Reach out at <span style={{ color: "#FF4D00" }}>hasanidean97@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-widest font-bold" style={{ color: "#FF4D00" }}>{title}</p>
      <ul className="space-y-1 pl-3 list-none">
        {children}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Account menu
// ─────────────────────────────────────────────────────────────────────────────

function AccountMenu({ email, onPrivacy }: { email: string; onPrivacy: () => void }) {
  const [open, setOpen]             = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleDeleteEverything = async () => {
    setDeleting(true);
    await supabase.from("invitations").delete().eq("user_email", email);
    await signOut();
  };

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => { setOpen(o => !o); setConfirming(false); }}
        className="text-sm md:text-base uppercase tracking-widest font-bold opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1.5"
        style={{ fontFamily: LG_FONT }}
      >
        ACCOUNT
        <span className="text-[8px] opacity-70">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-56 z-50 flex flex-col"
          style={{ background: "#1a0800", border: "2px solid rgba(255,77,0,0.45)" }}
        >
          {/* Email */}
          <div
            className="px-4 py-3 text-[10px] uppercase tracking-widest truncate"
            style={{ color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,77,0,0.2)" }}
          >
            {email}
          </div>

          {!confirming ? (
            <>
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.92)" }}
              >
                Sign Out
              </button>
              <button
                onClick={() => { onPrivacy(); setOpen(false); }}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                style={{ fontFamily: LG_FONT, color: "rgba(255,80,80,0.8)" }}
              >
                Delete Everything
              </button>
            </>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                This deletes all your invitations and signs you out. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteEverything}
                  disabled={deleting}
                  className="flex-1 py-2 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40"
                  style={{ fontFamily: LG_FONT, background: "#cc2200", color: "#fff" }}
                >
                  {deleting ? "..." : "YES, DELETE"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2 text-[11px] uppercase tracking-wider transition-colors hover:bg-white/10"
                  style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Google sign-in modal (dialog — stays on the creation page)
// ─────────────────────────────────────────────────────────────────────────────

function GoogleSignInModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try { await signInWithGoogle(); }
    catch { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center text-center gap-6 p-8 relative"
        style={{ background: "#1a0800", border: "2px solid rgba(255,77,0,0.45)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/30 hover:text-white transition-colors text-2xl leading-none"
        >
          ×
        </button>

        <div className="space-y-1">
          <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT, color: "#FF4D00" }}>
            Sign In to Continue
          </p>
          <p className="text-xs opacity-50">
            Sign in with Google to create your invitation and receive RSVP notifications.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          disabled={loading}
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
          {loading ? "OPENING..." : "CONTINUE WITH GOOGLE"}
        </button>

        <p className="text-[10px] opacity-30">
          We only use your email to send RSVP notifications.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated background phrases
// ─────────────────────────────────────────────────────────────────────────────

type FloatingPhrase = { id: number; text: string; x: number; y: number; scale: number; visible: boolean };
let _phraseCounter = 0;

function FloatingPhrases({ active }: { active: boolean }) {
  const [phrases, setPhrases] = useState<FloatingPhrase[]>([]);

  useEffect(() => {
    if (!active) { setPhrases([]); return; }

    const spawn = () => {
      const id = _phraseCounter++;
      // Keep phrases in the left/right margins so they never land over the form
      const leftSide = Math.random() < 0.5;
      const p: FloatingPhrase = {
        id,
        text: BG_PHRASES[Math.floor(Math.random() * BG_PHRASES.length)],
        x: leftSide ? 2 + Math.random() * 14 : 82 + Math.random() * 14,
        y: 8 + Math.random() * 78,
        scale: 0.7 + Math.random() * 0.8,
        visible: false,
      };
      setPhrases(prev => [...prev.slice(-6), p]);
      requestAnimationFrame(() => requestAnimationFrame(() =>
        setPhrases(prev => prev.map(q => q.id === id ? { ...q, visible: true } : q))
      ));
      setTimeout(() => {
        setPhrases(prev => prev.map(q => q.id === id ? { ...q, visible: false } : q));
        setTimeout(() => setPhrases(prev => prev.filter(q => q.id !== id)), 850);
      }, 3000);
    };

    spawn();
    const iv = setInterval(spawn, 2000);
    return () => { clearInterval(iv); setPhrases([]); };
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {phrases.map(p => (
        <div
          key={p.id}
          className="absolute uppercase select-none"
          style={{
            fontFamily: LG_FONT,
            color: "rgba(255,255,255,0.35)",
            fontSize: `clamp(0.75rem, ${1.7 * p.scale}vw, ${1.3 * p.scale}rem)`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `translate(-50%, -50%) scale(${p.visible ? 1 : 0.85})`,
            opacity: p.visible ? 1 : 0,
            transition: "opacity 0.85s ease, transform 0.85s ease",
            whiteSpace: "nowrap",
          }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main wizard
// ─────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const [authState, setAuthState]     = useState<"loading" | "signed-in" | "signed-out">("loading");
  const [userEmail, setUserEmail]     = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSignIn, setShowSignIn]   = useState(false);

  const [step, setStep] = useState(1);
  const [phraseIndices, setPhraseIndices] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [effectPreviewKey, setEffectPreviewKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Auth state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setAuthState("signed-in");
      } else {
        setAuthState("signed-out");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setAuthState("signed-in");
        setShowSignIn(false);
      } else {
        setAuthState("signed-out");
      }
    });

    // Close modal when OAuth popup posts back after completing auth
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "INVITY_AUTH_DONE") {
        setShowSignIn(false);
        if (e.data.email) {
          setUserEmail(e.data.email);
          setAuthState("signed-in");
        }
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const [formData, setFormData] = useState<CreateInvitationRequest>({
    title:     "",
    message:   "",
    date:      "",
    location:  "",
    designId:  "minimal",
    effectId:  "static",
    fontId:    "funky",
    fontColor: "#ffffff",
  });

  useEffect(() => { randomizePhrases(); }, []);

  const randomizePhrases = () => {
    setPhraseIndices({
      1: Math.floor(Math.random() * STEP_PHRASES[1].length),
      2: Math.floor(Math.random() * STEP_PHRASES[2].length),
      3: Math.floor(Math.random() * STEP_PHRASES[3].length),
      4: Math.floor(Math.random() * STEP_PHRASES[4].length),
      5: Math.floor(Math.random() * STEP_PHRASES[5].length),
    });
  };

  // ── Step transition ────────────────────────────────────────────────────────
  const animateStep = (next: boolean, overrideStep?: number) => {
    if (!containerRef.current) {
      setStep(prev => overrideStep ?? (next ? prev + 1 : prev - 1));
      return;
    }
    gsap.killTweensOf(containerRef.current);
    gsap.to(containerRef.current, {
      opacity: 0, x: next ? -30 : 30, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        setStep(prev => overrideStep ?? (next ? prev + 1 : prev - 1));
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, x: next ? 30 : -30 },
          { opacity: 1, x: 0, duration: 0.28, ease: "power2.out" }
        );
      },
    });
  };

  const nextStep = () => {
    if (step === 1 && !formData.title.trim()) { toast.error("Add an event title!"); return; }
    if (step === 1 && !formData.message.trim()) { toast.error("Add a message for your guests!"); return; }
    animateStep(true);
  };
  const prevStep = () => animateStep(false);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateInvitationRequest) => {
      const creatorId = getCreatorId();
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
      const { count } = await supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .gte("created_at", since);
      if ((count ?? 0) >= 1) throw Object.assign(new Error("rate_limited"), { code: "rate_limited" });

      const id = nanoid(10);
      const expiresAt = new Date(Date.now() + 8 * 3_600_000).toISOString();
      const { data: row, error } = await supabase
        .from("invitations")
        .insert({
          id,
          title:      data.title,
          message:    data.message,
          design_id:  data.designId,
          effect_id:  data.effectId,
          font_id:    data.fontId    ?? null,
          font_color: data.fontColor ?? null,
          date:       data.date     || null,
          location:   data.location || null,
          creator_id: creatorId,
          user_email: userEmail,
          expires_at: expiresAt,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        invitation: {
          id:        row.id,
          title:     row.title,
          message:   row.message,
          designId:  row.design_id,
          effectId:  row.effect_id,
          fontId:    row.font_id    ?? undefined,
          fontColor: row.font_color ?? undefined,
          date:      row.date     ?? undefined,
          location:  row.location ?? undefined,
        } as Invitation,
      };
    },
    onSuccess: (data) => {
      setCreatedInvitation(data.invitation);
      animateStep(true, 5);
      toast.success("Invitation created! 🎉");
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === "rate_limited") { setRateLimited(true); return; }
      toast.error("Something went wrong. Try again.");
    },
  });

  const copyLink = () => {
    if (!createdInvitation) return;
    const url = `${window.location.origin}/${createdInvitation.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
    toast.success("Link copied!");
  };

  const fallbackCopy = (text: string) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:absolute;left:-9999px";
    document.body.appendChild(el);
    el.select();
    (document as any).execCommand("copy");
    document.body.removeChild(el);
  };

  const resetBuilder = () => {
    gsap.to(containerRef.current, {
      opacity: 0, x: -30, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        setStep(1);
        setCreatedInvitation(null);
        randomizePhrases();
        setFormData({ title: "", message: "", date: "", location: "", designId: "minimal", effectId: "static", fontId: "funky", fontColor: "#ffffff" });
        gsap.fromTo(containerRef.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.28, ease: "power2.out" });
      },
    });
  };

  // ── Rate-limit wall ────────────────────────────────────────────────────────
  if (rateLimited) return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center text-center p-8 gap-6 select-none"
      style={{ background: "#FF4D00", color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="text-7xl">⏰</div>
      <h1 className="text-5xl md:text-7xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
        WHOOPSIE
      </h1>
      <p className="text-xl md:text-2xl uppercase tracking-widest font-bold" style={{ fontFamily: LG_FONT }}>
        ONE LINK A DAY
      </p>
      <p className="text-base opacity-70 max-w-sm">
        You've already created an invitation today on this demo. Come back tomorrow and let's party again.
      </p>
      <button
        onClick={() => setRateLimited(false)}
        className="mt-2 bg-white text-[#FF4D00] text-xl py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors"
        style={{ fontFamily: LG_FONT }}
      >
        Go Back
      </button>
    </div>
  );

  // ── Field helper ───────────────────────────────────────────────────────────
  const field = (key: keyof CreateInvitationRequest) => ({
    value: formData[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData({ ...formData, [key]: key === "title" ? e.target.value.toUpperCase() : e.target.value }),
  });

  const INPUT_CLS = "bg-transparent border-white/40 border-t-0 border-x-0 border-b-2 rounded-none px-0 placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-white transition-all text-white";

  const selectedFont = FONTS.find(f => f.id === formData.fontId) ?? FONTS[0];
  const ActiveCanvas = step === 2 ? (CANVAS_MAP[formData.designId] ?? null) : null;

  return (
    <div
      className="min-h-screen w-full text-white flex flex-col select-none relative overflow-x-hidden"
      style={{
        fontFamily: "'Montserrat', sans-serif",
        backgroundColor: step === 2 ? (DESIGN_BG[formData.designId] ?? "#FF4D00") : "#FF4D00",
        transition: "background-color 0.4s ease",
      }}
    >

      {/* ── Floating background phrases ── */}
      <FloatingPhrases active={authState === "signed-out"} />

      {/* ── Design canvas background (step 2 only) ── */}
      {ActiveCanvas && (
        <div
          key={formData.designId}
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: 1, animation: "canvasFadeIn 0.45s ease forwards" }}
        >
          <ActiveCanvas />
          {/* Overlay keeps white UI text readable against any design */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.38)" }} />
        </div>
      )}

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-start md:items-center z-40 pointer-events-none">
        <h1
          className="text-2xl md:text-4xl tracking-tighter cursor-default leading-none uppercase opacity-90 pointer-events-auto"
          style={{ fontFamily: LG_FONT }}
        >
          INVITY
        </h1>
        <div className="text-right pointer-events-auto space-y-2">
          {/* Sign in / Account — above phrase + dots */}
          {authState === "signed-in" ? (
            <AccountMenu email={userEmail ?? ""} onPrivacy={() => setShowPrivacy(true)} />
          ) : (
            <button
              onClick={() => setShowSignIn(true)}
              className="text-sm md:text-base uppercase tracking-widest font-bold opacity-80 hover:opacity-100 transition-opacity"
              style={{ fontFamily: LG_FONT }}
            >
              Sign In
            </button>
          )}
          {/* Phrase + step dots — unchanged */}
          <p className="font-bold uppercase text-[11px] md:text-sm tracking-widest opacity-90">
            {STEP_PHRASES[step]?.[phraseIndices[step]] ?? ""}
          </p>
          <div className="flex gap-1 justify-end">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={cn("h-1 rounded-full transition-all duration-300", step >= i ? "bg-white w-6" : "bg-white/30 w-4")}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── Side nav buttons — hidden on mobile, shown md+ ── */}
      {step < 5 && (
        <>
          {step > 1 && (
            <button
              onClick={prevStep}
              className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] bg-white/5 hover:bg-white text-white hover:text-[#FF4D00] transition-all duration-300 group items-center justify-center border-y border-r border-white/20 hover:border-white"
              aria-label="Previous step"
            >
              <span
                className="-rotate-90 whitespace-nowrap tracking-widest uppercase group-hover:scale-110 transition-transform text-xl"
                style={{ fontFamily: LG_FONT }}
              >
                BACK
              </span>
            </button>
          )}
          <button
            onClick={step === 4 ? () => createMutation.mutate(formData) : nextStep}
            disabled={createMutation.isPending}
            className={cn(
              "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] transition-all duration-300 group items-center justify-center border-y border-l",
              createMutation.isPending
                ? "bg-white/20 border-white/20 cursor-not-allowed"
                : "bg-white/10 hover:bg-white text-white hover:text-[#FF4D00] border-white/20 hover:border-white"
            )}
            aria-label={step === 4 ? "Create" : "Next step"}
          >
            <span
              className="rotate-90 whitespace-nowrap tracking-widest uppercase group-hover:scale-110 transition-transform text-xl"
              style={{ fontFamily: LG_FONT }}
            >
              {createMutation.isPending ? "..." : step === 4 ? "CREATE!" : "NEXT"}
            </span>
          </button>
        </>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex items-start justify-center pt-28 md:pt-40 pb-28 md:pb-20 px-6 md:px-24" style={{ zIndex: 2 }}>
        <div ref={containerRef} className="max-w-xl w-full relative">
          {/* Interceptor — covers only the form card so the hand cursor stays narrow */}
          {authState !== "signed-in" && step < 5 && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={() => setShowSignIn(true)}
            />
          )}

          {/* ── STEP 1: Event details ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                TELL US ABOUT<br />YOUR EVENT.
              </h2>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-75">Event Title *</label>
                <Input
                  placeholder="E.G. MY 30TH BIRTHDAY"
                  className={cn(INPUT_CLS, "text-2xl md:text-3xl font-bold py-6 h-auto")}
                  {...field("title")}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-75">Personal Message *</label>
                <Textarea
                  placeholder="Wanna join the party of the year?"
                  className={cn(INPUT_CLS, "text-lg md:text-xl py-4 resize-none min-h-[90px]")}
                  {...field("message")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest opacity-75">
                    Date <span className="opacity-50 normal-case font-normal">(optional)</span>
                  </label>
                  <DatePickerInput
                    value={formData.date ?? ""}
                    onChange={v => setFormData(f => ({ ...f, date: v }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest opacity-75">
                    Location <span className="opacity-50 normal-case font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. Rooftop Bar, NYC"
                    className={cn(INPUT_CLS, "text-base py-4 h-auto")}
                    {...field("location")}
                  />
                </div>
              </div>

              <p className="text-[11px] opacity-40 font-medium tracking-wide">* Required fields</p>
            </div>
          )}

          {/* ── STEP 2: Design ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                PICK A<br />DESIGN.
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {DESIGNS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setFormData({ ...formData, designId: d.id as any })}
                    className={cn(
                      "group relative p-5 md:p-7 transition-all duration-200 flex items-center justify-between",
                      d.color,
                      formData.designId === d.id
                        ? "scale-[1.02] ring-4 ring-white ring-offset-2 ring-offset-[#FF4D00]"
                        : "opacity-65 hover:opacity-95"
                    )}
                  >
                    <span className="text-xl md:text-2xl uppercase" style={{ fontFamily: LG_FONT }}>{d.label}</span>
                    {formData.designId === d.id && <Check className="w-6 h-6" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Font & Color ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                PICK YOUR<br />TEXT STYLE.
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {FONTS.map(f => {
                  const isSel = formData.fontId === f.id;
                  return (
                    <div key={f.id}>
                      <button
                        onClick={() => setFormData({ ...formData, fontId: f.id })}
                        className={cn(
                          "w-full p-5 md:p-6 transition-all duration-200 flex items-center justify-between border-2 text-left",
                          isSel
                            ? "bg-white text-[#FF4D00] border-white"
                            : "border-white/30 opacity-65 hover:opacity-95"
                        )}
                      >
                        <span className="text-2xl md:text-3xl uppercase" style={{ fontFamily: f.family }}>
                          {f.label}
                        </span>
                        {isSel && <Check className="w-6 h-6 flex-shrink-0 ml-4" />}
                      </button>

                      {/* Inline accordion — expands under the selected font */}
                      <div className={cn(
                        "grid transition-all duration-300",
                        isSel ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}>
                        <div className="overflow-hidden">
                          <div className="border-x-2 border-b-2 border-white px-4 pt-4 pb-3 space-y-3 bg-white/5">
                            {/* Title preview in this font */}
                            <p
                              className="uppercase text-center leading-none"
                              style={{
                                fontFamily: f.family,
                                color: formData.fontColor,
                                fontSize: "clamp(1.6rem, 6vw, 2.8rem)",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {formData.title || "PREVIEW"}
                            </p>
                            {/* Color swatches — smaller boxes with black border */}
                            <div className="flex flex-wrap gap-2">
                              {COLOR_SWATCHES.map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, fontColor: c })}
                                  title={c}
                                  style={{
                                    background: c,
                                    width: 26,
                                    height: 26,
                                    outline: "2px solid rgba(0,0,0,0.55)",
                                    outlineOffset: "-1px",
                                  }}
                                  className={cn(
                                    "transition-all duration-200",
                                    formData.fontColor === c
                                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#FF4D00] scale-110"
                                      : "opacity-80 hover:opacity-100 hover:scale-105"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 4: Effect ── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                PICK YOUR<br />EFFECT.
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {EFFECTS.map(e => {
                  const isSel = formData.effectId === e.id;
                  return (
                    <div key={e.id}>
                      <button
                        onClick={() => {
                          setFormData({ ...formData, effectId: e.id as any });
                          setEffectPreviewKey(k => k + 1);
                        }}
                        className={cn(
                          "w-full p-5 md:p-6 transition-all duration-200 flex items-center justify-between border-2 text-left",
                          isSel
                            ? "bg-white text-[#FF4D00] border-white"
                            : "border-white/30 opacity-65 hover:opacity-95"
                        )}
                      >
                        <div>
                          <div className="text-xl md:text-2xl uppercase" style={{ fontFamily: LG_FONT }}>{e.label}</div>
                          <div className="text-[11px] mt-0.5 opacity-60 font-medium">{e.desc}</div>
                        </div>
                        {isSel && <Check className="w-6 h-6 flex-shrink-0 ml-4" />}
                      </button>

                      {/* Inline accordion — animation preview expands under selected effect */}
                      <div className={cn(
                        "grid transition-all duration-300",
                        isSel ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}>
                        <div className="overflow-hidden">
                          {isSel && (
                            <TitleEffectPreview
                              key={`${e.id}-${effectPreviewKey}`}
                              title={formData.title}
                              fontFamily={selectedFont.family}
                              fontColor={formData.fontColor ?? "#ffffff"}
                              effectId={e.id}
                              startDelay={320}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 5: Share ── */}
          {step === 5 && createdInvitation && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                YOU'RE READY<br />TO PARTY!
              </h2>

              <div className="text-[13px] font-bold uppercase tracking-wider opacity-60 space-y-1">
                <p>{createdInvitation.title}</p>
                {createdInvitation.date && <p>{createdInvitation.date}</p>}
                {createdInvitation.location && <p>{createdInvitation.location}</p>}
              </div>

              <div className="p-5 md:p-7 bg-white text-black space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-55">
                  Your shareable link · expires in 8 h
                </p>
                <div
                  onClick={copyLink}
                  className="flex items-center gap-3 border-2 border-black p-4 cursor-pointer hover:bg-black/5 transition-colors group min-w-0"
                >
                  <LinkIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold truncate text-sm md:text-base flex-1 min-w-0">
                    {window.location.origin}/{createdInvitation.id}
                  </span>
                  <Copy className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                </div>
                <button
                  onClick={copyLink}
                  className="w-full bg-black text-white py-3 text-lg uppercase tracking-wider hover:bg-black/85 transition-colors"
                  style={{ fontFamily: LG_FONT }}
                >
                  Copy Link
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link
                  to={`/${createdInvitation.id}`}
                  target="_blank"
                  className="bg-black text-white py-5 flex items-center justify-center hover:bg-black/85 transition-colors text-lg uppercase tracking-wider"
                  style={{ fontFamily: LG_FONT }}
                >
                  PREVIEW
                </Link>
                <Button
                  onClick={resetBuilder}
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white/10 py-5 h-auto rounded-none text-lg uppercase tracking-wider"
                  style={{ fontFamily: LG_FONT }}
                >
                  CREATE NEW
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {step < 5 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/20 bg-[#FF4D00]">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="flex-1 py-5 font-bold uppercase tracking-widest text-sm border-r border-white/20 hover:bg-white/10 transition-colors"
              style={{ fontFamily: LG_FONT }}
            >
              BACK
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <button
            onClick={step === 4 ? () => createMutation.mutate(formData) : nextStep}
            disabled={createMutation.isPending}
            className={cn(
              "flex-1 py-5 font-bold uppercase tracking-widest text-sm transition-colors",
              createMutation.isPending ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
            )}
            style={{ fontFamily: LG_FONT }}
          >
            {createMutation.isPending ? "..." : step === 4 ? "CREATE!" : "NEXT"}
          </button>
        </div>
      )}

      {/* Decorative BG text */}
      <div
        className="fixed -bottom-16 -left-8 text-[18vw] leading-none opacity-[0.04] pointer-events-none select-none whitespace-nowrap"
        style={{ fontFamily: LG_FONT }}
      >
        LET'S CELEBRATE
      </div>

      {/* Copyright */}
      <div
        className="fixed bottom-3 right-4 z-20 text-[10px] uppercase tracking-widest pointer-events-none select-none"
        style={{ color: "rgba(255,255,255,0.18)", fontFamily: "'Montserrat', sans-serif" }}
      >
        © {new Date().getFullYear()} Invity. All rights reserved.
      </div>

      {/* Privacy Policy modal */}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}

      {/* Google sign-in modal */}
      {showSignIn && (
        <GoogleSignInModal onClose={() => setShowSignIn(false)} />
      )}
    </div>
  );
}
