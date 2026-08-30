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
 * Document title per route.
 *
 * Every entry that also has a pre-rendered file in public/ must match that
 * file's <title> byte for byte. A cold load reads the served HTML and an
 * in-app navigation runs this map, so any drift between the two shows up as
 * one URL with two different titles depending on how the visitor got there.
 *
 * /signin is here even though signin.html is its own entry point and never
 * mounts this component: App.tsx has no /signin route, so a stray client-side
 * link would fall to the catch-all and get labelled "Page Not Found".
 */
const TITLES: Record<string, string> = {
  "/":              "Invity Cards | Free Digital Invitation Maker with RSVP Links",
  "/pricing":       "Pricing | Invity Cards Pro | $2.99/month or $20/year",
  "/about":         "About Us | Invity Cards",
  "/privacy":       "Privacy Policy | Invity Cards",
  "/terms":         "Terms of Service | Invity Cards",
  "/refunds":       "Refund Policy | Invity Cards",
  "/signin":        "Sign In to Invity Cards | Digital Invitation Maker",
  "/guests":        "Guest Lists | Invity Cards",
  "/auth/callback": "Signing In | Invity Cards",
};

/**
 * One path segment means an invitation id, matching App.tsx's "/:id". Anything
 * deeper fell through to the "*" route and is a genuine 404.
 */
const INVITATION_PATH = /^\/[^/]+$/;

function titleFor(pathname: string): string {
  const known = TITLES[pathname];
  if (known) return known;
  return INVITATION_PATH.test(pathname)
    ? "You're Invited | Invity Cards"
    : "Page Not Found | Invity Cards";
}

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
 *
 * The title needs the same treatment for the same reason. index.html ships the
 * homepage title, so without this an in-app move to /guests or an invitation
 * would sit there still claiming to be the invitation maker's landing page.
 */
export function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titleFor(pathname);

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
