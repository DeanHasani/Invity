import { useState, useEffect } from "react";

const LG_FONT = "'Luckiest Guy', cursive";

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

type FloatingPhrase = { id: number; text: string; x: number; y: number; scale: number; visible: boolean };
let _phraseCounter = 0;

export function FloatingPhrases({ active }: { active: boolean }) {
  const [phrases, setPhrases] = useState<FloatingPhrase[]>([]);

  useEffect(() => {
    // Pure decoration that never stops moving, so skip it for reduced motion
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduced) { setPhrases([]); return; }

    const spawn = () => {
      const id = _phraseCounter++;
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
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }} aria-hidden="true">
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
