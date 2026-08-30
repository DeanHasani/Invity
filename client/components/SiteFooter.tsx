import { Link } from "react-router-dom";

const LG_FONT = "'Luckiest Guy', cursive";

export type FooterLink = { to: string; label: string; longLabel?: string };

/** Single source of truth for the site-wide footer nav. */
export const FOOTER_LINKS: FooterLink[] = [
  { to: "/about",    label: "About",    longLabel: "About Us" },
  { to: "/pricing",  label: "Pricing"  },
  { to: "/privacy",  label: "Privacy",  longLabel: "Privacy Policy" },
  { to: "/terms",    label: "Terms"    },
  { to: "/refunds",  label: "Refunds"  },
];

type Variant =
  | "compact"  // mobile bottom nav strip on the homepage
  | "desktop"  // fixed bar pinned to the bottom of the homepage
  | "page";    // in-flow footer for the content sub-pages

/**
 * @param current  path of the page rendering the footer; that entry is dropped
 *                 so a page never links to itself.
 */
export function SiteFooter({ variant, current }: { variant: Variant; current?: string }) {
  const links = FOOTER_LINKS.filter(l => l.to !== current);
  const year = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 py-2.5 px-3">
        {links.map((l, i) => (
          <span key={l.to} className="flex items-center gap-2.5">
            <Link
              to={l.to}
              className="text-[11px] uppercase tracking-widest"
              style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.65)" }}
            >
              {l.label}
            </Link>
            {i < links.length - 1 && (
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
            )}
          </span>
        ))}
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>·</span>
        <span
          className="text-[11px]"
          style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Montserrat', sans-serif" }}
        >
          © {year} Invity
        </span>
      </div>
    );
  }

  if (variant === "desktop") {
    return (
      <div className="hidden md:flex fixed bottom-4 left-0 right-0 z-20 items-center justify-center gap-5 px-4 pointer-events-none select-none">
        {links.map(l => (
          <span key={l.to} className="flex items-center gap-5">
            <Link
              to={l.to}
              className="pointer-events-auto text-[15px] uppercase tracking-widest transition-colors"
              style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
            >
              {l.longLabel ?? l.label}
            </Link>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>·</span>
          </span>
        ))}
        <span
          className="text-[13px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Montserrat', sans-serif" }}
        >
          © {year} Invity
        </span>
      </div>
    );
  }

  // "page": sits at the end of the sub-page content
  return (
    <footer className="relative z-10 w-full px-6 pb-10 pt-4">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className="text-[13px] uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontFamily: LG_FONT, color: "rgba(255,255,255,0.7)" }}
          >
            {l.longLabel ?? l.label}
          </Link>
        ))}
        <span
          className="text-[12px]"
          style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Montserrat', sans-serif" }}
        >
          © {year} Invity
        </span>
      </div>
    </footer>
  );
}
