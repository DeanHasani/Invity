import type { PostHog } from "posthog-js";

const KEY  = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || "https://eu.i.posthog.com";

/**
 * Builder surfaces only.
 *
 * Invitation pages are deliberately absent. Guests open a link without ever
 * signing up to anything, and PostHog is never loaded while one is on screen —
 * no cookie is set, no profile exists, and the library isn't even downloaded
 * for someone who only came to say whether they're coming.
 *
 * An allowlist, so a route added later is untracked until someone decides it
 * should be, rather than tracked by accident.
 */
const TRACKED = new Set([
  "/", "/pricing", "/about", "/privacy", "/terms", "/refunds",
  "/guests", "/auth/callback", "/signin",
]);

export const isTrackedPath = (path: string) => TRACKED.has(path);

/**
 * posthog-js is ~250 kB and it is imported dynamically on purpose. A static
 * import puts it in the chunk both entries share, which means every guest
 * opening an invitation downloads an analytics library that — by the rule
 * above — is never allowed to run. Loading it on the first tracked pageview
 * keeps it off the pages that make up most of the traffic.
 */
let ph: PostHog | null = null;
let loading: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!KEY) return Promise.resolve(); // unconfigured: local dev, preview deploys
  if (!loading) {
    loading = import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(KEY, {
          api_host: HOST,
          // Anonymous visitors stay anonymous; a person profile is only created
          // once someone signs in and identify is called.
          person_profiles: "identified_only",
          // Sent per route below instead, so untracked paths never emit one.
          capture_pageview: false,
          capture_pageleave: true,
        });
        ph = posthog;
      })
      .catch(() => {
        // Ad blockers block PostHog routinely. Analytics failing must never
        // take a page down with it.
      });
  }
  return loading;
}

/** Loads analytics on the first tracked route, then records the view. */
export function capturePageview(path: string) {
  if (!isTrackedPath(path)) return;
  void ensureLoaded().then(() => {
    ph?.capture("$pageview", { $current_url: window.location.origin + path });
  });
}

/**
 * These never trigger the load themselves — if the visitor hasn't been on a
 * tracked page, nothing is recorded and nothing is fetched. Stops an event
 * fired from a shared component quietly instrumenting an invitation page.
 */
export const captureEvent = (name: string, props?: Record<string, unknown>) =>
  ph?.capture(name, props);

export const identifyUser = (id: string, email: string) =>
  ph?.identify(id, { email });

export const resetAnalytics = () => ph?.reset();
