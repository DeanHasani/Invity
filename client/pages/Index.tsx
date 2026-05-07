import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CreateInvitationRequest, Invitation } from "@shared/api";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase";
import { getCreatorId } from "@/lib/identity";
import gsap from "gsap";
import { Link } from "react-router-dom";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

const STEP_PHRASES: Record<number, string[]> = {
  1: ["LET'S START", "HERE WE GO", "LET'S BEGIN", "KICK IT OFF"],
  2: ["PICK A LOOK", "DESIGN TIME", "STYLE IT", "LOOKING GOOD"],
  3: ["PICK YOUR VIBE", "SET THE EFFECT", "CHOOSE THE MOOD", "MAKE IT YOURS"],
  4: ["YOU DID IT!", "PARTY TIME!", "READY TO SEND", "BOOM!"],
};

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
      // never go before current month
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
      {/* Trigger — mirrors the underline Input style */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-2 bg-transparent border-white/40 border-t-0 border-x-0 border-b-2 rounded-none px-0 text-white transition-all py-4 text-base hover:border-white"
      >
        <span className={cn("flex-1 leading-none", !value && "text-white/20")}>
          {value || "e.g. Saturday, July 12"}
        </span>
        {/* Calendar icon */}
        <svg className="opacity-40 flex-shrink-0 mb-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="3" width="13" height="11.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          className="absolute top-full left-0 mt-3 z-50 shadow-2xl w-72"
          style={{ background: "#1a0a00", border: "2px solid rgba(255,77,0,0.5)", fontFamily: "'Montserrat', sans-serif" }}
        >
          {/* Month header */}
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
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[9px] font-bold tracking-wider pb-2" style={{ color: "rgba(255,77,0,0.55)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
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

          {/* Clear */}
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
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const [step, setStep] = useState(1);
  const [phraseIndices, setPhraseIndices] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<CreateInvitationRequest>({
    title:    "",
    message:  "",
    date:     "",
    location: "",
    designId: "minimal",
    effectId: "static",
  });

  useEffect(() => { randomizePhrases(); }, []);

  const randomizePhrases = () => {
    setPhraseIndices({
      1: Math.floor(Math.random() * STEP_PHRASES[1].length),
      2: Math.floor(Math.random() * STEP_PHRASES[2].length),
      3: Math.floor(Math.random() * STEP_PHRASES[3].length),
      4: Math.floor(Math.random() * STEP_PHRASES[4].length),
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
          date:       data.date     || null,
          location:   data.location || null,
          creator_id: creatorId,
          expires_at: expiresAt,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        invitation: {
          id:       row.id,
          title:    row.title,
          message:  row.message,
          designId: row.design_id,
          effectId: row.effect_id,
          date:     row.date     ?? undefined,
          location: row.location ?? undefined,
        } as Invitation,
      };
    },
    onSuccess: (data) => {
      setCreatedInvitation(data.invitation);
      animateStep(true, 4);
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
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  const resetBuilder = () => {
    gsap.to(containerRef.current, {
      opacity: 0, x: -30, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        setStep(1);
        setCreatedInvitation(null);
        randomizePhrases();
        setFormData({ title: "", message: "", date: "", location: "", designId: "minimal", effectId: "static" });
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
      <h1 className="text-5xl md:text-7xl uppercase leading-none" style={{ fontFamily: "'Oi', serif" }}>
        WHOOPSIE
      </h1>
      <p className="text-xl md:text-2xl uppercase tracking-widest font-bold" style={{ fontFamily: "'Oi', serif" }}>
        ONE LINK A DAY
      </p>
      <p className="text-base opacity-70 max-w-sm">
        You've already created an invitation today on this demo. Come back tomorrow and let's party again.
      </p>
      <button
        onClick={() => setRateLimited(false)}
        className="mt-2 bg-white text-[#FF4D00] text-xl py-4 px-10 uppercase tracking-wider hover:bg-white/90 transition-colors"
        style={{ fontFamily: "'Oi', serif" }}
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

  return (
    <div className="min-h-screen w-full bg-[#FF4D00] text-white flex flex-col select-none relative overflow-x-hidden" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-start md:items-center z-40 pointer-events-none">
        <h1
          className="text-2xl md:text-4xl tracking-tighter cursor-default leading-none uppercase opacity-90 pointer-events-auto"
          style={{ fontFamily: "'Oi', serif" }}
        >
          INVITY
        </h1>
        <div className="text-right pointer-events-auto">
          <p className="font-bold uppercase text-[11px] md:text-sm tracking-widest opacity-90">
            {STEP_PHRASES[step][phraseIndices[step]]}
          </p>
          <div className="flex gap-1 mt-1.5 justify-end">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={cn("h-1 rounded-full transition-all duration-300", step >= i ? "bg-white w-6" : "bg-white/30 w-4")}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── Side nav buttons — hidden on mobile, shown md+ ── */}
      {step < 4 && (
        <>
          {step > 1 && (
            <button
              onClick={prevStep}
              className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] bg-white/5 hover:bg-white text-white hover:text-[#FF4D00] transition-all duration-300 group items-center justify-center border-y border-r border-white/20 hover:border-white"
              aria-label="Previous step"
            >
              <span
                className="-rotate-90 whitespace-nowrap tracking-widest uppercase group-hover:scale-110 transition-transform text-xl"
                style={{ fontFamily: "'Oi', serif" }}
              >
                BACK
              </span>
            </button>
          )}
          <button
            onClick={step === 3 ? () => createMutation.mutate(formData) : nextStep}
            disabled={createMutation.isPending}
            className={cn(
              "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 w-14 h-[38vh] transition-all duration-300 group items-center justify-center border-y border-l",
              createMutation.isPending
                ? "bg-white/20 border-white/20 cursor-not-allowed"
                : "bg-white/10 hover:bg-white text-white hover:text-[#FF4D00] border-white/20 hover:border-white"
            )}
            aria-label={step === 3 ? "Create" : "Next step"}
          >
            <span
              className="rotate-90 whitespace-nowrap tracking-widest uppercase group-hover:scale-110 transition-transform text-xl"
              style={{ fontFamily: "'Oi', serif" }}
            >
              {createMutation.isPending ? "..." : step === 3 ? "CREATE!" : "NEXT"}
            </span>
          </button>
        </>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex items-start justify-center pt-28 md:pt-40 pb-28 md:pb-20 px-6 md:px-24 relative">
        <div ref={containerRef} className="max-w-xl w-full">

          {/* ── STEP 1: Event details ── */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: "'Oi', serif" }}>
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
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: "'Oi', serif" }}>
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
                    <span className="text-xl md:text-2xl uppercase" style={{ fontFamily: "'Oi', serif" }}>{d.label}</span>
                    {formData.designId === d.id && <Check className="w-6 h-6" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Effect (merged animation + text effect) ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: "'Oi', serif" }}>
                PICK YOUR<br />EFFECT.
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {EFFECTS.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setFormData({ ...formData, effectId: e.id as any })}
                    className={cn(
                      "p-5 md:p-6 transition-all duration-200 flex items-center justify-between border-2 text-left",
                      formData.effectId === e.id
                        ? "bg-white text-[#FF4D00] border-white"
                        : "border-white/30 opacity-65 hover:opacity-95"
                    )}
                  >
                    <div>
                      <div className="text-xl md:text-2xl uppercase" style={{ fontFamily: "'Oi', serif" }}>{e.label}</div>
                      <div className="text-[11px] mt-0.5 opacity-60 font-medium">{e.desc}</div>
                    </div>
                    {formData.effectId === e.id && <Check className="w-6 h-6 flex-shrink-0 ml-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: Share ── */}
          {step === 4 && createdInvitation && (
            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl leading-[1.08]" style={{ fontFamily: "'Oi', serif" }}>
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
                  style={{ fontFamily: "'Oi', serif" }}
                >
                  Copy Link
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link
                  to={`/${createdInvitation.id}`}
                  target="_blank"
                  className="bg-black text-white py-5 flex items-center justify-center hover:bg-black/85 transition-colors text-lg uppercase tracking-wider"
                  style={{ fontFamily: "'Oi', serif" }}
                >
                  PREVIEW
                </Link>
                <Button
                  onClick={resetBuilder}
                  variant="outline"
                  className="border-white text-white bg-transparent hover:bg-white/10 py-5 h-auto rounded-none text-lg uppercase tracking-wider"
                  style={{ fontFamily: "'Oi', serif" }}
                >
                  CREATE NEW
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {step < 4 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/20 bg-[#FF4D00]">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="flex-1 py-5 font-bold uppercase tracking-widest text-sm border-r border-white/20 hover:bg-white/10 transition-colors"
              style={{ fontFamily: "'Oi', serif" }}
            >
              BACK
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <button
            onClick={step === 3 ? () => createMutation.mutate(formData) : nextStep}
            disabled={createMutation.isPending}
            className={cn(
              "flex-1 py-5 font-bold uppercase tracking-widest text-sm transition-colors",
              createMutation.isPending ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"
            )}
            style={{ fontFamily: "'Oi', serif" }}
          >
            {createMutation.isPending ? "..." : step === 3 ? "CREATE!" : "NEXT"}
          </button>
        </div>
      )}

      {/* Decorative BG text */}
      <div
        className="fixed -bottom-16 -left-8 text-[18vw] leading-none opacity-[0.04] pointer-events-none select-none whitespace-nowrap"
        style={{ fontFamily: "'Oi', serif" }}
      >
        LET'S CELEBRATE
      </div>
    </div>
  );
}
