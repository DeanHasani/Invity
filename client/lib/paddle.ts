import { initializePaddle, type Paddle } from "@paddle/paddle-js";

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
