import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";
import { Invitation } from "@shared/api";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PostcardProps {
  invitation: Invitation;
  /** Pass true on the shareable /:id route to show RSVP + countdown */
  isLiveView?: boolean;
  /** Hours until the link expires. Default: 24 */
  expiresInHours?: number;
  /** Called when the viewer submits their RSVP name */
  onRsvp?: (name: string, status: "accepted" | "declined") => Promise<void>;
}

// Perceived-brightness check for a #rrggbb color. Used to flip effects that
// rely on a light/dark contrast (e.g. the shimmer highlight) so they still
// read against whichever font color the user picked.
export function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme config
// ─────────────────────────────────────────────────────────────────────────────

const THEME_BG: Record<string, string> = {
  minimal:    "bg-[#f5f0e8] text-[#1a1a1a]",
  playful:    "bg-[#7B2CBF] text-white",
  elegant:    "bg-[#070707] text-[#e8d5a3]",
  modernist:  "bg-[#c8924a] text-[#1a0800]",
  love:       "bg-[#b52a2a] text-white",
  natural:    "bg-[#1a2e14] text-[#d4e8b0]",
  scary:      "bg-[#04040c] text-[#ff4444]",
  futuristic: "bg-[#020b18] text-[#22d3ee]",
  cyberpunk:  "bg-[#08000f] text-[#ff00ff]",
  hacked:     "bg-[#010f04] text-[#00ff55]",
  birthday:   "bg-gradient-to-br from-[#38bdf8] to-[#f472b6] text-[#FFD700]",
  space:      "bg-[#03040e] text-[#e8e4f8]",
  wedding:      "bg-[#F1ECE1] text-[#3B3229]",
  anniversary:  "bg-[#3C1420] text-[#F3E4C8]",
  genderreveal: "bg-[#F7F3EC] text-[#3A332B]",
  babyshower:   "bg-[#EFEAE2] text-[#3E362E]",
};

// ─────────────────────────────────────────────────────────────────────────────
// Countdown hook
// ─────────────────────────────────────────────────────────────────────────────

function useCountdown(expiresAt: number): string {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(expiresAt - Date.now()), 1_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (remaining <= 0) return "LINK EXPIRED";
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  return `LINK EXPIRES IN ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-fit title font size
// Scales down as the title gets longer so it never overflows or wraps badly.
// ─────────────────────────────────────────────────────────────────────────────

function useTitleFontSize(title: string): string {
  const words     = title.trim().split(/\s+/);
  const wordCount = words.length;
  const allChars  = words.join("").length;
  const maxWord   = Math.max(...words.map(w => w.length));

  // Primary constraint: the longest single word must fit on one line.
  // Container usable width ≈ 720px desktop / 320px mobile; Oi serif uppercase ≈ 0.65ch/px.
  // Each bracket ensures that word never forces a mid-word break at any viewport.
  if (maxWord >= 14) return "clamp(1.2rem,3.8vw,2.6rem)";
  if (maxWord >= 12) return "clamp(1.5rem,4.8vw,3.2rem)";
  if (maxWord >= 10) return "clamp(1.9rem,5.8vw,4rem)";
  if (maxWord >= 8)  return "clamp(2.3rem,7vw,5rem)";
  if (maxWord >= 6)  return "clamp(2.8rem,8.5vw,6rem)";

  // Short words: scale by total character + word count as before
  if (allChars <= 4  && wordCount === 1) return "clamp(4.5rem,16vw,11rem)";
  if (allChars <= 6  && wordCount <= 2)  return "clamp(4rem,14vw,10rem)";
  if (allChars <= 10 && wordCount <= 3)  return "clamp(3.2rem,11vw,8rem)";
  if (allChars <= 16 && wordCount <= 4)  return "clamp(2.6rem,9vw,6.5rem)";
  if (allChars <= 24 && wordCount <= 5)  return "clamp(2rem,7vw,5rem)";
  if (allChars <= 36)                    return "clamp(1.6rem,5.5vw,4rem)";
  return                                        "clamp(1.3rem,4.5vw,3rem)";
}


// Always wrap every word so every animation/effect has .word-span targets.
// No trailing &nbsp; — we use a margin-right on the span instead.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// DecryptedText component (React Bits DecryptedText pattern)
// Each character cycles through random chars then resolves to the real one.
// Used as the title renderer when textEffectId === "decrypt"
// ─────────────────────────────────────────────────────────────────────────────

const DECRYPT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%!?<>";

interface DecryptedTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Class applied to each character span */
  charClassName?: string;
  /** Delay in ms before decryption starts */
  delay?: number;
  /** How many ms per character resolution (stagger) */
  charDelay?: number;
  /** How fast the random chars cycle (ms per frame) */
  shuffleSpeed?: number;
}

export function DecryptedText({
  text,
  className,
  style,
  charClassName = "title-word word-span inline-block",
  delay = 600,
  charDelay = 80,
  shuffleSpeed = 50,
}: DecryptedTextProps) {
  const [displayed, setDisplayed] = useState<string[]>(() =>
    text.split("").map(c => (c === " " ? " " : DECRYPT_CHARS[Math.floor(Math.random() * DECRYPT_CHARS.length)]))
  );
  const [resolved, setResolved] = useState<boolean[]>(() => text.split("").map(() => false));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    let lastUpdate = -1;
    startRef.current = null; // reset so elapsed is relative to this run's first frame

    const outer = setTimeout(() => {
      const chars = text.split("");

      const tick = (now: number) => {
        if (!startRef.current) startRef.current = now;
        const elapsed = now - startRef.current;

        if (lastUpdate < 0 || now - lastUpdate >= shuffleSpeed) {
          lastUpdate = now;
          setDisplayed(chars.map((c, i) => {
            if (c === " ") return " ";
            if (elapsed >= i * charDelay) return c;
            return DECRYPT_CHARS[Math.floor(Math.random() * DECRYPT_CHARS.length)];
          }));
          setResolved(chars.map((c, i) => c === " " || elapsed >= i * charDelay));
        }

        const allDone = elapsed >= (chars.length - 1) * charDelay + charDelay;
        if (!allDone) rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(outer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [text, delay, charDelay, shuffleSpeed]);

  return (
    <span className={className} style={style}>
      {(() => {
        // Split by whitespace runs so each word becomes a single non-breaking unit.
        // This prevents line breaks from landing mid-word on narrow containers.
        const segments = text.split(/(\s+)/);
        let charIdx = 0;
        return segments.map((seg, si) => {
          if (/^\s+$/.test(seg)) {
            charIdx += seg.length;
            return <span key={si} aria-hidden style={{ display: "inline-block", width: "0.3em" }} />;
          }
          const wordChars = seg.split("").map((_, ci) => {
            const gi = charIdx + ci;
            return (
              <span
                key={ci}
                style={{ opacity: resolved[gi] ? 1 : 0.3, transition: "opacity 0.1s" }}
              >
                {displayed[gi]}
              </span>
            );
          });
          charIdx += seg.length;
          return (
            <span
              key={si}
              className={charClassName}
              style={{ display: "inline-block", whiteSpace: "nowrap" }}
            >
              {wordChars}
            </span>
          );
        });
      })()}
    </span>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Theme canvas components
// ─────────────────────────────────────────────────────────────────────────────

function MinimalCanvas() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-[36px] border border-black/10 pointer-events-none" />
      <div className="absolute inset-[48px] border border-black/5 pointer-events-none" />
    </>
  );
}

function PlayfulCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;

    const POOL: { src: string; minSize: number; maxSize: number }[] = [
      ...Array(11).fill({ src: "/playful/confetti.png", minSize: 45, maxSize: 80 }),
      ...Array(9).fill({  src: "/playful/unicorn.png",  minSize: 85, maxSize: 150 }),
    ].sort(() => Math.random() - 0.5);

    const items: HTMLImageElement[] = [];
    POOL.forEach(cfg => {
      const img = document.createElement("img");
      const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
      const dx   = (Math.random() - 0.5) * 220;
      const dr   = Math.random() * 360 - 180;
      img.src = cfg.src;
      img.alt = "";
      img.draggable = false;
      img.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:auto`,
        `left:${Math.random() * 100}%`,
        `top:-${size + 20}px`,
        `opacity:${Math.random() * 0.35 + 0.18}`,
        `pointer-events:none`,
        `user-select:none`,
      ].join(";");
      el.appendChild(img); items.push(img);
      gsap.to(img, {
        y: window.innerHeight + size + 40,
        x: dx,
        rotation: dr,
        duration: 8 + Math.random() * 9,
        delay: Math.random() * 3,
        repeat: -1,
        ease: "none",
      });
    });
    return () => items.forEach(img => img.remove());
  }, []);
  return <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />;
}

function ElegantCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const items: HTMLDivElement[] = [];
    for (let i = 0; i < 28; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 3.5 + 0.8;
      p.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:${size}px`,
        `background:#c9a84c`,
        `border-radius:50%`,
        `left:${Math.random() * 100}%`,
        `bottom:-6px`,
        `opacity:0`,
        `pointer-events:none`,
        `box-shadow:0 0 4px rgba(201,168,76,0.6)`,
      ].join(";");
      el.appendChild(p); items.push(p);
      gsap.fromTo(p,
        { opacity: 0 },
        { opacity: 0.9, duration: 4 + Math.random() * 6, repeat: -1, yoyo: true, ease: "power1.out", delay: Math.random() * 8 }
      );
    }
    return () => items.forEach(p => p.remove());
  }, []);
  const corners = [
    "top-[24px] left-[24px]",
    "top-[24px] right-[24px] rotate-90",
    "bottom-[24px] left-[24px] -rotate-90",
    "bottom-[24px] right-[24px] rotate-180",
  ];
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute inset-[28px] border border-[#c9a84c]/20 pointer-events-none" />
      <div className="absolute inset-[40px] border border-[#c9a84c]/8 pointer-events-none" />
      {corners.map((cls, i) => (
        <div key={i} className={`absolute ${cls} w-8 h-8 pointer-events-none`}>
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M2 30 L2 2 L30 2" stroke="#c9a84c" strokeWidth="1" strokeOpacity="0.45" />
          </svg>
        </div>
      ))}
    </>
  );
}

function ModernistCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const svgs: SVGSVGElement[] = [];

    const BUILDINGS: { left: string; top: string; w: number; h: number; vb: string; paths: string[]; delay: number }[] = [
      {
        left: "5%", top: "5%", w: 130, h: 280, vb: "0 0 130 280", delay: 0,
        paths: [
          "M15 280 L15 30 L115 30 L115 280",
          "M15 30 L65 5 L115 30",
          "M15 30 L15 45 L115 45",
          "M25 60 L55 60 L55 85 L25 85 Z",
          "M75 60 L105 60 L105 85 L75 85 Z",
          "M25 98 L55 98 L55 123 L25 123 Z",
          "M75 98 L105 98 L105 123 L75 123 Z",
          "M25 136 L55 136 L55 161 L25 161 Z",
          "M75 136 L105 136 L105 161 L75 161 Z",
          "M25 174 L55 174 L55 199 L25 199 Z",
          "M75 174 L105 174 L105 199 L75 199 Z",
          "M25 212 L55 212 L55 237 L25 237 Z",
          "M75 212 L105 212 L105 237 L75 237 Z",
          "M45 250 L85 250 L85 280 L45 280 Z",
        ],
      },
      {
        left: "27%", top: "18%", w: 200, h: 240, vb: "0 0 200 240", delay: 3500,
        paths: [
          "M0 240 L0 70 L200 70 L200 240",
          "M0 70 L100 20 L200 70",
          "M15 90 L45 90 L45 130 L15 130 Z",
          "M77.5 90 L107.5 90 L107.5 130 L77.5 130 Z",
          "M155 90 L185 90 L185 130 L155 130 Z",
          "M15 145 L45 145 L45 185 L15 185 Z",
          "M77.5 145 L107.5 145 L107.5 185 L77.5 185 Z",
          "M155 145 L185 145 L185 185 L155 185 Z",
          "M75 190 L125 190 L125 240 L75 240 Z",
          "M10 65 L16 65 L16 72 L10 72 Z",
          "M30 65 L36 65 L36 72 L30 72 Z",
          "M164 65 L170 65 L170 72 L164 72 Z",
          "M184 65 L190 65 L190 72 L184 72 Z",
        ],
      },
      {
        left: "57%", top: "4%", w: 160, h: 310, vb: "0 0 160 310", delay: 7000,
        paths: [
          "M40 310 L40 80 L120 80 L120 310",
          "M0 310 L0 170 L160 170 L160 310",
          "M48 100 L112 100 L112 125 L48 125 Z",
          "M48 135 L112 135 L112 160 L48 160 Z",
          "M8 188 L38 188 L38 213 L8 213 Z",
          "M122 188 L152 188 L152 213 L122 213 Z",
          "M8 225 L38 225 L38 250 L8 250 Z",
          "M122 225 L152 225 L152 250 L122 250 Z",
          "M8 262 L38 262 L38 287 L8 287 Z",
          "M122 262 L152 262 L152 287 L122 287 Z",
          "M55 185 L105 185 L105 215 L55 215 Z",
          "M55 225 L105 225 L105 255 L55 255 Z",
          "M60 270 L100 270 L100 310 L60 310 Z",
        ],
      },
      {
        left: "80%", top: "10%", w: 120, h: 270, vb: "0 0 120 270", delay: 10500,
        paths: [
          "M15 270 L15 25 L105 25 L105 270",
          "M5 25 L60 0 L115 25",
          "M15 25 L15 35 L105 35",
          "M20 40 L40 40", "M80 40 L100 40",
          "M20 46 L40 46", "M80 46 L100 46",
          "M22 55 L58 55 L58 80 L22 80 Z",
          "M62 55 L98 55 L98 80 L62 80 Z",
          "M22 90 L58 90 L58 115 L22 115 Z",
          "M62 90 L98 90 L98 115 L62 115 Z",
          "M22 125 L58 125 L58 150 L22 150 Z",
          "M62 125 L98 125 L98 150 L62 150 Z",
          "M22 160 L58 160 L58 185 L22 185 Z",
          "M62 160 L98 160 L98 185 L62 185 Z",
          "M22 195 L58 195 L58 220 L22 220 Z",
          "M62 195 L98 195 L98 220 L62 220 Z",
          "M38 230 L82 230 L82 270 L38 270 Z",
        ],
      },
    ];

    BUILDINGS.forEach(bld => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", bld.vb);
      svg.setAttribute("width", String(bld.w));
      svg.setAttribute("height", String(bld.h));
      svg.style.cssText = `position:absolute;left:${bld.left};top:${bld.top};pointer-events:none;overflow:visible;opacity:0;`;

      const pathEls: SVGPathElement[] = [];
      bld.paths.forEach(d => {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", d);
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", "#1a0800");
        p.setAttribute("stroke-width", "1.5");
        p.setAttribute("stroke-linecap", "square");
        p.setAttribute("stroke-linejoin", "miter");
        svg.appendChild(p);
        pathEls.push(p);
      });

      el.appendChild(svg);
      svgs.push(svg);

      requestAnimationFrame(() => {
        const lengths = pathEls.map(p => p.getTotalLength());
        pathEls.forEach((p, i) => {
          p.style.strokeDasharray = String(lengths[i]);
          p.style.strokeDashoffset = String(lengths[i]);
        });

        const run = () => {
          gsap.set(svg, { opacity: 0.3 });
          let acc = 0;
          pathEls.forEach((p, i) => {
            const dur = Math.max(0.3, lengths[i] / 150);
            gsap.to(p, { strokeDashoffset: 0, duration: dur, delay: acc, ease: "power1.inOut" });
            acc += dur * 0.65;
          });
          gsap.to(svg, {
            opacity: 0, duration: 2.5, delay: acc + 5,
            onComplete: () => {
              pathEls.forEach((p, i) => gsap.set(p, { strokeDashoffset: lengths[i] }));
              setTimeout(run, 2000 + Math.random() * 3000);
            },
          });
        };

        setTimeout(run, bld.delay);
      });
    });

    return () => svgs.forEach(s => s.remove());
  }, []);

  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute top-0 left-0 w-full pointer-events-none" style={{ height: "3px", background: "rgba(26,8,0,0.35)" }} />
      <div className="absolute top-0 left-0 h-full pointer-events-none" style={{ width: "3px", background: "rgba(26,8,0,0.35)" }} />
    </>
  );
}

function LoveCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const SYMS = ["♥", "♡", "❤", "💕"];
    const items: HTMLDivElement[] = [];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement("div");
      const size = Math.random() * 2 + 0.6;
      const dx = (Math.random() - 0.5) * 260;
      const dr = Math.random() * 360 - 180;
      p.style.cssText = [
        `position:absolute`,
        `font-size:${size}rem`,
        `color:rgba(255,255,255,${Math.random() * 0.3 + 0.1})`,
        `left:${Math.random() * 100}%`,
        `top:-8%`,
        `pointer-events:none`,
        `user-select:none`,
      ].join(";");
      p.textContent = SYMS[Math.floor(Math.random() * SYMS.length)];
      el.appendChild(p); items.push(p);
      gsap.to(p, {
        y: window.innerHeight + 100, x: dx, rotation: dr,
        duration: 8 + Math.random() * 8, delay: Math.random() * 10,
        repeat: -1, ease: "none",
      });
    }
    return () => items.forEach(p => p.remove());
  }, []);
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(255,80,80,0.14),transparent 68%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 120px rgba(180,30,30,0.35)" }} />
    </>
  );
}

function NaturalCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;

    const SRCS = ["/nature/leaf1.png", "/nature/leaf2.png", "/nature/leaf3.png", "/nature/leaf4.png"];
    // 5 of each leaf = 20 total, shuffled
    const POOL = [...SRCS, ...SRCS, ...SRCS, ...SRCS, ...SRCS].sort(() => Math.random() - 0.5);

    const items: HTMLImageElement[] = [];
    POOL.forEach(src => {
      const img = document.createElement("img");
      const size = 30 + Math.random() * 50;
      const dx   = (Math.random() - 0.5) * 350;
      const dr   = Math.random() * 720 - 360;
      img.src = src;
      img.alt = "";
      img.draggable = false;
      img.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:auto`,
        `left:${Math.random() * 100}%`,
        `top:-${size + 12}px`,
        `opacity:${Math.random() * 0.55 + 0.3}`,
        `pointer-events:none`,
        `user-select:none`,
      ].join(";");
      el.appendChild(img); items.push(img);
      gsap.to(img, {
        y: window.innerHeight + size + 20,
        x: dx,
        rotation: dr,
        duration: 10 + Math.random() * 10,
        delay: Math.random() * 3,
        repeat: -1,
        ease: "none",
      });
    });
    return () => items.forEach(img => img.remove());
  }, []);
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[120%] h-[35%] pointer-events-none"
        style={{ background: "linear-gradient(to top,rgba(6,16,4,0.7),transparent)", animation: "fogdrift 15s ease-in-out infinite" }} />
    </>
  );
}

function BirthdayCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;

    const POOL = [
      ...Array(8).fill({ src: "/birthday/balloons.png", minSize: 55, maxSize: 95 }),
      ...Array(4).fill({ src: "/birthday/cake.png",     minSize: 65, maxSize: 100 }),
      ...Array(7).fill({ src: "/birthday/candle.png",   minSize: 30, maxSize: 52 }),
    ].sort(() => Math.random() - 0.5);

    const items: HTMLImageElement[] = [];
    POOL.forEach(cfg => {
      const img = document.createElement("img");
      const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize);
      img.src = cfg.src;
      img.alt = "";
      img.draggable = false;
      img.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:auto`,
        `left:${Math.random() * 90}%`,
        `top:${Math.random() * 86}%`,
        `opacity:${0.14 + Math.random() * 0.20}`,
        `pointer-events:none`,
        `user-select:none`,
      ].join(";");
      el.appendChild(img);
      items.push(img);

      const floatDur  = 4 + Math.random() * 4;
      const driftDur  = 3.5 + Math.random() * 3.5;
      const spinDur   = 4 + Math.random() * 4;
      const floatAmt  = 18 + Math.random() * 28;
      const driftAmt  = 12 + Math.random() * 22;
      const spinAmt   = 6 + Math.random() * 10;

      gsap.to(img, { y: floatAmt,  duration: floatDur, repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 5 });
      gsap.to(img, { x: driftAmt,  duration: driftDur, repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 4 });
      gsap.to(img, { rotation: spinAmt, duration: spinDur,  repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 3 });
    });

    return () => items.forEach(img => img.remove());
  }, []);

  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 42%, rgba(255,215,0,0.07) 0%, transparent 68%)" }} />
    </>
  );
}

function ScaryCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;

    // Blood drips — single tapered element, no ball
    [4, 11, 19, 28, 36, 45, 53, 62, 70, 79, 87, 94].forEach(pos => {
      const w      = 4 + Math.random() * 5;
      const r      = Math.round(w / 2);          // tip radius = half the width
      const finalH = 110 + Math.random() * 210;

      const d = document.createElement("div");
      d.style.cssText = [
        `position:absolute`,
        `left:${pos}%`,
        `top:0`,
        `transform:translateX(-50%)`,
        `width:${w}px`,
        `height:0`,
        `background:linear-gradient(to bottom,#2a0000 0%,#7a0000 55%,#aa0000 100%)`,
        `border-radius:0 0 ${r}px ${r}px`,
        `box-shadow:0 0 7px rgba(139,0,0,0.5)`,
        `pointer-events:none`,
      ].join(";");
      el.appendChild(d);

      gsap.to(d, {
        height: finalH,
        duration: 2.5 + Math.random() * 3.5,
        delay: Math.random() * 5,
        ease: "power2.in",
      });
    });

    // Emojis — 4 of each type scattered randomly across the background
    const EMOJIS = [
      ...Array(4).fill("👻"),
      ...Array(4).fill("💀"),
      ...Array(4).fill("🕷"),
      ...Array(4).fill("🦇"),
    ];
    EMOJIS.forEach(sym => {
      const g = document.createElement("div");
      g.textContent = sym;
      g.style.cssText = [
        `position:absolute`,
        `font-size:${1.4 + Math.random() * 2.8}rem`,
        `left:${Math.random() * 90}%`,
        `top:${Math.random() * 82}%`,
        `opacity:0`,
        `filter:blur(1.5px)`,
        `pointer-events:none`,
        `user-select:none`,
      ].join(";");
      el.appendChild(g);
      gsap.to(g, {
        opacity: Math.random() * 0.22 + 0.05,
        y: (Math.random() - 0.5) * 60,
        x: (Math.random() - 0.5) * 30,
        duration: 3.5 + Math.random() * 3.5,
        repeat: -1, yoyo: true, delay: Math.random() * 6, ease: "sine.inOut",
      });
    });

    return () => { el.innerHTML = ""; };
  }, []);
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 160px rgba(100,0,0,0.55)" }} />
      <div className="absolute bottom-0 left-[-10%] w-[120%] h-[50%] pointer-events-none"
        style={{ background: "linear-gradient(to top,rgba(2,0,8,0.92),transparent)", animation: "fogdrift 18s ease-in-out infinite" }} />
    </>
  );
}

// ── FUTURISTIC: GridScan — direct WebGL 2.0 port of the React Bits shader ───
// Raycasts against 4 planes to build a real 3D perspective tunnel.
// The scan band sweeps through Z (depth) — you see it fly through the grid.
const GRIDSCAN_VERT = `#version 300 es
in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos,0.0,1.0); }`;

const GRIDSCAN_FRAG = `#version 300 es
precision highp float;
uniform vec3  iResolution;
uniform float iTime;
uniform vec2  uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3  uLinesColor;
uniform vec3  uScanColor;
uniform float uGridScale;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
uniform float uScanStarts[8];
uniform float uScanCount;
const int MAX_SCANS=8;
out vec4 outColor;

float smoother01(float a,float b,float x){
  float t=clamp((x-a)/max(1e-5,(b-a)),0.0,1.0);
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 p=(2.0*fragCoord-iResolution.xy)/iResolution.y;
  vec3 ro=vec3(0.0);
  vec3 rd=normalize(vec3(p,2.0));
  float cR=cos(uTilt),sR=sin(uTilt);
  rd.xy=mat2(cR,-sR,sR,cR)*rd.xy;
  float cY=cos(uYaw),sY=sin(uYaw);
  rd.xz=mat2(cY,-sY,sY,cY)*rd.xz;
  vec2 skew=clamp(uSkew,vec2(-0.7),vec2(0.7));
  rd.xy+=skew*rd.z;
  vec3 color=vec3(0.0);
  float minT=1e20;
  float gridScale=max(1e-5,uGridScale);
  float fadeStrength=2.0;
  vec2 gridUV=vec2(0.0);
  float hitIsY=1.0;
  for(int i=0;i<4;i++){
    float isY=float(i<2);
    float pos=mix(-0.2,0.2,float(i))*isY+mix(-0.5,0.5,float(i-2))*(1.0-isY);
    float num=pos-(isY*ro.y+(1.0-isY)*ro.x);
    float den=isY*rd.y+(1.0-isY)*rd.x;
    float t=num/den;
    vec3 h=ro+rd*t;
    float depthBoost=smoothstep(0.0,3.0,h.z);
    h.xy+=skew*0.15*depthBoost;
    bool use=t>0.0&&t<minT;
    gridUV=use?mix(h.zy,h.xz,isY)/gridScale:gridUV;
    minT=use?t:minT;
    hitIsY=use?isY:hitIsY;
  }
  vec3 hit=ro+rd*minT;
  float dist=length(hit-ro);
  float fx=fract(gridUV.x);
  float fy=fract(gridUV.y);
  float ax=min(fx,1.0-fx);
  float ay=min(fy,1.0-fy);
  float wx=fwidth(gridUV.x);
  float wy=fwidth(gridUV.y);
  float halfPx=max(0.0,uLineThickness)*0.5;
  float tx=halfPx*wx;
  float ty=halfPx*wy;
  float lineX=1.0-smoothstep(tx,tx+wx,ax);
  float lineY=1.0-smoothstep(ty,ty+wy,ay);
  float primaryMask=max(lineX,lineY);
  vec2 gridUV2=(hitIsY>0.5?hit.xz:hit.zy)/gridScale;
  float fx2=fract(gridUV2.x);
  float fy2=fract(gridUV2.y);
  float ax2=min(fx2,1.0-fx2);
  float ay2=min(fy2,1.0-fy2);
  float wx2=fwidth(gridUV2.x);
  float wy2=fwidth(gridUV2.y);
  float tx2=halfPx*wx2;
  float ty2=halfPx*wy2;
  float lineX2=1.0-smoothstep(tx2,tx2+wx2,ax2);
  float lineY2=1.0-smoothstep(ty2,ty2+wy2,ay2);
  float altMask=max(lineX2,lineY2);
  float edgeDistX=min(abs(hit.x-(-0.5)),abs(hit.x-0.5));
  float edgeDistY=min(abs(hit.y-(-0.2)),abs(hit.y-0.2));
  float edgeDist=mix(edgeDistY,edgeDistX,hitIsY);
  float edgeGate=1.0-smoothstep(gridScale*0.5,gridScale*2.0,edgeDist);
  altMask*=edgeGate;
  float lineMask=max(primaryMask,altMask);
  float fade=exp(-dist*fadeStrength);
  float dur=max(0.05,uScanDuration);
  float del=max(0.0,uScanDelay);
  float scanZMax=2.0;
  float widthScale=max(0.1,uScanGlow);
  float sigma=max(0.001,0.18*widthScale*uScanSoftness);
  float sigmaA=sigma*2.0;
  float combinedPulse=0.0;
  float combinedAura=0.0;
  float cycle=dur+del;
  float tCycle=mod(iTime,cycle);
  float scanPhase=clamp((tCycle-del)/dur,0.0,1.0);
  float phase=scanPhase;
  if(uScanDirection>0.5&&uScanDirection<1.5){
    phase=1.0-phase;
  } else if(uScanDirection>1.5){
    float t2=mod(max(0.0,iTime-del),2.0*dur);
    phase=(t2<dur)?(t2/dur):(1.0-(t2-dur)/dur);
  }
  float scanZ=phase*scanZMax;
  float dz=abs(hit.z-scanZ);
  float lineBand=exp(-0.5*(dz*dz)/(sigma*sigma));
  float taper=clamp(uPhaseTaper,0.0,0.49);
  float headW=taper;
  float tailW=taper;
  float headFade=smoother01(0.0,headW,phase);
  float tailFade=1.0-smoother01(1.0-tailW,1.0,phase);
  float phaseWindow=headFade*tailFade;
  float pulseBase=lineBand*phaseWindow;
  combinedPulse+=pulseBase*clamp(uScanOpacity,0.0,1.0);
  float auraBand=exp(-0.5*(dz*dz)/(sigmaA*sigmaA));
  combinedAura+=(auraBand*0.25)*phaseWindow*clamp(uScanOpacity,0.0,1.0);
  for(int i=0;i<MAX_SCANS;i++){
    if(float(i)>=uScanCount) break;
    float tA=iTime-uScanStarts[i];
    float phI=clamp(tA/dur,0.0,1.0);
    if(uScanDirection>0.5&&uScanDirection<1.5){phI=1.0-phI;}
    else if(uScanDirection>1.5){phI=(phI<0.5)?(phI*2.0):(1.0-(phI-0.5)*2.0);}
    float szI=phI*scanZMax;
    float dzI=abs(hit.z-szI);
    float lbI=exp(-0.5*(dzI*dzI)/(sigma*sigma));
    float hfI=smoother01(0.0,headW,phI);
    float tfI=1.0-smoother01(1.0-tailW,1.0,phI);
    float pwI=hfI*tfI;
    combinedPulse+=lbI*pwI*clamp(uScanOpacity,0.0,1.0);
    float abI=exp(-0.5*(dzI*dzI)/(sigmaA*sigmaA));
    combinedAura+=(abI*0.25)*pwI*clamp(uScanOpacity,0.0,1.0);
  }
  float lineVis=lineMask;
  vec3 gridCol=uLinesColor*lineVis*fade;
  vec3 scanCol=uScanColor*combinedPulse;
  vec3 scanAura=uScanColor*combinedAura;
  color=gridCol+scanCol+scanAura;
  float n=fract(sin(dot(gl_FragCoord.xy+vec2(iTime*123.4),vec2(12.9898,78.233)))*43758.5453123);
  color+=(n-0.5)*uNoise;
  color=clamp(color,0.0,1.0);
  float alpha=clamp(max(lineVis,combinedPulse),0.0,1.0);
  float gx=1.0-smoothstep(tx*2.0,tx*2.0+wx*2.0,ax);
  float gy=1.0-smoothstep(ty*2.0,ty*2.0+wy*2.0,ay);
  float halo=max(gx,gy)*fade;
  alpha=max(alpha,halo*0.0);
  fragColor=vec4(color,alpha);
}

void main(){ mainImage(outColor,gl_FragCoord.xy); }`;

function FuturisticCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const gl = canvas.getContext("webgl2",
      { alpha: true, antialias: false, powerPreference: "low-power" }) as WebGL2RenderingContext | null;
    if (!gl) return;

    // Compile helper
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("GridScan shader error:", gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER,   GRIDSCAN_VERT);
    const fs = compile(gl.FRAGMENT_SHADER, GRIDSCAN_FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("GridScan link error:", gl.getProgramInfoLog(prog)); return;
    }
    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);

    // Set static uniforms — cyan tunnel (#22d3ee in linear sRGB)
    gl.uniform2f(u("uSkew"),          0, 0);
    gl.uniform1f(u("uTilt"),          0);
    gl.uniform1f(u("uYaw"),           0);
    gl.uniform1f(u("uLineThickness"), 2.0);
    gl.uniform3f(u("uLinesColor"),    0.0245, 0.671, 0.870);
    gl.uniform3f(u("uScanColor"),     0.0245, 0.671, 0.870);
    gl.uniform1f(u("uGridScale"),     0.1);
    gl.uniform1f(u("uScanOpacity"),   0.95);
    gl.uniform1f(u("uScanDirection"), 2);     // pingpong
    gl.uniform1f(u("uNoise"),         0.006);
    gl.uniform1f(u("uScanGlow"),      1.2);
    gl.uniform1f(u("uScanSoftness"),  2.0);
    gl.uniform1f(u("uPhaseTaper"),    0.15);
    gl.uniform1f(u("uScanDuration"),  2.5);
    gl.uniform1f(u("uScanDelay"),     0.8);
    gl.uniform1fv(u("uScanStarts"),   new Float32Array(8));
    gl.uniform1f(u("uScanCount"),     0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let raf = 0;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(u("iResolution"), canvas.width, canvas.height, 1);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();
    const tick = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u("iTime"), (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs); gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  // Floating cyan spark particles rising from the bottom
  useEffect(() => {
    const el = particleRef.current; if (!el) return;
    const items: HTMLDivElement[] = [];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("div");
      const size = 1 + Math.random() * 2.5;
      p.style.cssText = [
        `position:absolute`, `width:${size}px`, `height:${size}px`,
        `background:#22d3ee`, `border-radius:50%`,
        `left:${Math.random() * 100}%`, `bottom:-4px`,
        `opacity:0`, `pointer-events:none`,
        `box-shadow:0 0 6px #22d3ee`,
      ].join(";");
      el.appendChild(p); items.push(p);
      gsap.fromTo(p,
        { opacity: 0 },
        { opacity: 0.9, duration: 3 + Math.random() * 4, repeat: -1, yoyo: true, delay: Math.random() * 6 }
      );
    }
    return () => items.forEach(p => p.remove());
  }, []);

  const bracketPos: React.CSSProperties[] = [
    { top: "18px", left: "18px", borderRight: "none", borderBottom: "none" },
    { top: "18px", right: "18px", borderLeft: "none", borderBottom: "none" },
    { bottom: "18px", left: "18px", borderRight: "none", borderTop: "none" },
    { bottom: "18px", right: "18px", borderLeft: "none", borderTop: "none" },
  ];

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div ref={particleRef} className="absolute inset-0 overflow-hidden pointer-events-none" />
      {bracketPos.map((s, i) => (
        <div key={i} className="absolute w-7 h-7 pointer-events-none"
          style={{ ...s, border: "2px solid rgba(34,211,238,0.55)" }} />
      ))}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 180px rgba(2,11,24,0.65)" }} />
    </>
  );
}

// ── CYBERPUNK: neon rain ──────────────────────────────────────────────────────
function CyberpunkCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items: HTMLDivElement[] = [];

    const PALETTE = ["#ff00ff","#00ffff","#ff2200","#ff00ff","#00ffff","#ff2200","#ff00ff","#ffffff"];

    for (let i = 0; i < 48; i++) {
      const streak = document.createElement("div");
      const color = PALETTE[i % PALETTE.length];
      const h = 30 + Math.random() * 110;
      const w = Math.random() < 0.7 ? 1 : 2;
      streak.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-${h}px;width:${w}px;height:${h}px;background:linear-gradient(180deg,transparent 0%,${color} 45%,${color} 80%,transparent 100%);box-shadow:0 0 ${w*4}px ${color};pointer-events:none;opacity:${0.35+Math.random()*0.55};`;
      el.appendChild(streak); items.push(streak);
      gsap.to(streak, { y: (el.offsetHeight || 900) + h + 20, duration: 2.5 + Math.random() * 4, delay: Math.random() * 5, repeat: -1, ease: "none" });
    }

    return () => items.forEach(d => d.remove());
  }, []);

  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.025, backgroundImage: "repeating-linear-gradient(0deg,rgba(255,255,255,1) 0px,rgba(255,255,255,1) 1px,transparent 1px,transparent 3px)" }} />
      <div className="absolute top-0 left-0 w-full pointer-events-none"
        style={{ height: "2px", background: "linear-gradient(to right,transparent,rgba(255,0,255,0.9),rgba(0,255,255,0.9),transparent)", boxShadow: "0 0 20px rgba(255,0,255,0.7)" }} />
      <div className="absolute bottom-0 left-0 w-full pointer-events-none"
        style={{ height: "2px", background: "linear-gradient(to right,transparent,rgba(0,255,255,0.9),rgba(255,0,255,0.9),transparent)", boxShadow: "0 0 20px rgba(0,255,255,0.7)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.6)" }} />
    </>
  );
}

// ── HACKED: Letter Glitch background (ReactBits LetterGlitch) ─────────────────
const LG_CHARS  = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*!?<>[]{}|/\\~`±§¶";
const LG_COLORS = ["#2b4539", "#61dca3", "#61b3dc"];
const LG_FONT   = 16;
const LG_CW     = 10;
const LG_CH     = 20;
const LG_SPEED  = 50; // ms between glitch batches

function lgHex(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}
function lgLerp(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
}
const lgRandChar  = () => LG_CHARS[Math.floor(Math.random() * LG_CHARS.length)];
const lgRandColor = () => lgHex(LG_COLORS[Math.floor(Math.random() * LG_COLORS.length)]);

function HackedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;

    type Cell = { char: string; startRgb: { r: number; g: number; b: number }; targetRgb: { r: number; g: number; b: number }; t: number };
    let cells: Cell[] = [];
    let cols = 0, rows = 0;
    let lastGlitch = Date.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / LG_CW);
      rows = Math.ceil(h / LG_CH);
      cells = Array.from({ length: cols * rows }, () => ({
        char: lgRandChar(), startRgb: lgRandColor(), targetRgb: lgRandColor(), t: 1,
      }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${LG_FONT}px monospace`;
      ctx.textBaseline = "top";
      cells.forEach((cell, i) => {
        ctx.fillStyle = lgLerp(cell.startRgb, cell.targetRgb, cell.t);
        ctx.fillText(cell.char, (i % cols) * LG_CW, Math.floor(i / cols) * LG_CH);
      });
    };

    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (now - lastGlitch >= LG_SPEED) {
        const n = Math.max(1, Math.floor(cells.length * 0.05));
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(Math.random() * cells.length);
          const c = cells[idx];
          // current interpolated color becomes the new start point
          c.startRgb = {
            r: Math.round(c.startRgb.r + (c.targetRgb.r - c.startRgb.r) * c.t),
            g: Math.round(c.startRgb.g + (c.targetRgb.g - c.startRgb.g) * c.t),
            b: Math.round(c.startRgb.b + (c.targetRgb.b - c.startRgb.b) * c.t),
          };
          c.char      = lgRandChar();
          c.targetRgb = lgRandColor();
          c.t         = 0;
        }
        draw();
        lastGlitch = now;
      }

      let dirty = false;
      cells.forEach(c => {
        if (c.t < 1) { c.t = Math.min(1, c.t + 0.05); dirty = true; }
      });
      if (dirty) draw();

      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* outer vignette — same as ReactBits default */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)" }} />
    </>
  );
}

// ── SPACE: Galaxy shader (OGL) — reactbits.dev/backgrounds/galaxy ────────────

const GALAXY_VERT = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }
`;

const GALAXY_FRAG = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uMouseActiveFactor;
varying vec2 vUv;
#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071,-0.7071,0.7071,0.7071)
#define PERIOD 3.0
float Hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float tri(float x){return abs(fract(x)*2.0-1.0);}
float tris(float x){float t=fract(x);return 1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0));}
float trisn(float x){float t=fract(x);return 2.0*(1.0-smoothstep(0.0,1.0,abs(2.0*t-1.0)))-1.0;}
vec3 hsv2rgb(vec3 c){vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);}
float Star(vec2 uv,float flare){float d=length(uv);float m=(0.05*uGlowIntensity)/d;float rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=rays*flare*uGlowIntensity;uv*=MAT45;rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0));m+=rays*0.3*flare*uGlowIntensity;m*=smoothstep(1.0,0.2,d);return m;}
vec3 StarLayer(vec2 uv){vec3 col=vec3(0.0);vec2 gv=fract(uv)-0.5;vec2 id=floor(uv);for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 offset=vec2(float(x),float(y));vec2 si=id+vec2(float(x),float(y));float seed=Hash21(si);float size=fract(seed*345.32);float glossLocal=tri(uStarSpeed/(PERIOD*seed+1.0));float flareSize=smoothstep(0.9,1.0,size)*glossLocal;float red=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+1.0))+STAR_COLOR_CUTOFF;float blu=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+3.0))+STAR_COLOR_CUTOFF;float grn=min(red,blu)*seed;vec3 base=vec3(red,grn,blu);float hue=atan(base.g-base.r,base.b-base.r)/(2.0*3.14159)+0.5;hue=fract(hue+uHueShift/360.0);float sat=length(base-vec3(dot(base,vec3(0.299,0.587,0.114))))*uSaturation;float val=max(max(base.r,base.g),base.b);base=hsv2rgb(vec3(hue,sat,val));vec2 pad=vec2(tris(seed*34.0+uTime*uSpeed/10.0),tris(seed*38.0+uTime*uSpeed/30.0))-0.5;float star=Star(gv-offset-pad,flareSize);float twinkle=trisn(uTime*uSpeed+seed*6.2831)*0.5+1.0;twinkle=mix(1.0,twinkle,uTwinkleIntensity);star*=twinkle;col+=star*size*base;}}return col;}
void main(){
  vec2 focalPx=uFocal*uResolution.xy;
  vec2 uv=(vUv*uResolution.xy-focalPx)/uResolution.y;
  float autoRotAngle=uTime*uRotationSpeed;
  mat2 autoRot=mat2(cos(autoRotAngle),-sin(autoRotAngle),sin(autoRotAngle),cos(autoRotAngle));
  uv=autoRot*uv;
  uv=mat2(uRotation.x,-uRotation.y,uRotation.y,uRotation.x)*uv;
  vec3 col=vec3(0.0);
  for(float i=0.0;i<1.0;i+=1.0/NUM_LAYER){float depth=fract(i+uStarSpeed*uSpeed);float scale=mix(20.0*uDensity,0.5*uDensity,depth);float fade=depth*smoothstep(1.0,0.9,depth);col+=StarLayer(uv*scale+i*453.32)*fade;}
  gl_FragColor=vec4(col,1.0);
}
`;

function SpaceCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: false, antialias: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    let program: InstanceType<typeof Program>;

    const resize = () => {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      if (program) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height
        );
      }
    };
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: GALAXY_VERT,
      fragment: GALAXY_FRAG,
      uniforms: {
        uTime:               { value: 0 },
        uResolution:         { value: new Color(1, 1, 1) },
        uFocal:              { value: new Float32Array([0.5, 0.5]) },
        uRotation:           { value: new Float32Array([1.0, 0.0]) },
        uStarSpeed:          { value: 0.5 },
        uDensity:            { value: 1.3 },
        uHueShift:           { value: 200 },
        uSpeed:              { value: 0.8 },
        uMouse:              { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity:      { value: 0.45 },
        uSaturation:         { value: 1.2 },
        uTwinkleIntensity:   { value: 0.45 },
        uRotationSpeed:      { value: 0.06 },
        uMouseActiveFactor:  { value: 0.0 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    ctn.appendChild(canvas);
    resize();

    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      program.uniforms.uTime.value = t * 0.001;
      program.uniforms.uStarSpeed.value = (t * 0.001 * 0.5) / 10.0;
      renderer.render({ scene: mesh });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (ctn.contains(canvas)) ctn.removeChild(canvas);
      (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />;
}

function WeddingCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const items: HTMLDivElement[] = [];
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("div");
      const size = 7 + Math.random() * 6;
      const dx = (Math.random() - 0.5) * 70;
      p.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:${size * 1.35}px`,
        `background:#E3AFAE`,
        `border-radius:0 100% 0 100%`,
        `left:${Math.random() * 100}%`,
        `top:-6%`,
        `opacity:${0.55 + Math.random() * 0.3}`,
        `pointer-events:none`,
      ].join(";");
      el.appendChild(p); items.push(p);
      gsap.to(p, {
        y: window.innerHeight + 60, x: dx, rotation: 160 + Math.random() * 220,
        duration: 9 + Math.random() * 7, delay: Math.random() * 10, repeat: -1, ease: "none",
      });
    }
    return () => items.forEach(p => p.remove());
  }, []);

  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <img
        src="/wedding/wedding.svg"
        alt=""
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{ width: "42%", maxWidth: 320, height: "auto", transform: "translate(-50%,-50%)", opacity: 0.24 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <img
        src="/wedding/flower.svg"
        alt=""
        className="absolute pointer-events-none"
        style={{ width: 84, height: "auto", top: -6, left: -6 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      {/* Same clip, mirrored — reads as a different bouquet angle in the opposite corner */}
      <img
        src="/wedding/flower.svg"
        alt=""
        className="absolute pointer-events-none"
        style={{ width: 84, height: "auto", bottom: -6, right: -6, transform: "scaleX(-1)" }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </>
  );
}

function AnniversaryCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const items: HTMLDivElement[] = [];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      const size = 14 + Math.random() * 34;
      p.style.cssText = [
        `position:absolute`,
        `width:${size}px`,
        `height:${size}px`,
        `border-radius:50%`,
        `background:radial-gradient(circle,#E8B570,transparent 70%)`,
        `filter:blur(1.5px)`,
        `left:${Math.random() * 100}%`,
        `bottom:-8%`,
        `opacity:0`,
        `pointer-events:none`,
      ].join(";");
      el.appendChild(p); items.push(p);
      const dur = 5 + Math.random() * 4;
      gsap.timeline({ repeat: -1, delay: Math.random() * dur })
        .to(p, { opacity: 0.85, y: -window.innerHeight * 0.18, duration: dur * 0.18, ease: "power1.out" })
        .to(p, { opacity: 0, y: -window.innerHeight * 1.05, duration: dur * 0.82, ease: "power1.in" });
    }
    return () => items.forEach(p => p.remove());
  }, []);
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 140px rgba(198,151,73,0.28)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vmin] h-[70vmin] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(232,181,112,0.14),transparent 70%)" }} />
    </>
  );
}

function GenderRevealCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const pinkRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // Both layers oscillate between the SAME two opacities, out of phase, so
    // dominance genuinely alternates instead of pink just sitting on top.
    if (pinkRef.current) gsap.to(pinkRef.current, { opacity: 0.15, duration: 4.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
    if (blueRef.current) gsap.to(blueRef.current, { opacity: 0.9,  duration: 4.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 2.25 });

    const items: HTMLDivElement[] = [];
    const COLORS = ["#C9963E", "#F0A8BE", "#9DC2E8"];
    for (let i = 0; i < 20; i++) {
      const c = document.createElement("div");
      const color = COLORS[i % COLORS.length];
      c.style.cssText = [
        `position:absolute`,
        `width:6px`,
        `height:10px`,
        `background:${color}`,
        `left:${Math.random() * 100}%`,
        `top:${20 + Math.random() * 40}%`,
        `opacity:0`,
        `pointer-events:none`,
      ].join(";");
      el.appendChild(c); items.push(c);
      const dx = (Math.random() - 0.5) * 90;
      const dy = -(60 + Math.random() * 90);
      gsap.timeline({ repeat: -1, delay: Math.random() * 5, repeatDelay: 3 + Math.random() * 2 })
        .set(c, { x: 0, y: 0, opacity: 0, rotation: 0, scale: 0 })
        .to(c, { opacity: 1, scale: 1, rotation: 20, duration: 0.15 })
        .to(c, { x: dx, y: dy, rotation: 300, scale: 0.7, opacity: 0, duration: 1.6, ease: "power1.out" });
    }
    return () => items.forEach(c => c.remove());
  }, []);
  return (
    <>
      <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none" />
      <div ref={pinkRef} className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.9, background: "radial-gradient(circle at 30% 25%,#F0A8BE,transparent 70%)" }} />
      <div ref={blueRef} className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.15, background: "radial-gradient(circle at 72% 68%,#9DC2E8,transparent 70%)" }} />
    </>
  );
}

