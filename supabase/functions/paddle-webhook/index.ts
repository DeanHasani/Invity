// Paddle → Supabase subscription state sync.
// Deployed with verify_jwt = false (see supabase/config.toml), so authentication
// is the Paddle-Signature HMAC, verified against the raw request body.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyPaddleSignature } from "../_shared/paddle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Raw body FIRST: the signature covers the exact bytes Paddle sent
  const rawBody = await req.text();
  const valid = await verifyPaddleSignature(
    rawBody,
    req.headers.get("Paddle-Signature"),
    PADDLE_WEBHOOK_SECRET,
  );
  if (!valid) return json({ error: "invalid_signature" }, 401);

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "invalid_body" }, 400); }

  const eventType: string = event?.event_type ?? "";
  if (!SUBSCRIPTION_EVENTS.has(eventType)) return json({ ignored: true });

  const data = event.data ?? {};
  const userId: string | undefined = data.custom_data?.supabase_user_id;
  const occurredAt: string = event.occurred_at ?? new Date().toISOString();

  if (!userId) {
    // Subscription not created through our checkout (dashboard/simulator).
    // Return 200, because a 4xx/5xx would make Paddle retry forever.
    console.error(`paddle-webhook: ${eventType} for ${data.id} has no supabase_user_id custom_data, ignored`);
    return json({ ignored: true, reason: "missing_custom_data" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("paddle_subscription_id, last_event_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const stale =
      existing.last_event_at &&
      new Date(occurredAt).getTime() <= new Date(existing.last_event_at).getTime();
    if (existing.paddle_subscription_id === data.id && stale) {
      return json({ ignored: true, reason: "out_of_order" });
    }
    // A terminal event for a *previous* subscription after the user re-subscribed
    // must not clobber the newer subscription's row.
    if (
      existing.paddle_subscription_id !== data.id &&
      (eventType === "subscription.canceled" || eventType === "subscription.paused") &&
      stale
    ) {
      return json({ ignored: true, reason: "stale_replaced_subscription" });
    }
  }

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id:                userId,
      user_email:             data.custom_data?.user_email ?? "",
      paddle_subscription_id: data.id,
      paddle_customer_id:     data.customer_id,
      status:                 data.status,
      price_id:               data.items?.[0]?.price?.id ?? null,
      billing_cycle:          data.billing_cycle?.interval ?? null,
      current_period_end:     data.current_billing_period?.ends_at ?? null,
      scheduled_change:       data.scheduled_change ?? null,
      last_event_at:          occurredAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("paddle-webhook upsert failed:", error);
    // Detail is safe to return: only Paddle (signature-verified) sees it,
    // and it makes failed-delivery logs self-explanatory.
    return json({ error: "upsert_failed", code: error.code, detail: error.message }, 500); // Paddle will retry
  }

  return json({ ok: true });
});
