import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CreateInvitationRequest, CreateInvitationResponse, Invitation } from "@shared/api";
import { toast } from "sonner";
import { supabase, signInWithGoogle, signOut } from "@/lib/supabase";
import { getCreatorId } from "@/lib/identity";
import gsap from "gsap";
import { Link } from "react-router-dom";
import { Check, Copy, Link as LinkIcon, Lock } from "lucide-react";
import { PRO_DESIGN_IDS, PRO_EFFECT_IDS, ALL_DESIGN_IDS } from "@shared/premium";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CANVAS_MAP, DESIGN_BG, DecryptedText, isLightColor } from "@/components/Postcard";
import { InAppBrowserBanner, detectInApp } from "@/components/InAppBrowserBanner";

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
  { id: "birthday",   label: "Birthday",   color: "border-2", style: { background: "linear-gradient(135deg,#38bdf8,#f472b6)", color: "#FFD700", borderColor: "#f472b6" } },
  { id: "space",      label: "Space",      color: "bg-[#0d1b3e] text-[#e8e4f8] border-2 border-[#e8e4f8]/40" },
  { id: "wedding",      label: "Wedding",      color: "bg-[#F1ECE1] text-[#3B3229] border-2 border-[#C08552]" },
  { id: "anniversary",  label: "Anniversary",  color: "bg-[#3C1420] text-[#C69749] border-2 border-[#C69749]" },
  { id: "genderreveal", label: "Gender Reveal", color: "border-2", style: { background: "linear-gradient(135deg,#F0A8BE,#9DC2E8)", color: "#3A332B", borderColor: "#C9963E" } },
  { id: "babyshower",   label: "Baby Shower",  color: "border-2", style: { background: "linear-gradient(135deg,#C9BFE0,#EFC9D2 55%,#BEE0CE)", color: "#3E362E", borderColor: "#A69884" } },
];

const EFFECTS = [
  { id: "static",    label: "Static",    desc: "Clean fade in, no movement" },
  { id: "glowing",   label: "Glowing",   desc: "Zooms in with a pulsing luminous glow" },
  { id: "glitching", label: "Glitching", desc: "Warps in with random RGB splits" },
  { id: "smoke",     label: "Smoke",     desc: "Drifts in, words billow like rising smoke" },
  { id: "decrypted", label: "Decrypted", desc: "Characters cycle through random glyphs then lock in" },
  { id: "assemble",  label: "Assemble",  desc: "Words fly in from every direction" },
  { id: "bouncing",  label: "Bouncing",  desc: "Pops in with energetic rhythmic bounce" },
  { id: "shimmer",   label: "Shimmer",   desc: "A band of light sweeps once across the words, then rests" },
  { id: "reveal",    label: "Reveal",    desc: "Hidden behind a wipe that slides away to unveil the title" },
  { id: "blossom",   label: "Blossom",   desc: "Each word blooms open with a soft elastic overshoot" },
];

