// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the app background themes.
//
// `hex` paints the page. The `accent*` tokens exist because several surfaces
// (calendar popover, account menu, sign-in + upgrade modals) are dark panels
// that sit *on top* of the page — a theme colour used as text there has to stay
// readable. For the coloured themes accent === hex, so nothing changes; the
// black theme swaps in a bright accent so those labels don't vanish.
// ─────────────────────────────────────────────────────────────────────────────

export type AppTheme = "orange" | "sky" | "teal" | "warmgray" | "black";

export type ThemeTokens = {
  hex: string; // page background + primary fill
  rgb: string; // hex as "r,g,b" for rgba() composition
  accent: string; // text / border / icon colour on dark surfaces
  accentRgb: string;
  accentFill: string; // fill for selected chips on dark surfaces
  accentFg: string; // text drawn on top of accentFill
  surface: string; // dark popover / modal background
};

export const THEME_ORDER: readonly AppTheme[] = ["orange", "sky", "teal", "warmgray", "black"];

export const THEME_COLORS: Record<AppTheme, ThemeTokens> = {
  orange: {
    hex: "#F05A28", rgb: "240,90,40",
    accent: "#F05A28", accentRgb: "240,90,40",
    accentFill: "#F05A28", accentFg: "#ffffff",
    surface: "#1a0800",
  },
  sky: {
    hex: "#0284C7", rgb: "2,132,199",
    accent: "#0284C7", accentRgb: "2,132,199",
    accentFill: "#0284C7", accentFg: "#ffffff",
    surface: "#1a0800",
  },
  teal: {
    hex: "#14B8A6", rgb: "20,184,166",
    accent: "#14B8A6", accentRgb: "20,184,166",
    accentFill: "#14B8A6", accentFg: "#ffffff",
    surface: "#1a0800",
  },
  warmgray: {
    hex: "#7C6A5E", rgb: "124,106,94",
    accent: "#7C6A5E", accentRgb: "124,106,94",
    accentFill: "#7C6A5E", accentFg: "#ffffff",
    surface: "#1a0800",
  },
  black: {
    hex: "#111114", rgb: "17,17,20",
    // Near-black text would disappear on the dark panels, so the black theme
    // accents with white and flips the on-fill text colour to match.
    accent: "#FFFFFF", accentRgb: "255,255,255",
    accentFill: "#FFFFFF", accentFg: "#111114",
    surface: "#1E1E24",
  },
};

export const DEFAULT_THEME: AppTheme = "orange";

/** Reads the persisted theme, falling back to orange for unknown/absent values. */
export function readStoredTheme(): AppTheme {
  try {
    const t = localStorage.getItem("invity_theme");
    return t && t in THEME_COLORS ? (t as AppTheme) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** CSS custom properties consumed by the dark panels and brand-tinted chrome. */
export function themeVars(theme: AppTheme): Record<string, string> {
  const t = THEME_COLORS[theme];
  return {
    "--brand": t.hex,
    "--brand-rgb": t.rgb,
    "--brand-mid": `rgba(${t.rgb},0.45)`,
    "--brand-dim": `rgba(${t.rgb},0.2)`,
    "--accent": t.accent,
    "--accent-rgb": t.accentRgb,
    "--accent-fill": t.accentFill,
    "--accent-fg": t.accentFg,
    "--surface": t.surface,
  };
}
