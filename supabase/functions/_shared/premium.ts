// Single source of truth for plan rules. Imported by the edge functions
// directly and re-exported to the client via /shared/premium.ts.
// Keep this file dependency-free: it must compile in both Deno and Vite.

export const ALL_DESIGN_IDS = [
  "minimal", "playful", "elegant", "modernist", "love", "natural",
  "scary", "futuristic", "cyberpunk", "hacked", "birthday", "space",
  "wedding", "anniversary", "genderreveal", "babyshower",
] as const;

export const ALL_EFFECT_IDS = [
  "static", "glowing", "glitching", "smoke", "decrypted", "assemble", "bouncing",
  "shimmer", "reveal", "blossom",
] as const;

// Pro-only subsets. Adjust freely, since enforcement (create-invitation) and the
// lock badges in the builder both read from here.
export const PRO_DESIGN_IDS: readonly string[] = ["cyberpunk", "hacked", "birthday", "space", "anniversary", "genderreveal", "babyshower"];
export const PRO_EFFECT_IDS: readonly string[] = ["glitching", "decrypted", "assemble", "reveal"];

// Subscription statuses that count as Pro. past_due keeps access while Paddle
// retries a failed payment (dunning); Paddle flips it to canceled/paused itself
// if retries run out.
export const PRO_STATUSES: readonly string[] = ["active", "trialing", "past_due"];

export const FREE_DAILY_LIMIT = 2;
export const PRO_DAILY_ABUSE_CAP = 50;

export const FREE_EXPIRY_MS = 5 * 3_600_000;            // 5 hours
export const PRO_EXPIRY_MS = 30 * 24 * 3_600_000;       // 30 days, Pro default AND max

/**
 * Link lifetimes offered in the builder. Free is pinned to the first entry;
 * Pro picks any of them and defaults to 30 days, which keeps the advertised
 * "30-day links" claim true. create-invitation validates against this list:
 * the dropdown is UI, this is the contract.
 */
export const EXPIRY_OPTIONS: readonly { id: string; label: string; ms: number; pro: boolean }[] = [
  { id: "5h",  label: "5 hours",  ms: FREE_EXPIRY_MS,          pro: false },
  { id: "10h", label: "10 hours", ms: 10 * 3_600_000,          pro: true  },
  { id: "24h", label: "24 hours", ms: 24 * 3_600_000,          pro: true  },
  { id: "7d",  label: "7 days",   ms: 7 * 24 * 3_600_000,      pro: true  },
  { id: "30d", label: "30 days",  ms: PRO_EXPIRY_MS,           pro: true  },
];

export const FREE_EXPIRY_ID = "5h";
export const PRO_DEFAULT_EXPIRY_ID = "30d";

/**
 * Resolves a requested expiry id to milliseconds, clamping to what the plan
 * actually allows. Never trust the client: an unknown id, or a Pro-only id from
 * a free account, falls back to the free lifetime rather than erroring.
 */
export function resolveExpiryMs(expiryId: string | null | undefined, isPro: boolean): number {
  if (!isPro) return FREE_EXPIRY_MS;
  const opt = EXPIRY_OPTIONS.find(o => o.id === expiryId);
  if (!opt) return PRO_EXPIRY_MS;
  return opt.ms;
}

export const PRICE_MONTHLY_LABEL = "$2.99";
export const PRICE_YEARLY_LABEL = "$20";

export function isProStatus(status: string | null | undefined): boolean {
  return !!status && PRO_STATUSES.includes(status);
}
