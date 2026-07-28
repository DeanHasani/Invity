import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { supabase } from "@/lib/supabase";

let paddlePromise: Promise<Paddle | undefined> | null = null;
let onCheckoutCompleted: (() => void) | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment: (import.meta.env.VITE_PADDLE_ENV as "sandbox" | "production") ?? "sandbox",
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          onCheckoutCompleted?.();
        }
      },
    }).catch((err) => {
      paddlePromise = null; // allow retry (e.g. after disabling an ad blocker)
      throw err;
    });
  }
  return paddlePromise;
}

export type BillingCycle = "month" | "year";

/**
 * Opens the Paddle overlay checkout for the Pro plan.
 * `onCompleted` fires on Paddle's checkout.completed event — the subscription
 * row lands via webhook shortly after, so callers should poll (useSubscription).
 * Throws if Paddle.js can't load (commonly ad blockers).
 */
export async function openProCheckout(
  cycle: BillingCycle,
  user: { id: string; email: string },
  onCompleted: () => void,
): Promise<void> {
  const paddle = await getPaddle();
  if (!paddle) throw new Error("paddle_unavailable");

  onCheckoutCompleted = onCompleted;

  paddle.Checkout.open({
    items: [
      {
        priceId:
          cycle === "year"
            ? (import.meta.env.VITE_PADDLE_PRICE_YEARLY as string)
            : (import.meta.env.VITE_PADDLE_PRICE_MONTHLY as string),
        quantity: 1,
      },
    ],
    customer: { email: user.email },
    // supabase_user_id is how the paddle-webhook edge function links the
    // subscription back to this account — never remove it.
    customData: { supabase_user_id: user.id, user_email: user.email },
    settings: { displayMode: "overlay", theme: "dark" },
  });
}

/** Human-readable reason for a failed portal open, for toasting to the user. */
const PORTAL_MESSAGES: Record<string, string> = {
  no_subscription: "We couldn't find a subscription on this account.",
  no_customer_id:  "Your subscription is still finishing setup — try again in a minute.",
  portal_failed:   "Paddle couldn't open the billing portal. Please email cardsinvity@gmail.com.",
};

/**
 * Opens the Paddle customer portal for the signed-in user.
 * Returns a message to show on failure, or null on success.
 */
export async function openBillingPortal(): Promise<string | null> {
  // Opened synchronously, inside the click handler. Browsers (iOS Safari in
  // particular) block window.open once an await has broken the user-gesture
  // chain — which presents as the button doing nothing at all, with no error.
  const win = window.open("", "_blank");
  if (win) win.opener = null;

  const fail = (reason: string, detail?: unknown) => {
    console.error(`[billing-portal] ${reason}`, detail ?? "");
    win?.close();
    return PORTAL_MESSAGES[reason] ?? "Couldn't open the billing portal. Try again.";
  };

  try {
    const { data, error } = await supabase.functions.invoke("paddle-portal", { body: {} });

    if (error) {
      // supabase-js buries the function's JSON response inside error.context
      let body: any = null;
      try { body = await (error as any)?.context?.json?.(); } catch { /* not JSON */ }
      return fail(body?.error ?? "invoke_failed", { error, body });
    }
    if (!data?.url) return fail("no_url", data);

    // Popup blocked despite the synchronous open → fall back to the same tab
    // rather than silently doing nothing.
    if (win) win.location.href = data.url;
    else window.location.href = data.url;
    return null;
  } catch (e) {
    return fail("exception", e);
  }
}
