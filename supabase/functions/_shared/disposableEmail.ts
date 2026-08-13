// Single source of truth for the throwaway-inbox blocklist. Imported by the
// edge functions directly and re-exported to the client via /shared/disposableEmail.ts.
// Keep this file dependency-free — it must compile in both Deno and Vite.
//
// Google sign-in is self-limiting: making a Google account is enough work that
// farming free invitations isn't worth it. Email codes remove that barrier, so
// the daily caps in create-invitation are only as strong as the addresses
// behind them. This list is the cheap 90% — it stops the well-known services
// without pretending to be exhaustive.

export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  "0-mail.com", "10minutemail.com", "20minutemail.com", "33mail.com",
  "anonaddy.com", "anonbox.net", "burnermail.io", "byom.de",
  "dispostable.com", "dropmail.me", "duck.com", "emailondeck.com",
  "fakeinbox.com", "fakemail.net", "gestyy.com", "getairmail.com",
  "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "harakirimail.com", "inboxbear.com", "incognitomail.com", "jetable.org",
  "maildrop.cc", "mailinator.com", "mailnesia.com", "mailsac.com",
  "mintemail.com", "mohmal.com", "moakt.com", "mytemp.email",
  "nowmymail.com", "opayq.com", "sharklasers.com", "simplelogin.io",
  "spam4.me", "spamgourmet.com", "temp-mail.io", "temp-mail.org",
  "tempail.com", "tempinbox.com", "tempmail.dev", "tempmail.net",
  "tempmail.plus", "tempmailo.com", "tempr.email", "throwawaymail.com",
  "trashmail.com", "trashmail.de", "trbvm.com", "tuta.io",
  "vomoto.com", "wegwerfmail.de", "yopmail.com", "yopmail.fr", "yopmail.net",
];

const BLOCKED = new Set(DISPOSABLE_EMAIL_DOMAINS);

/** Loose shape check only — real validation is the code actually arriving. */
export function isEmailShaped(email: string): boolean {
  const v = email.trim();
  return v.length >= 6 && v.length <= 254 && /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(v);
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

/**
 * True when the address belongs to a known throwaway-inbox service.
 * Matches the registrable domain and any subdomain of it, since several of
 * these services hand out per-user subdomains.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  if (BLOCKED.has(domain)) return true;
  return DISPOSABLE_EMAIL_DOMAINS.some(d => domain.endsWith("." + d));
}