const FONTS = [
  { id: "funky",    label: "Funky",    family: "'Fontdiner Swanky', cursive" },
  { id: "stampede", label: "Stamp", family: "'Vast Shadow', serif" },
  { id: "militant", label: "Militant", family: "'Black Ops One', sans-serif" },
  { id: "velvet",   label: "Velvet",   family: "'Lobster', cursive" },
  { id: "sleek",    label: "Sleek",    family: "'Basic', sans-serif" },
  { id: "bloom",    label: "Bloom",    family: "'Indie Flower', cursive" },
  { id: "slash",    label: "Slash",    family: "'Rubik Glitch', sans-serif" },
  { id: "fierce",   label: "Fierce",   family: "'Spicy Rice', cursive" },
  { id: "refined",   label: "Refined",   family: "'Cormorant Garamond', serif" },
  { id: "regal",     label: "Regal",     family: "'Cinzel', serif" },
  { id: "gentle",    label: "Gentle",    family: "'Quicksand', sans-serif" },
  { id: "bubbly",    label: "Bubbly",    family: "'Baloo 2', sans-serif" },
  { id: "sturdy",    label: "Sturdy",    family: "'Oswald', sans-serif" },
  { id: "mighty",    label: "Mighty",    family: "'Germania One', cursive" },
  { id: "griffy",    label: "Griffy",    family: "'Griffy', cursive" },
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

type AppTheme = "orange" | "sky" | "teal" | "warmgray";
const THEME_COLORS: Record<AppTheme, { hex: string; rgb: string }> = {
  orange:   { hex: "#F05A28", rgb: "240,90,40"   },
  sky:      { hex: "#0284C7", rgb: "2,132,199"   },
  teal:     { hex: "#14B8A6", rgb: "20,184,166"  },
  warmgray: { hex: "#7C6A5E", rgb: "124,106,94"  },
};

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
          className="absolute bottom-full left-0 mb-3 z-50 shadow-2xl w-72"
          style={{ background: "#1a0a00", border: "2px solid rgba(var(--brand-rgb),0.5)", fontFamily: "'Montserrat', sans-serif" }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(var(--brand-rgb),0.2)" }}>
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
                <div key={d} className="text-center text-[9px] font-bold tracking-wider pb-2" style={{ color: "rgba(var(--brand-rgb),0.6)" }}>
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
                      isSel   ? { background: "var(--brand)", color: "#fff", fontWeight: 700 } :
                      isToday ? { outline: "2px solid var(--brand)", outlineOffset: "-2px", color: "var(--brand)" } :
                                { color: "rgba(255,255,255,0.75)" }
                    }
                    onMouseEnter={e => { if (!isSel && !isPast) (e.currentTarget as HTMLElement).style.background = "rgba(var(--brand-rgb),0.18)"; }}
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
              style={{ borderTop: "1px solid rgba(var(--brand-rgb),0.2)", color: "var(--brand)" }}
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

          case "shimmer": {
            gsap.set(el, { opacity: 0, y: 24 });
            tl.to(el, { opacity: 1, y: 0, duration: 1.0 });
            // A white highlight is invisible against already-white/bright
            // text — flip it to a dark glint whenever the base is light.
            const highlight = isLightColor(fontColor) ? "#1a1a1a" : "#ffffff";
            el.style.backgroundImage = `linear-gradient(100deg, ${fontColor} 40%, ${highlight} 50%, ${fontColor} 60%)`;
            el.style.backgroundSize = "250% 100%";
            (el.style as any).webkitBackgroundClip = "text";
            el.style.backgroundClip = "text";
            el.style.color = "transparent";
            (el.style as any).webkitTextFillColor = "transparent";
            gsap.fromTo(el,
              { backgroundPosition: "180% 0" },
              { backgroundPosition: "-80% 0", duration: 2.2, repeat: -1, repeatDelay: 1.4, ease: "power1.inOut", delay: 1.1 }
            );
            break;
          }

          case "reveal":
            gsap.set(el, { opacity: 1, clipPath: "inset(0 100% 0 0)" });
            tl.to(el, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power3.inOut" });
            break;

          case "blossom":
            gsap.set(el, { opacity: 1 });
            if (words.length) {
              gsap.set(words, { opacity: 0, scale: 0 });
              tl.to(words, { opacity: 1, scale: 1, stagger: 0.09, duration: 0.6, ease: "back.out(2.2)" });
            }
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
// Account menu
// ─────────────────────────────────────────────────────────────────────────────

function AccountMenu({
  email,
  isPro,
  periodEnd,
  cancelScheduled,
  onUpgrade,
}: {
  email: string;
  isPro: boolean;
  periodEnd: string | null;
  cancelScheduled: boolean;
  onUpgrade: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [hovered, setHovered]     = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const showSplash = open || hovered;

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
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error) {
      // Most likely the Paddle cancellation failed — deletion was aborted
      // server-side, so don't sign out and pretend it worked.
      setDeleting(false);
      toast.error("Couldn't delete your account (subscription cancellation failed). Try again or contact us.");
      return;
    }
    await signOut();
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

  const fill = "rgba(255,255,255,0.85)";
  const splashTransition = "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease";
  const dotTransition    = "transform 0.28s ease, opacity 0.22s ease";

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => { setOpen(o => !o); setConfirming(false); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="text-sm md:text-base uppercase tracking-widest font-bold opacity-80 hover:opacity-100 transition-opacity flex items-center gap-2"
        style={{ fontFamily: LG_FONT }}
      >
        ACCOUNT
        {/* 8px layout anchor — SVG floats centered over it */}
        <span style={{ position: "relative", display: "inline-block", width: "8px", height: "8px", flexShrink: 0 }}>
          <svg
            width="24" height="24"
            viewBox="0 0 100 100"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", overflow: "visible" }}
          >
            {/* Dot — shrinks away when splash shows */}
            <circle
              cx="50" cy="50" r="13"
              fill={fill}
              style={{
                transition: dotTransition,
                transformOrigin: "50px 50px",
                transform: showSplash ? "scale(0)" : "scale(1)",
                opacity: showSplash ? 0 : 1,
              }}
            />
            {/* Splash blob — irregular bezier curves, not a star */}
            <path
              d="M50,6 C59,1 70,7 71,17 C80,5 93,11 90,24 C99,23 101,38 92,41 C101,50 96,64 84,62 C89,75 80,83 68,77 C66,88 55,91 50,83 C45,91 34,88 32,77 C20,83 11,75 16,62 C4,64 -1,50 8,41 C-1,38 1,23 10,24 C7,11 20,5 29,17 C30,7 41,1 50,6 Z"
              fill={fill}
              style={{
                transition: splashTransition,
                transformOrigin: "50px 50px",
                transform: showSplash ? "scale(1)" : "scale(0)",
                opacity: showSplash ? 1 : 0,
              }}
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-56 z-50 flex flex-col"
          style={{ background: "#1a0800", border: "2px solid var(--brand-mid)" }}
        >
          {/* Email + plan */}
          <div
            className="px-4 py-3 space-y-1.5"
            style={{ borderBottom: "1px solid var(--brand-dim)" }}
          >
            <div className="text-[10px] uppercase tracking-widest truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
              {email}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5"
                style={
                  isPro
                    ? { background: "var(--brand)", color: "#fff" }
                    : { border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.55)" }
                }
              >
                {isPro ? "⭐ PRO" : "FREE"}
              </span>
              {isPro && periodEnd && (
                <span className="text-[9px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {cancelScheduled ? "ends" : "renews"} {new Date(periodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {!confirming ? (
            <>
              <Link
                to="/guests"
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full block"
                style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.92)" }}
              >
                Guest Lists
              </Link>
              {isPro ? (
                <button
                  onClick={openPortal}
                  disabled={portalBusy}
                  className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full disabled:opacity-40"
                  style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.92)" }}
                >
                  {portalBusy ? "OPENING..." : "Manage Subscription"}
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); onUpgrade(); }}
                  className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                  style={{ fontFamily: LG_FONT, color: "var(--brand)" }}
                >
                  ⭐ Upgrade to Pro
                </button>
              )}
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.92)" }}
              >
                Sign Out
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="px-4 py-3 text-left text-[12px] uppercase tracking-wider hover:bg-white/8 transition-colors w-full"
                style={{ fontFamily: LG_FONT, color: "rgba(255,80,80,0.8)" }}
              >
                Delete Account
              </button>
            </>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                This deletes all your invitations, cancels any Pro subscription, and signs you out. Are you sure?
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
        style={{ background: "#1a0800", border: "2px solid var(--brand-mid)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/30 hover:text-white transition-colors text-2xl leading-none"
        >
          ×
        </button>

        <div className="space-y-1">
          <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT, color: "var(--brand)" }}>
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

  const [showSignIn, setShowSignIn]   = useState(false);
  const [showInAppPrompt, setShowInAppPrompt] = useState(false);

  const [step, setStep] = useState(1);
  const [phraseIndices, setPhraseIndices] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [createdExpiresAt, setCreatedExpiresAt] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isPro, currentPeriodEnd, cancelScheduled } = useSubscription();
  const [theme, setTheme] = useState<AppTheme>(() =>
    (localStorage.getItem("invity_theme") as AppTheme) ?? "orange"
  );
  const { hex: BRAND, rgb: B_RGB } = THEME_COLORS[theme];
  const B_MID = `rgba(${B_RGB},0.45)`;
  const B_DIM = `rgba(${B_RGB},0.2)`;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setAuthState("signed-in");
        setShowSignIn(false);
      } else {
        setAuthState("signed-out");
        setUserEmail(null);
        // Only wipe the builder on an actual sign-out — INITIAL_SESSION also
        // lands here on page load and must not clear a restored draft
        if (event === "SIGNED_OUT") {
          setStep(1);
          setCreatedInvitation(null);
          setFormData({ title: "", message: "", date: "", location: "", designId: "minimal", effectId: "static", fontId: "funky", fontColor: "#ffffff" });
        }
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

  // Going Pro lifts the free-tier wall immediately
  useEffect(() => { if (isPro) setRateLimited(false); }, [isPro]);

  // /?upgrade=1 — entry point from the static /pricing page's GO PRO button
  // /?design=<id> — entry point from occasion landing pages (preselects a design)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const design = params.get("design");
    if (design && (ALL_DESIGN_IDS as readonly string[]).includes(design)) {
      setFormData(f => ({ ...f, designId: design as any }));
    }
    if (params.get("upgrade")) {
      setShowUpgrade(true);
    }
    if (design || params.get("upgrade")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Draft hand-off from an in-app browser (?draft=…) ──────────────────────
  // When CREATE is pressed inside LinkedIn/Instagram etc., we reopen the page
  // in a real browser with the form data in the URL so nothing is lost.
  useEffect(() => {
    const draft = new URLSearchParams(window.location.search).get("draft");
    if (!draft) return;
    try {
      const data = JSON.parse(draft) as Partial<CreateInvitationRequest>;
      setFormData(f => ({ ...f, ...data }));
      setStep(4);
    } catch { /* malformed draft — start fresh */ }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

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
    // Locked designs stay previewable in step 2 — only block moving past it
    if (step === 2 && !isPro && PRO_DESIGN_IDS.includes(formData.designId)) { setShowUpgrade(true); return; }
    animateStep(true);
  };
  const prevStep = () => animateStep(false);

  // ── Mutation — creation and all plan/limit checks now live server-side ──────
  const createMutation = useMutation({
    mutationFn: async (data: CreateInvitationRequest) => {
      const { data: res, error } = await supabase.functions.invoke("create-invitation", {
        body: { ...data, creatorId: getCreatorId() },
      });
      if (error) {
        let code = "";
        try { code = (await (error as any).context?.json())?.error ?? ""; } catch { /* non-JSON error */ }
        throw Object.assign(new Error(code || "create_failed"), { code });
      }
      return res as CreateInvitationResponse;
    },
    onSuccess: (data) => {
      setCreatedInvitation(data.invitation);
      setCreatedExpiresAt(data.expiresAt);
      animateStep(true, 5);
      toast.success("Invitation created! 🎉");
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code === "rate_limited") { setRateLimited(true); return; }
      if (err.code === "premium_required") { setShowUpgrade(true); return; }
      toast.error("Something went wrong. Try again.");
    },
  });

  // ── Create gate — sign-in is only required at the very last step ──────────
  const pendingCreateRef = useRef(false);

  const handleCreate = () => {
    // Locked effects stay previewable in step 4 — only block the actual create
    if (!isPro && PRO_EFFECT_IDS.includes(formData.effectId)) { setShowUpgrade(true); return; }
    if (authState !== "signed-in") {
      // Google OAuth is blocked inside in-app browsers (LinkedIn, Instagram…) —
      // hand the draft over to a real browser instead of opening the sign-in modal
      if (detectInApp().inApp) {
        setShowInAppPrompt(true);
        return;
      }
      pendingCreateRef.current = true;
      setShowSignIn(true);
      return;
    }
    createMutation.mutate(formData);
  };

  // Once sign-in completes, finish the create the user already asked for
  useEffect(() => {
    if (authState === "signed-in" && pendingCreateRef.current) {
      pendingCreateRef.current = false;
      createMutation.mutate(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState]);

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
        setCreatedExpiresAt(null);
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
      style={{
        background: BRAND, color: "#fff", fontFamily: "'Montserrat', sans-serif",
        "--brand": BRAND, "--brand-mid": B_MID, "--brand-dim": B_DIM,
      } as React.CSSProperties}
    >
      <div className="text-7xl">⏰</div>
      <h1 className="text-5xl md:text-7xl uppercase leading-none" style={{ fontFamily: LG_FONT }}>
        WHOOPSIE
      </h1>
      <p className="text-xl md:text-2xl uppercase tracking-widest font-bold" style={{ fontFamily: LG_FONT }}>
        TWO LINKS A DAY
      </p>
      <p className="text-base opacity-70 max-w-sm">
        You've hit your 2-link daily limit. Come back tomorrow — or go Pro and never see this screen again.
      </p>
      {!isPro && (
        <button
          onClick={() => setShowUpgrade(true)}
          className="mt-2 bg-white text-xl py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors"
          style={{ fontFamily: LG_FONT, color: BRAND }}
        >
          GO UNLIMITED — $2.99/MO
        </button>
      )}
      <button
        onClick={() => setRateLimited(false)}
        className="text-base py-3 px-8 uppercase tracking-wider transition-colors hover:bg-white/10"
        style={{ fontFamily: LG_FONT, border: "2px solid rgba(255,255,255,0.5)", color: "#fff" }}
      >
        Go Back
      </button>
      {showUpgrade && (
        <UpgradeModal
          onClose={() => { setShowUpgrade(false); if (isPro) setRateLimited(false); }}
          subtitle="Unlimited invitations, starting right now."
        />
      )}
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
        backgroundColor: step === 2 ? (DESIGN_BG[formData.designId] ?? BRAND) : BRAND,
        transition: "background-color 0.5s ease",
        "--brand": BRAND, "--brand-mid": B_MID, "--brand-dim": B_DIM, "--brand-rgb": B_RGB,
      } as React.CSSProperties}
    >
      <style>{`.brand-hover-text:hover { color: var(--brand) !important; }`}</style>

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
        <div className="flex flex-col pointer-events-auto gap-1.5">
          <h1
            className="text-2xl md:text-4xl tracking-tighter leading-none uppercase opacity-90 hover:opacity-100 transition-opacity"
            style={{ fontFamily: LG_FONT, cursor: step === 1 ? "default" : "pointer" }}
            onClick={() => {
              if (step === 1) return;
              if (step === 5) { resetBuilder(); return; }
              gsap.killTweensOf(containerRef.current);
              gsap.to(containerRef.current, {
                opacity: 0, x: 30, duration: 0.22, ease: "power2.in",
                onComplete: () => {
                  setStep(1);
                  gsap.fromTo(containerRef.current, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.28, ease: "power2.out" });
                },
              });
            }}
          >
            INVITY
          </h1>
          <div className="flex gap-[7px]">
            {(["orange", "sky", "teal", "warmgray"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTheme(t); localStorage.setItem("invity_theme", t); }}
                style={{
                  width: "15px", height: "15px",
                  borderRadius: "2px",
                  background: THEME_COLORS[t].hex,
                  border: theme === t ? "2px solid rgba(255,255,255,0.9)" : "2px solid rgba(255,255,255,0.22)",
                  boxShadow: theme === t ? "0 0 0 1.5px rgba(255,255,255,0.35)" : "none",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  cursor: "pointer", padding: 0, flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.4)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
          </div>
        </div>
        <div className="text-right pointer-events-auto space-y-2">
          {/* Sign in / Account — above phrase + dots */}
          {authState === "signed-in" ? (
            <AccountMenu
              email={userEmail ?? ""}
              isPro={isPro}
              periodEnd={currentPeriodEnd}
              cancelScheduled={cancelScheduled}
              onUpgrade={() => setShowUpgrade(true)}
            />
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
              className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] bg-white/5 hover:bg-white text-white brand-hover-text transition-all duration-300 group items-center justify-center border-y border-r border-white/20 hover:border-white"
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
            onClick={step === 4 ? handleCreate : nextStep}
            disabled={createMutation.isPending}
            className={cn(
              "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] transition-all duration-300 group items-center justify-center border-y border-l",
              createMutation.isPending
                ? "bg-white/20 border-white/20 cursor-not-allowed"
                : "bg-white/10 hover:bg-white text-white brand-hover-text border-white/20 hover:border-white"
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
      <main className="flex-1 flex items-start justify-center pt-28 md:pt-40 pb-40 md:pb-20 px-6 md:px-16" style={{ zIndex: 2 }}>
        <div ref={containerRef} className="max-w-3xl w-full relative">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {DESIGNS.map(d => {
                  const locked = !isPro && PRO_DESIGN_IDS.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => setFormData({ ...formData, designId: d.id as any })}
                      style={{ ...(d.style ?? {}), ...(formData.designId === d.id ? { "--tw-ring-offset-color": BRAND } : {}) } as React.CSSProperties}
                      className={cn(
                        "relative py-8 md:py-10 px-2 transition-all duration-200 flex items-center justify-center text-center",
                        d.color,
                        formData.designId === d.id
                          ? "scale-[1.02] ring-4 ring-white ring-offset-2"
                          : locked ? "opacity-45 hover:opacity-70" : "opacity-65 hover:opacity-95"
                      )}
                    >
                      <span className="text-base md:text-xl uppercase leading-tight" style={{ fontFamily: LG_FONT }}>{d.label}</span>
                      {formData.designId === d.id && <Check className="w-4 h-4 absolute top-1.5 right-1.5" />}
                      {locked && (
                        <span
                          className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                          style={{ background: "rgba(0,0,0,0.75)", color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
                        >
                          <Lock className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Font & Color ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                PICK YOUR<br />TEXT STYLE.
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FONTS.map(f => {
                  const isSel = formData.fontId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormData({ ...formData, fontId: f.id })}
                      className={cn(
                        "relative py-8 md:py-10 px-2 transition-all duration-200 flex items-center justify-center text-center border-2",
                        isSel ? "bg-white border-white" : "border-white/30 opacity-65 hover:opacity-95"
                      )}
                      style={isSel ? { color: BRAND } : undefined}
                    >
                      <span className="text-xl md:text-2xl uppercase" style={{ fontFamily: f.family }}>
                        {f.label}
                      </span>
                      {isSel && <Check className="w-4 h-4 absolute top-1.5 right-1.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Color picker + preview — always visible below the grid */}
              <div className="border-2 border-white/30 px-4 pt-4 pb-4 space-y-3 bg-white/5">
                <p
                  className="uppercase text-center leading-none"
                  style={{
                    fontFamily: selectedFont.family,
                    color: formData.fontColor,
                    fontSize: "clamp(1.6rem, 6vw, 2.6rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {formData.title || "PREVIEW"}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {COLOR_SWATCHES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, fontColor: c })}
                      title={c}
                      style={{
                        background: c,
                        width: 28,
                        height: 28,
                        outline: "2px solid rgba(0,0,0,0.55)",
                        outlineOffset: "-1px",
                        ...(formData.fontColor === c ? { "--tw-ring-offset-color": BRAND } : {}),
                      } as React.CSSProperties}
                      className={cn(
                        "transition-all duration-200",
                        formData.fontColor === c
                          ? "ring-2 ring-white ring-offset-2 scale-110"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Effect ── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: LG_FONT }}>
                PICK YOUR<br />EFFECT.
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {EFFECTS.map(e => {
                  const isSel = formData.effectId === e.id;
                  const locked = !isPro && PRO_EFFECT_IDS.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setFormData({ ...formData, effectId: e.id as any });
                        setEffectPreviewKey(k => k + 1);
                      }}
                      className={cn(
                        "relative py-8 md:py-10 px-2 transition-all duration-200 flex items-center justify-center text-center border-2",
                        isSel
                          ? "bg-white border-white"
                          : locked ? "border-white/30 opacity-40 hover:opacity-65" : "border-white/30 opacity-65 hover:opacity-95"
                      )}
                      style={isSel ? { color: BRAND } : undefined}
                    >
                      <span className="text-2xl md:text-3xl uppercase" style={{ fontFamily: LG_FONT }}>{e.label}</span>
                      {isSel && <Check className="w-4 h-4 absolute top-1.5 right-1.5" />}
                      {locked && (
                        <span
                          className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                          style={{ background: "rgba(0,0,0,0.75)", color: "#fff", fontFamily: "'Montserrat', sans-serif" }}
                        >
                          <Lock className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Preview panel — always visible below the grid */}
              {(() => {
                const selEffect = EFFECTS.find(e => e.id === formData.effectId) ?? EFFECTS[0];
                return (
                  <div className="border-2 border-white/30 px-4 pt-4 pb-4 space-y-3 bg-white/5">
                    <TitleEffectPreview
                      key={`${selEffect.id}-${effectPreviewKey}`}
                      title={formData.title}
                      fontFamily={selectedFont.family}
                      fontColor={formData.fontColor ?? "#ffffff"}
                      effectId={selEffect.id}
                      startDelay={200}
                    />
                    <p className="text-[11px] uppercase tracking-wider text-center opacity-60 font-medium">
                      {selEffect.desc}
                    </p>
                  </div>
                );
              })()}
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

              {(() => {
                const shareUrl = `${window.location.origin}/${createdInvitation.id}`;
                const waUrl = `https://wa.me/?text=${encodeURIComponent(`You're invited! 🎉 ${shareUrl}`)}`;
                const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent("You're invited! 🎉")}&url=${encodeURIComponent(shareUrl)}`;
                const igCopy = () => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(shareUrl).catch(() => fallbackCopy(shareUrl));
                  } else { fallbackCopy(shareUrl); }
                  toast.success("Link copied — paste it in Instagram!");
                };
                return (
                  <div className="p-5 md:p-7 bg-white text-black space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-55">
                      Your shareable link · expires in{" "}
                      {createdExpiresAt && new Date(createdExpiresAt).getTime() - Date.now() > 24 * 3_600_000
                        ? "30 days"
                        : "8 h"}
                    </p>
                    <div
                      onClick={copyLink}
                      className="flex items-center gap-3 border-2 border-black p-4 cursor-pointer hover:bg-black/5 transition-colors group min-w-0"
                    >
                      <LinkIcon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-bold truncate text-sm md:text-base flex-1 min-w-0">
                        {shareUrl}
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

                    {/* Social share */}
                    <div className="pt-1 space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Share on</p>
                      <div className="flex gap-2">
                        {/* WhatsApp */}
                        <a href={waUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center py-3 transition-opacity hover:opacity-80"
                          style={{ background: "#25D366" }}
                          title="Share on WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </a>
                        {/* Facebook */}
                        <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center py-3 transition-opacity hover:opacity-80"
                          style={{ background: "#1877F2" }}
                          title="Share on Facebook"
                        >
                          <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </a>
                        {/* Twitter / X */}
                        <a href={twUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center py-3 transition-opacity hover:opacity-80"
                          style={{ background: "#000" }}
                          title="Share on X"
                        >
                          <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </a>
                        {/* Instagram — copy + toast (no direct share URL) */}
                        <button
                          onClick={igCopy}
                          className="flex-1 flex items-center justify-center py-3 transition-opacity hover:opacity-80"
                          style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                          title="Copy link for Instagram"
                        >
                          <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex flex-col border-t border-white/20" style={{ background: BRAND }}>
        {step < 5 && (
          <div className="flex border-b border-white/10">
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
              onClick={step === 4 ? handleCreate : nextStep}
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
        <div className="flex items-center justify-center gap-3 py-2.5">
          <Link
            to="/pricing"
            className="text-[11px] uppercase tracking-widest"
            style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
          >
            Pricing
          </Link>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
          <Link
            to="/privacy"
            className="text-[11px] uppercase tracking-widest"
            style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
          >
            Privacy
          </Link>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
          <Link
            to="/terms"
            className="text-[11px] uppercase tracking-widest"
            style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
          >
            Terms
          </Link>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
          <Link
            to="/refunds"
            className="text-[11px] uppercase tracking-widest"
            style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
          >
            Refunds
          </Link>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Montserrat', sans-serif" }}>
            © {new Date().getFullYear()} Invity
          </span>
        </div>
      </div>

      {/* Decorative BG text */}
      <div
        className="fixed -bottom-16 -left-8 text-[18vw] leading-none opacity-[0.04] pointer-events-none select-none whitespace-nowrap"
        style={{ fontFamily: LG_FONT }}
      >
        LET'S CELEBRATE
      </div>

      {/* Footer — desktop only, mobile uses the bottom nav bar */}
      <div className="hidden md:flex fixed bottom-4 left-0 right-0 z-20 items-center justify-center gap-5 px-4 pointer-events-none select-none">
        <Link
          to="/pricing"
          className="pointer-events-auto text-[15px] uppercase tracking-widest transition-colors"
          style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        >
          Pricing
        </Link>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>·</span>
        <Link
          to="/privacy"
          className="pointer-events-auto text-[15px] uppercase tracking-widest transition-colors"
          style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        >
          Privacy Policy
        </Link>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>·</span>
        <Link
          to="/terms"
          className="pointer-events-auto text-[15px] uppercase tracking-widest transition-colors"
          style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        >
          Terms
        </Link>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>·</span>
        <Link
          to="/refunds"
          className="pointer-events-auto text-[15px] uppercase tracking-widest transition-colors"
          style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.75)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
        >
          Refunds
        </Link>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>·</span>
        <span className="text-[13px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Montserrat', sans-serif" }}>
          © {new Date().getFullYear()} Invity
        </span>
      </div>


      {/* Google sign-in modal */}
      {showSignIn && (
        <GoogleSignInModal onClose={() => { pendingCreateRef.current = false; setShowSignIn(false); }} />
      )}

      {/* In-app browser hand-off — shown only when CREATE needs Google auth */}
      {showInAppPrompt && (
        <InAppBrowserBanner
          dismissible
          onDismiss={() => setShowInAppPrompt(false)}
          url={`${window.location.origin}/?draft=${encodeURIComponent(JSON.stringify(formData))}`}
        />
      )}

      {/* Pro upsell */}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
