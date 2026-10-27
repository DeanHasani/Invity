import { createClient } from "@supabase/supabase-js";
import { isDisposableEmail, isEmailShaped } from "@shared/disposableEmail";

// PKCE, not the implicit default: implicit accepts any #access_token in the URL
// on any page, so a crafted link could swap a visitor into someone else's
// account. PKCE only completes a sign-in this browser started.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { flowType: "pkce" } },
);

/**
 * Ensure the visitor has at least an anonymous session for PostgREST access.
 * Creators replace this with a real session when they sign in.
 * Skip on the OAuth callback page, since a real session is already being set.
 */
export async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  const isCallback = new URLSearchParams(window.location.search).has("code");
  if (!session && !isCallback) await supabase.auth.signInAnonymously();
}

ensureAnonSession();

/**
 * Returns the popup so the caller can tell whether it closed without signing
 * in, whether dismissed by the user or landed on another origin because the redirect
 * URL isn't allow-listed for this host. Null means we fell back to a full-page
 * redirect and the page is already navigating away.
 */
export async function signInWithGoogle(): Promise<Window | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) return null;

  const popup = window.open(data.url, "google-oauth", "width=520,height=650,left=200,top=100");
  // If popup blocked by browser, fall back to redirect
  if (!popup) { window.location.href = data.url; return null; }
  return popup;
}

/** Thrown with a stable `code` so the UI can pick the message. */
export class EmailSignInError extends Error {
  constructor(public code: "invalid_email" | "disposable_email" | "rate_limited" | "bad_code" | "failed") {
    super(code);
  }
}

/**
 * Step 1: mail a 6-digit code.
 *
 * Requires the Supabase "Magic Link" and "Confirm signup" templates to send
 * {{ .Token }} rather than {{ .ConfirmationURL }}; otherwise this sends a link
 * and verifyEmailCode has nothing to verify.
 */
export async function sendEmailCode(email: string) {
  const clean = email.trim().toLowerCase();
  if (!isEmailShaped(clean)) throw new EmailSignInError("invalid_email");
  if (isDisposableEmail(clean)) throw new EmailSignInError("disposable_email");

  // Every visitor is signed in anonymously on load. That session has to go
  // first, or the OTP resolves against the anonymous user instead of creating
  // (or finding) the real one. cancelEmailSignIn restores it if they bail.
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.is_anonymous) await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true },
  });
  if (error) {
    throw new EmailSignInError(error.status === 429 ? "rate_limited" : "failed");
  }
}

/** Step 2: exchange the code for a real session. */
export async function verifyEmailCode(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw new EmailSignInError(error.status === 429 ? "rate_limited" : "bad_code");
  return data.session;
}

/**
 * Abandoning the code step leaves the visitor with no session at all, since
 * sendEmailCode cleared the anonymous one. Put it back.
 */
export async function cancelEmailSignIn() {
  await ensureAnonSession();
}

export async function signOut() {
  await supabase.auth.signOut();
}
