import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Real, indexable pages. Anything not on this list (invitation ids, typos,
 * dead links, whatever gets added later) is treated as non-indexable.
 *
 * An allowlist rather than a blocklist on purpose: the failure mode of
 * forgetting to add a route here is a page that doesn't get indexed, which is
 * visible and fixable. The failure mode of forgetting to blocklist one is
 * another duplicate of the homepage in Google's index, which is neither.
 */
const INDEXABLE = new Set([
  "/", "/pricing", "/about", "/privacy", "/terms", "/refunds", "/signin",
]);

const ORIGIN = "https://www.invity.cards";

/**
 * The SPA serves the same index.html for every path, and that file carries a
 * canonical hardcoded to the homepage. On any other URL that's a lie. It tells
 * Google the invite link, the typo and the dead route are all the homepage,
 * which is exactly what produces "Duplicate, Google chose a different
 * canonical" and burns crawl budget on infinite copies of one page.
 *
 * Googlebot renders JS, so correcting the tags after mount is enough: it costs
 * a render pass, but it's the only lever available without giving every route
 * its own served document.
 */
export function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const indexable = INDEXABLE.has(pathname);
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (indexable) {
      // Point the canonical at this page rather than whatever the shell said.
      robots?.remove();
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = pathname === "/" ? `${ORIGIN}/` : ORIGIN + pathname;
      return;
    }

    // Not a page we want in the index. Drop the borrowed canonical entirely.
    // Claiming no canonical is far better than claiming the homepage's.
    canonical?.remove();
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, [pathname]);

  return null;
}