function BabyShowerCanvas() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg,#EFEAE2 0%,#EFC9D2 38%,#C9BFE0 68%,#BEE0CE 100%)" }}
      />
      <img
        src="/babyshower/bear.svg"
        alt=""
        className="absolute pointer-events-none"
        style={{ width: "34%", maxWidth: 220, height: "auto", left: "18%", bottom: "6%", opacity: 0.55 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      <img
        src="/babyshower/train.svg"
        alt=""
        className="absolute pointer-events-none babyshower-train"
        style={{ width: "26%", maxWidth: 190, height: "auto", top: "34%", opacity: 0.5 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    </>
  );
}

// Maps a single effectId to the underlying animation + text-effect primitives
const EFFECT_MAP: Record<string, { animationId: string; textEffectId: string }> = {
  static:    { animationId: "slide",    textEffectId: "none"    },
  glowing:   { animationId: "zoom",     textEffectId: "glow"    },
  glitching: { animationId: "warp",     textEffectId: "glitch"  },
  smoke:     { animationId: "breeze",   textEffectId: "smoke"   },
  decrypted: { animationId: "slide",    textEffectId: "decrypt" },
  assemble:  { animationId: "assemble", textEffectId: "none"    },
  bouncing:  { animationId: "pop",      textEffectId: "bounce"  },
  shimmer:   { animationId: "slide",     textEffectId: "shimmer" },
  reveal:    { animationId: "reveal",    textEffectId: "none"    },
  blossom:   { animationId: "bloomopen", textEffectId: "blossom" },
};

export const CANVAS_MAP: Record<string, React.FC> = {
  minimal:    MinimalCanvas,
  playful:    PlayfulCanvas,
  elegant:    ElegantCanvas,
  modernist:  ModernistCanvas,
  love:       LoveCanvas,
  natural:    NaturalCanvas,
  scary:      ScaryCanvas,
  futuristic: FuturisticCanvas,
  cyberpunk:  CyberpunkCanvas,
  hacked:     HackedCanvas,
  birthday:   BirthdayCanvas,
  space:      SpaceCanvas,
  wedding:      WeddingCanvas,
  anniversary:  AnniversaryCanvas,
  genderreveal: GenderRevealCanvas,
  babyshower:   BabyShowerCanvas,
};

export const DESIGN_BG: Record<string, string> = {
  minimal:    "#f5f0e8",
  playful:    "#7B2CBF",
  elegant:    "#070707",
  modernist:  "#c8924a",
  love:       "#b52a2a",
  natural:    "#1a2e14",
  scary:      "#04040c",
  futuristic: "#020b18",
  cyberpunk:  "#08000f",
  hacked:     "#010f04",
  birthday:   "#5ab4e8",
  space:      "#03040e",
  wedding:      "#F1ECE1",
  anniversary:  "#3C1420",
  genderreveal: "#F7F3EC",
  babyshower:   "#EFEAE2",
};

// ─────────────────────────────────────────────────────────────────────────────
// RSVP overlay
// ─────────────────────────────────────────────────────────────────────────────

const ACCEPT_MESSAGES = [
  "PERFECT, WE'RE GONNA HAVE FUN!",
  "GREAT TO SEE YOU COMING!",
  "LET'S GET THIS PARTY STARTED!",
];
const DECLINE_MESSAGES = [
  "YOU BROKE MY HEART...",
  "NOT COOL FROM YOU!!",
  "WE'LL MISS YOU OUT THERE...",
];

const THEME_RSVP: Record<string, {
  acceptBg: string; acceptText: string;
  declineText: string; declineBorder: string;
  inputText: string; inputBorder: string;
  msgColor: string;
}> = {
  minimal:    { acceptBg: "#1a1a1a",  acceptText: "#f5f0e8",  declineText: "rgba(0,0,0,0.45)",      declineBorder: "rgba(0,0,0,0.25)",       inputText: "#1a1a1a",  inputBorder: "rgba(0,0,0,0.45)",       msgColor: "#1a1a1a"  },
  playful:    { acceptBg: "#FFD60A",  acceptText: "#7B2CBF",  declineText: "rgba(255,214,10,0.55)", declineBorder: "rgba(255,214,10,0.35)",  inputText: "#fff",     inputBorder: "rgba(255,214,10,0.55)",  msgColor: "#FFD60A"  },
  elegant:    { acceptBg: "#c9a84c",  acceptText: "#070707",  declineText: "rgba(201,168,76,0.55)", declineBorder: "rgba(201,168,76,0.35)",  inputText: "#e8d5a3",  inputBorder: "rgba(201,168,76,0.55)",  msgColor: "#c9a84c"  },
  modernist:  { acceptBg: "#1a0800",  acceptText: "#c8924a",  declineText: "rgba(26,8,0,0.5)",     declineBorder: "rgba(26,8,0,0.3)",      inputText: "#1a0800",  inputBorder: "rgba(26,8,0,0.45)",      msgColor: "#1a0800"  },
  love:       { acceptBg: "#ff6b6b",  acceptText: "#ffffff",  declineText: "rgba(255,255,255,0.5)", declineBorder: "rgba(255,255,255,0.3)",  inputText: "#fff",     inputBorder: "rgba(255,150,150,0.55)", msgColor: "#ff9999"  },
  natural:    { acceptBg: "#4a7a30",  acceptText: "#d4e8b0",  declineText: "rgba(212,232,176,0.5)", declineBorder: "rgba(212,232,176,0.3)",  inputText: "#d4e8b0",  inputBorder: "rgba(212,232,176,0.5)",  msgColor: "#d4e8b0"  },
  scary:      { acceptBg: "#8b0000",  acceptText: "#ff4444",  declineText: "rgba(255,68,68,0.45)",  declineBorder: "rgba(255,68,68,0.25)",   inputText: "#ff4444",  inputBorder: "rgba(255,68,68,0.45)",   msgColor: "#ff4444"  },
  futuristic: { acceptBg: "#22d3ee",  acceptText: "#020b18",  declineText: "rgba(34,211,238,0.5)",  declineBorder: "rgba(34,211,238,0.3)",   inputText: "#22d3ee",  inputBorder: "rgba(34,211,238,0.5)",   msgColor: "#22d3ee"  },
  cyberpunk:  { acceptBg: "#ff00ff",  acceptText: "#08000f",  declineText: "rgba(255,0,255,0.5)",   declineBorder: "rgba(255,0,255,0.3)",    inputText: "#ff00ff",  inputBorder: "rgba(255,0,255,0.5)",    msgColor: "#ff00ff"  },
  hacked:     { acceptBg: "#00ff55",  acceptText: "#010f04",  declineText: "rgba(0,255,85,0.5)",    declineBorder: "rgba(0,255,85,0.3)",     inputText: "#00ff55",  inputBorder: "rgba(0,255,85,0.5)",     msgColor: "#00ff55"  },
  birthday:   { acceptBg: "#FFD700",  acceptText: "#140025",  declineText: "rgba(255,215,0,0.55)",  declineBorder: "rgba(255,215,0,0.35)",   inputText: "#FFD700",  inputBorder: "rgba(255,215,0,0.55)",   msgColor: "#FFD700"  },
  space:      { acceptBg: "#e8e4f8",  acceptText: "#03040e",  declineText: "rgba(232,228,248,0.5)", declineBorder: "rgba(232,228,248,0.3)",  inputText: "#e8e4f8",  inputBorder: "rgba(232,228,248,0.5)",  msgColor: "#e8e4f8"  },
  wedding:      { acceptBg: "#C08552", acceptText: "#FBF7EE", declineText: "rgba(59,50,41,0.5)",   declineBorder: "rgba(59,50,41,0.3)",    inputText: "#3B3229",  inputBorder: "rgba(192,133,82,0.55)",  msgColor: "#C08552"  },
  anniversary:  { acceptBg: "#C69749", acceptText: "#3C1420", declineText: "rgba(243,228,200,0.5)", declineBorder: "rgba(243,228,200,0.3)", inputText: "#F3E4C8",  inputBorder: "rgba(198,151,73,0.5)",   msgColor: "#E8B570"  },
  genderreveal: { acceptBg: "#C9963E", acceptText: "#3A332B", declineText: "rgba(58,51,43,0.5)",   declineBorder: "rgba(58,51,43,0.3)",    inputText: "#3A332B",  inputBorder: "rgba(201,150,62,0.55)",  msgColor: "#C9963E"  },
  babyshower:   { acceptBg: "#8E7BB0", acceptText: "#ffffff", declineText: "rgba(62,54,46,0.5)",   declineBorder: "rgba(62,54,46,0.3)",    inputText: "#3E362E",  inputBorder: "rgba(142,123,176,0.5)",  msgColor: "#8E7BB0"  },
};

type RsvpPhase = "idle" | "name-entry" | "submitting" | "done";

function RsvpZone({
  designId,
  onRsvp,
}: {
  designId: string;
  onRsvp?: (name: string, status: "accepted" | "declined") => Promise<void>;
}) {
  const [phase, setPhase]       = useState<RsvpPhase>("idle");
  const [choice, setChoice]     = useState<"accepted" | "declined" | null>(null);
  const [randomMsg, setRandomMsg] = useState("");
  const [name, setName]         = useState("");
  const [finalName, setFinalName] = useState("");

  const theme = THEME_RSVP[designId] ?? THEME_RSVP["elegant"];
  const LG = "'Luckiest Guy', cursive";

  const choose = (c: "accepted" | "declined") => {
    const pool = c === "accepted" ? ACCEPT_MESSAGES : DECLINE_MESSAGES;
    setRandomMsg(pool[Math.floor(Math.random() * pool.length)]);
    setChoice(c);
    setPhase("name-entry");
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !choice) return;
    setFinalName(trimmed);
    setPhase("submitting");
    await onRsvp?.(trimmed, choice);
    setPhase("done");
  };

  // ── Done: full-screen confirmation overlay ────────────────────────────────
  if (phase === "done") {
    return (
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center text-center p-8 gap-5"
        style={{ background: "rgba(0,0,0,0.84)", backdropFilter: "blur(10px)", animation: "rsvpFadeIn 0.45s ease forwards" }}
      >
        <p
          className="text-4xl md:text-6xl uppercase leading-tight max-w-sm"
          style={{ fontFamily: LG, color: "#F05A28" }}
        >
          {randomMsg}
        </p>
        <p
          className="text-xl md:text-2xl uppercase"
          style={{ fontFamily: LG, color: "rgba(255,255,255,0.55)" }}
        >
          — {finalName}
        </p>
        <a
          href="/"
          className="mt-8 text-[11px] uppercase tracking-[0.22em] transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Create Your Own
        </a>
      </div>
    );
  }

  // ── Name-entry / submitting ───────────────────────────────────────────────
  if (phase === "name-entry" || phase === "submitting") {
    return (
      <div
        className="relative w-full mt-6 md:mt-0 md:absolute md:bottom-6 md:left-0 md:right-0 z-20 flex flex-col items-center gap-3 px-6 text-center max-w-xs mx-auto"
        style={{ animation: "rsvpFadeIn 0.35s ease forwards" }}
      >
        <p
          className="text-lg md:text-xl uppercase leading-tight"
          style={{ fontFamily: LG, color: theme.msgColor }}
        >
          {randomMsg}
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Your name..."
          autoFocus
          disabled={phase === "submitting"}
          className="w-full text-center text-lg bg-transparent border-b-2 py-2 px-3 focus:outline-none placeholder:opacity-30"
          style={{
            borderColor: theme.inputBorder,
            color: theme.inputText,
            fontFamily: "'Montserrat', sans-serif",
          }}
        />
        <button
          onClick={submit}
          disabled={phase === "submitting" || !name.trim()}
          style={{ background: theme.acceptBg, color: theme.acceptText, fontFamily: LG }}
          className="w-full py-3 text-lg uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {phase === "submitting" ? "SENDING..." : choice === "accepted" ? "I'M IN!" : "CONFIRM"}
        </button>
      </div>
    );
  }

  // ── Idle: accept / decline buttons ───────────────────────────────────────
  // Mobile keeps the buttons in normal flow so they sit directly under the
  // invitation text; desktop still pins them to the bottom of the card.
  return (
    <div className="relative w-full mt-7 md:mt-0 md:absolute md:bottom-8 md:left-0 md:right-0 z-20 flex flex-col items-center gap-3 px-6">
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={() => choose("accepted")}
          style={{ background: theme.acceptBg, color: theme.acceptText, border: `2px solid ${theme.acceptBg}`, fontFamily: LG }}
          className="px-8 py-3 text-base md:text-lg uppercase tracking-wider transition-transform hover:scale-105 cursor-pointer"
        >
          ✓ I'll Be There
        </button>
        <button
          onClick={() => choose("declined")}
          style={{ background: "transparent", color: theme.declineText, border: `2px solid ${theme.declineBorder}`, fontFamily: LG }}
          className="px-8 py-3 text-base md:text-lg uppercase tracking-wider cursor-pointer hover:opacity-75 transition-opacity"
        >
          ✗ Can't Make It
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Font map — fontId → CSS font-family string
// ─────────────────────────────────────────────────────────────────────────────

const FONT_FAMILY: Record<string, string> = {
  funky:    "'Fontdiner Swanky', cursive",
  stampede: "'Vast Shadow', serif",
  militant: "'Black Ops One', sans-serif",
  velvet:   "'Lobster', cursive",
  sleek:    "'Basic', sans-serif",
  bloom:    "'Indie Flower', cursive",
  slash:    "'Rubik Glitch', sans-serif",
  fierce:   "'Spicy Rice', cursive",
  refined:   "'Cormorant Garamond', serif",
  regal:     "'Cinzel', serif",
  gentle:    "'Quicksand', sans-serif",
  bubbly:    "'Baloo 2', sans-serif",
  sturdy:    "'Oswald', sans-serif",
  mighty:    "'Germania One', cursive",
  griffy:    "'Griffy', cursive",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Postcard({
  invitation,
  isLiveView = false,
  expiresInHours = 24,
  onRsvp,
}: PostcardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const gsapCtxRef = useRef<gsap.Context | null>(null);
  const expiresAt  = useRef(Date.now() + expiresInHours * 3_600_000).current;
  const countdown  = useCountdown(expiresAt);
  const ThemeCanvas = CANVAS_MAP[invitation.designId] ?? MinimalCanvas;

  const titleFontSize = useTitleFontSize(invitation.title);
  const { animationId, textEffectId } = EFFECT_MAP[invitation.effectId] ?? EFFECT_MAP["static"];

  const runAnimation = useCallback(() => {
    if (gsapCtxRef.current) gsapCtxRef.current.revert();
    const content = contentRef.current;
    if (!content) return;

    // All title word spans only — used for assemble & word effects
    const titleWords  = () => Array.from(content.querySelectorAll<HTMLElement>(".title-word"));
    const msgWords    = () => Array.from(content.querySelectorAll<HTMLElement>(".msg-word"));
    const effectWords = () => [...titleWords(), ...msgWords()];

    gsapCtxRef.current = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      // For assemble: container stays visible, individual pieces start hidden.
      // For all other animations: hide the whole container, reveal as a unit.
      if (animationId === "assemble") {
        gsap.set(content, { opacity: 1 });
        // Containers must stay visible — only the word/piece children get hidden,
        // otherwise animating child opacity has no effect inside an opacity:0 parent.
        gsap.set(
          Array.from(content.querySelectorAll<HTMLElement>(".event-title,.event-message")),
          { opacity: 1 }
        );
        gsap.set(
          Array.from(content.querySelectorAll<HTMLElement>(
            ".title-word,.invite-label,.divider-line,.msg-word,.meta-row"
          )),
          { opacity: 0 }
        );
      } else {
        gsap.set(content, { opacity: 0 });
      }

      // ── Entry animation ───────────────────────────────────────────────────
      switch (animationId) {

        case "slide":
          gsap.set(content, { y: 100, opacity: 0 });
          tl.to(content, { y: 0, opacity: 1, duration: 1.3 });
          break;

        case "pop":
          gsap.set(content, { scale: 0, opacity: 0 });
          tl.to(content, { scale: 1, opacity: 1, duration: 0.95, ease: "back.out(1.7)" });
          break;

        case "flip": {
          const parent = content.parentElement;
          if (parent) gsap.set(parent, { perspective: 1400, perspectiveOrigin: "50% 50%" });
          gsap.set(content, { rotationY: -90, opacity: 0, transformOrigin: "center center" });
          tl.to(content, { rotationY: 0, opacity: 1, duration: 1.2, ease: "power3.out" });
          break;
        }

        case "zoom":
          gsap.set(content, { scale: 0.04, opacity: 0 });
          tl.to(content, { scale: 1, opacity: 1, duration: 1.35, ease: "expo.out" });
          break;

        case "warp":
          gsap.set(content, { scaleX: 4.5, scaleY: 0.05, opacity: 0, filter: "blur(22px)" });
          tl.to(content, { scaleX: 1, scaleY: 1, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out" });
          break;

        case "breeze":
          gsap.set(content, { x: -180, opacity: 0, filter: "blur(14px)" });
          tl.to(content, { x: 0, opacity: 1, filter: "blur(0px)", duration: 1.4, ease: "power2.out" });
          break;

        case "hang":
          gsap.set(content, { y: -window.innerHeight * 0.65, opacity: 0, rotation: -12, transformOrigin: "top center" });
          tl.to(content, { y: 0, opacity: 1, duration: 1.3, ease: "power3.out" })
            .to(content, { rotation: 4.5, duration: 0.28, ease: "power2.in" })
            .to(content, { rotation: 0, duration: 0.85, ease: "elastic.out(1,0.42)" });
          break;

        case "assemble": {
          // Every word in the title AND message flies in from a random screen edge.
          // Structural elements (label, divider, meta) also fly in as single blocks.
          const label   = content.querySelector<HTMLElement>(".invite-label");
          const divider = content.querySelector<HTMLElement>(".divider-line");
          const meta    = content.querySelector<HTMLElement>(".meta-row");
          const tw = titleWords();
          const mw = msgWords();

          // Ordered so the invitation reads top-to-bottom as pieces arrive
          const pieces: HTMLElement[] = [
            ...(label   ? [label]   : []),
            ...tw,
            ...(divider ? [divider] : []),
            ...mw,
            ...(meta    ? [meta]    : []),
          ];

          const EDGES = [
            { x: -window.innerWidth * 0.7,  y: 0 },
            { x:  window.innerWidth * 0.7,  y: 0 },
            { x: 0, y: -window.innerHeight * 0.65 },
            { x: 0, y:  window.innerHeight * 0.65 },
            { x: -window.innerWidth * 0.55, y: -window.innerHeight * 0.5 },
            { x:  window.innerWidth * 0.55, y:  window.innerHeight * 0.5 },
            { x: -window.innerWidth * 0.55, y:  window.innerHeight * 0.5 },
            { x:  window.innerWidth * 0.55, y: -window.innerHeight * 0.5 },
          ];
          pieces.forEach((el, i) => {
            const edge = EDGES[i % EDGES.length];
            gsap.set(el, { x: edge.x, y: edge.y, opacity: 0, rotation: (Math.random() - 0.5) * 42 });
            tl.to(el, { x: 0, y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: "back.out(1.3)" }, i * 0.065);
          });
          break;
        }

        case "reveal":
          gsap.set(content, { opacity: 1, clipPath: "inset(0 100% 0 0)" });
          tl.to(content, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "power3.inOut" });
          break;

        case "bloomopen":
          gsap.set(content, { scale: 0.85, opacity: 0 });
          tl.to(content, { scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" });
          break;

        default:
          tl.to(content, { opacity: 1, duration: 0.8 });
      }

      // ── Non-assemble: staggered child reveal ─────────────────────────────
      if (animationId !== "assemble") {
        const label   = content.querySelector<HTMLElement>(".invite-label");
        const title   = content.querySelector<HTMLElement>(".event-title");
        const divider = content.querySelector<HTMLElement>(".divider-line");
        const msg     = content.querySelector<HTMLElement>(".event-message");
        const meta    = content.querySelector<HTMLElement>(".meta-row");

        tl.to(content, { opacity: 1, duration: 0.05 }, "<")
          .to(label,   { opacity: 0.5, duration: 0.5 }, "-=0.3");

        if (textEffectId === "decrypt") {
          // Snap containers visible immediately so the character cycling is seen from the start.
          // DecryptedText handles the actual visual reveal inside each container.
          tl.to(title,   { opacity: 1,    duration: 0.15 }, "-=0.1")
            .to(divider, { opacity: 0.25, duration: 0.35 }, "-=0.05")
            .to(msg,     { opacity: 1,    duration: 0.15 }, "+=0.05");
        } else {
          tl.to(title,   { opacity: 1,    duration: 0.65 }, "-=0.25")
            .to(divider, { opacity: 0.25, duration: 0.4  }, "-=0.3")
            .to(msg,     { opacity: 0.88, duration: 0.5  }, "-=0.25");
        }

        if (meta) {
          tl.to(meta, { opacity: 0.6, duration: 0.4 }, "-=0.2");
        }
      }

      // ── Word-level entrance effects ───────────────────────────────────────
      const words = effectWords();
      const wPos  = animationId === "assemble" ? 0 : "-=0.5";

      switch (textEffectId) {
        case "fade-words":
          if (words.length) tl.fromTo(words,
            { opacity: 0, filter: "blur(12px)", scale: 0.8 },
            { opacity: 1, filter: "blur(0px)",  scale: 1, stagger: 0.08, duration: 0.55, ease: "back.out(1.5)" },
            wPos);
          break;
        case "smoke":
          if (words.length) tl.fromTo(words,
            { opacity: 0, filter: "blur(30px)", y: 30 },
            { opacity: 1, filter: "blur(0px)",  y: 0,  stagger: 0.12, duration: 0.9, ease: "power2.out" },
            wPos);
          break;
        case "sway":
        case "shake":
        case "glitch":
          if (words.length) tl.fromTo(words,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0,  stagger: 0.05, duration: 0.45 },
            wPos);
          break;
        case "blossom":
          if (words.length) tl.fromTo(words,
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, stagger: 0.09, duration: 0.6, ease: "back.out(2.2)" },
            wPos);
          break;
      }

      // ── Continuous / looping effects ──────────────────────────────────────
      const loopDelay = (tl.duration() || 1) + 0.1;

      switch (textEffectId) {

        case "float":
          gsap.to(content, { y: -24, rotation: 2, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: loopDelay });
          break;

        case "bounce":
          gsap.to(content, { y: -35, scaleY: 1.05, scaleX: 0.96, duration: 0.5, repeat: -1, yoyo: true, ease: "power2.inOut", delay: loopDelay });
          break;

        case "glow": {
          const GLOW: Record<string, string> = {
            elegant:    "rgba(201,168,76,0.7)",
            futuristic: "rgba(34,211,238,0.6)",
            cyberpunk:  "rgba(255,0,255,0.6)",
            scary:      "rgba(255,68,68,0.55)",
            love:       "rgba(255,150,150,0.6)",
            playful:    "rgba(255,214,10,0.5)",
          };
          const gCol = GLOW[invitation.designId] ?? "rgba(255,255,255,0.5)";
          const titleEl = content.querySelector<HTMLElement>(".event-title");
          if (titleEl) {
            gsap.to(titleEl, {
              textShadow: `0 0 55px ${gCol},0 0 110px ${gCol}`,
              duration: 2.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: loopDelay,
            });
          }
          break;
        }

        case "sway": {
          const w = effectWords();
          if (w.length) gsap.to(w, {
            y: "random(-11,11)", x: "random(-5,5)", rotation: "random(-5,5)",
            duration: "random(2,3.2)", repeat: -1, yoyo: true, ease: "sine.inOut",
            stagger: { amount: 1.2, from: "random" }, delay: loopDelay,
          });
          break;
        }

        case "shake": {
          const w = effectWords();
          if (w.length) gsap.to(w, {
            x: "random(-5,5)", y: "random(-3,3)",
            duration: 0.07, repeat: -1, ease: "none",
            stagger: { amount: 0.25, from: "random" }, delay: loopDelay,
          });
          break;
        }

        case "glitch": {
          const w = effectWords();
          if (!w.length) break;
          const doGlitch = () => {
            const el = w[Math.floor(Math.random() * w.length)];
            if (!el) return;
            gsap.timeline()
              .to(el, { x: 6,  duration: 0.04, ease: "none" })
              .to(el, { x: -6, duration: 0.04 })
              .to(el, { x: 4,  duration: 0.04 })
              .to(el, { x: 0,  duration: 0.04 });
            el.style.textShadow = "4px 0 #ff00ff,-4px 0 #00ffff";
            setTimeout(() => { el.style.textShadow = ""; }, 150);
            setTimeout(doGlitch, 300 + Math.random() * 700);
          };
          setTimeout(doGlitch, loopDelay * 1000);
          break;
        }

        case "smoke": {
          const w = effectWords();
          if (w.length) gsap.to(w, {
            y: "random(-15,15)", x: "random(-7,7)", opacity: "random(0.78,1)",
            duration: "random(2.5,4.5)", repeat: -1, yoyo: true, ease: "sine.inOut",
            stagger: { amount: 0.9, from: "random" }, delay: loopDelay,
          });
          break;
        }

        case "decrypt":
          // DecryptedText component handles its own animation — nothing to do here.
          // We still let the GSAP reveal handle the h1 opacity so it fades in normally
          // before the decrypt effect takes over character-by-character.
          break;

        case "shimmer": {
          const titleEl = content.querySelector<HTMLElement>(".event-title");
          if (titleEl) {
            const base = invitation.fontColor || "#ffffff";
            // A white highlight is invisible against already-white/bright
            // text — flip it to a dark glint whenever the base is light.
            const highlight = isLightColor(base) ? "#1a1a1a" : "#ffffff";
            titleEl.style.backgroundImage = `linear-gradient(100deg, ${base} 40%, ${highlight} 50%, ${base} 60%)`;
            titleEl.style.backgroundSize = "250% 100%";
            titleEl.style.webkitBackgroundClip = "text";
            titleEl.style.backgroundClip = "text";
            titleEl.style.color = "transparent";
            (titleEl.style as any).webkitTextFillColor = "transparent";
            gsap.fromTo(titleEl,
              { backgroundPosition: "180% 0" },
              { backgroundPosition: "-80% 0", duration: 2.4, repeat: -1, repeatDelay: 1.6, ease: "power1.inOut", delay: loopDelay }
            );
          }
          break;
        }
      }
    });

    return () => gsapCtxRef.current?.revert();
  }, [invitation]);

  useEffect(() => {
    const cleanup = runAnimation();
    return cleanup;
  }, [runAnimation]);

  return (
    <>
      <style>{`
        @keyframes fogdrift {
          0%,100% { transform:translateX(-10%) scaleX(1.12); }
          50%      { transform:translateX(6%)  scaleX(1);    }
        }
        @keyframes scanmove {
          0%   { top:0;    }
          100% { top:100%; }
        }
        @keyframes auroradrift1 {
          0%,100% { transform:translate(0,0)    scale(1);   opacity:.8; }
          33%     { transform:translate(8%,-6%) scale(1.1); opacity:1;  }
          66%     { transform:translate(-6%,8%) scale(.95); opacity:.7; }
        }
        @keyframes auroradrift2 {
          0%,100% { transform:translate(0,0)     scale(1);    opacity:.7; }
          40%     { transform:translate(-10%,8%) scale(1.12); opacity:1;  }
          75%     { transform:translate(8%,-5%)  scale(.9);   opacity:.6; }
        }
        @keyframes auroradrift3 {
          0%,100% { transform:translate(0,0)     scale(1);    opacity:.6; }
          50%     { transform:translate(12%,-8%) scale(1.15); opacity:.9; }
        }
        @keyframes cyberaura {
          0%,100% { opacity:.6; filter:hue-rotate(0deg);  }
          50%     { opacity:1;  filter:hue-rotate(40deg); }
        }
        @keyframes rsvpFadeIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .word-span, .title-word, .msg-word { display:inline-block; }
      `}</style>

      {/*
        Fix: use relative + w-full + h-full instead of fixed inset-0.
        The parent (InvitationView) is already full-screen; here we fill it.
        When isLiveView=false (builder preview) this won't hijack the page.
      */}
      <div className={cn(
        "relative w-full h-full flex flex-col items-center justify-center overflow-hidden",
        THEME_BG[invitation.designId] ?? "bg-black text-white"
      )}>
        {/* Living canvas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <ThemeCanvas />
        </div>

        {/* Countdown — live view only */}
        {isLiveView && (
          <div
            className="absolute top-4 right-4 z-20 text-[10px] md:text-[11px] font-bold tracking-[0.18em] uppercase pointer-events-none select-none"
            style={{ opacity: 0.4 }}
          >
            {countdown}
          </div>
        )}

        {/* Typographic content */}
        <div
          ref={contentRef}
          className={cn(
            "relative z-10 flex flex-col items-center text-center px-6 md:px-20 max-w-[880px] w-full",
            // Desktop reserves room for the absolutely-positioned RSVP zone;
            // on mobile that zone is in flow, so no reserved gap is needed.
            isLiveView && "pb-4 md:pb-36"
          )}
        >
          <p
            className="invite-label text-[10px] md:text-[11px] font-bold tracking-[0.32em] uppercase mb-5"
            style={{ opacity: 0 }}
          >
            You're Invited To
          </p>


          <h1
            className="event-title leading-[0.95] uppercase"
            style={{
              fontSize: titleFontSize,
              letterSpacing: "-0.02em",
              opacity: 0,
              fontFamily: FONT_FAMILY[invitation.fontId ?? "funky"] ?? "'Luckiest Guy', cursive",
              ...(invitation.fontColor ? { color: invitation.fontColor } : {}),
            }}
          >
            {textEffectId === "decrypt" && animationId !== "assemble" ? (
              /* DecryptedText: characters cycle through random glitch chars then resolve */
              <DecryptedText
                text={invitation.title}
                delay={500}
                charDelay={Math.max(160, Math.ceil(2200 / (invitation.title.replace(/\s/g, "").length || 1)))}
                shuffleSpeed={80}
              />
            ) : (
              invitation.title.split(" ").filter(Boolean).map((word, i, arr) => (
                <span
                  key={i}
                  className="title-word word-span inline-block"
                  style={{ marginRight: i < arr.length - 1 ? "0.22em" : 0 }}
                >
                  {word}
                </span>
              ))
            )}
          </h1>

          <div
            className="divider-line w-12 md:w-20 bg-current my-5 mx-auto"
            style={{ height: "3px", opacity: 0 }}
          />

          {/*
            Fix: quotes are inside the word-span container so they
            don't flash at full opacity while words are still fading in.
          */}
          <p
            className="event-message text-[clamp(0.95rem,2.3vw,1.65rem)] font-medium italic leading-relaxed max-w-[600px]"
            style={{ opacity: 0 }}
          >
            {textEffectId === "decrypt" && animationId !== "assemble" ? (
              /* DecryptedText on the message — starts after the title has mostly resolved */
              <DecryptedText
                text={`"${invitation.message}"`}
                delay={1200}
                charDelay={Math.max(55, Math.ceil(1800 / (`"${invitation.message}"`.replace(/\s/g, "").length || 1)))}
                shuffleSpeed={80}
                charClassName="msg-word word-span inline-block"
              />
            ) : (
              `"${invitation.message}"`.split(" ").filter(Boolean).map((word, i, arr) => (
                <span
                  key={i}
                  className="msg-word word-span inline-block"
                  style={{ marginRight: i < arr.length - 1 ? "0.22em" : 0 }}
                >
                  {word}
                </span>
              ))
            )}
          </p>

          {/* Date & Location — only rendered when present */}
          {(invitation.date || invitation.location) && (
            <div
              className="meta-row mt-8 flex flex-wrap gap-x-8 gap-y-3 justify-center items-center"
              style={{ opacity: 0 }}
            >
              {invitation.date && (
                <span className="meta-item text-[clamp(0.6rem,1.3vw,0.88rem)] font-bold tracking-[0.14em] uppercase">
                  {invitation.date}
                </span>
              )}
              {invitation.location && (
                <span className="meta-item text-[clamp(0.6rem,1.3vw,0.88rem)] font-bold tracking-[0.14em] uppercase">
                  {invitation.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RSVP — live view only */}
        {isLiveView && (
          <RsvpZone designId={invitation.designId} onRsvp={onRsvp} />
        )}

        {/* Watermark */}
        <p
          className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-[0.28em] uppercase whitespace-nowrap z-10 pointer-events-none select-none"
          style={{ opacity: 0.16 }}
        >
          CREATED WITH INVITY
        </p>
      </div>
    </>
  );
}