import { useEffect, useRef, useState } from "react";
import {
  supabase,
  signInWithGoogle,
  sendEmailCode,
  verifyEmailCode,
  cancelEmailSignIn,
  EmailSignInError,
} from "@/lib/supabase";

const LG_FONT = "'Luckiest Guy', cursive";
const RESEND_COOLDOWN_S = 45;

// Supabase's OTP length is a dashboard setting (Authentication → Providers →
// Email → OTP Length), adjustable from 6 to 10. Accept the whole range rather
// than hard-coding one, so changing it there can't leave this form rejecting
// valid codes. The code itself is only ever validated server-side.
const OTP_MIN = 6;
const OTP_MAX = 10;

const MESSAGES: Record<string, string> = {
  invalid_email:    "That doesn't look like an email address.",
  disposable_email: "Throwaway inboxes aren't supported. Use a real address.",
  rate_limited:     "Too many attempts. Wait a minute and try again.",
  bad_code:         "That code isn't right, or it's expired.",
  failed:           "Couldn't send the code. Try again.",
};

const errText = (e: unknown) =>
  MESSAGES[e instanceof EmailSignInError ? e.code : "failed"] ?? MESSAGES.failed;

/**
 * The single sign-in surface: Google plus a mailed 6-digit code.
 * Shared by the in-flow modals and the standalone /signin page so the two can't
 * drift. Renders bare (no backdrop, no card), so the host supplies the chrome.
 */
export function SignInPanel({
  heading = "Sign In to Continue",
  subheading = "Sign in to create your invitation and receive RSVP notifications.",
  onSignedIn,
}: {
  heading?: string;
  subheading?: string;
  onSignedIn?: () => void;
}) {
  const [step, setStep]       = useState<"email" | "code">("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const popupWatch = useRef<ReturnType<typeof setInterval>>();

  // Restore the anonymous session if they navigate away mid-flow
  useEffect(() => () => { if (step === "code") void cancelEmailSignIn(); }, [step]);
  useEffect(() => () => clearInterval(popupWatch.current), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const handleGoogle = async () => {
    setBusy(true); setError(null);
    try {
      const popup = await signInWithGoogle();
      if (!popup) return; // popup blocked, the page is redirecting instead

      /**
       * On success the popup posts back and closes, and onAuthStateChange takes
       * it from there. If it closes WITHOUT a session, nothing else would ever
       * clear this state and the modal sits on "OPENING..." forever. That
       * happens when the user dismisses the Google window, and also when the
       * popup lands on a different origin, which is what a redirect URL that
       * isn't allow-listed for this host looks like from in here.
       */
      clearInterval(popupWatch.current);
      popupWatch.current = setInterval(async () => {
        if (!popup.closed) return;
        clearInterval(popupWatch.current);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || session.user.is_anonymous) {
          setBusy(false);
          setError("Sign-in didn't finish. Try again, or use an email code instead.");
        }
      }, 500);
    } catch {
      setBusy(false);
      setError("Google sign-in failed. Try again.");
    }
  };

  const handleSend = async (resend = false) => {
    setBusy(true); setError(null);
    try {
      await sendEmailCode(email);
      setStep("code");
      setCooldown(RESEND_COOLDOWN_S);
      if (resend) setCode("");
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true); setError(null);
    try {
      await verifyEmailCode(email, code);
      onSignedIn?.();
    } catch (e) {
      setError(errText(e));
      setCode("");
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const backToEmail = async () => {
    await cancelEmailSignIn();
    setStep("email"); setCode(""); setError(null);
  };

  const inputStyle = {
    background: "rgba(0,0,0,0.35)",
    border: "2px solid rgba(255,255,255,0.15)",
    color: "#fff",
    fontFamily: "'Montserrat', sans-serif",
  } as const;

  return (
    <div className="w-full flex flex-col items-center text-center gap-6">
      <div className="space-y-1">
        <p className="text-2xl uppercase" style={{ fontFamily: LG_FONT, color: "var(--accent)" }}>
          {step === "email" ? heading : "Check Your Email"}
        </p>
        <p className="text-xs opacity-50">
          {step === "email"
            ? subheading
            : <>We sent a 6-digit code to <span className="opacity-90">{email}</span>.</>}
        </p>
      </div>

      {step === "email" ? (
        <>
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="flex items-center gap-3 bg-white text-[#1a1a1a] w-full justify-center px-6 py-4 text-sm font-bold uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-60"
            style={{ fontFamily: LG_FONT }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            {busy ? "OPENING..." : "CONTINUE WITH GOOGLE"}
          </button>

          <div className="w-full flex items-center gap-3 text-[10px] uppercase tracking-widest opacity-30">
            <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.3)" }} />
            or
            <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.3)" }} />
          </div>

          <form
            className="w-full flex flex-col gap-3"
            onSubmit={e => { e.preventDefault(); if (!busy && email) void handleSend(); }}
          >
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full px-4 py-3.5 text-sm text-center outline-none focus:border-white/40 transition-colors"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={busy || !email}
              className="w-full py-4 text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
              style={{ fontFamily: LG_FONT, background: "var(--accent-fill)", color: "var(--accent-fg)" }}
            >
              {busy ? "SENDING..." : "EMAIL ME A CODE"}
            </button>
          </form>
        </>
      ) : (
        <form
          className="w-full flex flex-col gap-3"
          onSubmit={e => { e.preventDefault(); if (!busy && code.length >= OTP_MIN) void handleVerify(); }}
        >
          <input
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_MAX}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_MAX)); setError(null); }}
            placeholder={"0".repeat(OTP_MIN)}
            className="w-full px-4 py-4 text-2xl text-center outline-none focus:border-white/40 transition-colors"
            style={{ ...inputStyle, fontFamily: LG_FONT, letterSpacing: "0.3em", textIndent: "0.3em" }}
          />
          <button
            type="submit"
            disabled={busy || code.length < OTP_MIN}
            className="w-full py-4 text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
            style={{ fontFamily: LG_FONT, background: "var(--accent-fill)", color: "var(--accent-fg)" }}
          >
            {busy ? "CHECKING..." : "VERIFY & CONTINUE"}
          </button>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider opacity-50">
            <button type="button" onClick={backToEmail} className="hover:opacity-100 transition-opacity">
              ← Change email
            </button>
            <button
              type="button"
              onClick={() => void handleSend(true)}
              disabled={busy || cooldown > 0}
              className="hover:opacity-100 transition-opacity disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="text-[11px] leading-snug" style={{ color: "rgba(255,80,80,0.9)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
