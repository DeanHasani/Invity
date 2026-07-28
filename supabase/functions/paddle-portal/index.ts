// Creates a Paddle customer-portal session for the signed-in user so they can
// manage/cancel their subscription without an email-OTP login.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paddleFetch, PADDLE_ENV, PADDLE_API_BASE, PADDLE_ENV_RECOGNISED } from "../_shared/paddle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authError } =
    await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user || user.is_anonymous) return json({ error: "unauthorized" }, 401);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub) return json({ error: "no_subscription" }, 404);

  // Without a customer id the request below would POST to /customers/null/...,
  // which returns a confusing 404 that looks identical to an environment mismatch.
  if (!sub.paddle_customer_id) {
    console.error(`portal: user ${user.id} has a subscription row with no paddle_customer_id`);
    return json({ error: "no_customer_id" }, 409);
  }

  const res = await paddleFetch(`/customers/${sub.paddle_customer_id}/portal-sessions`, {
    method: "POST",
    body: JSON.stringify({ subscription_ids: [sub.paddle_subscription_id] }),
  });

  if (!res.ok) {
    const raw = await res.text();
    console.error(`portal session failed [${PADDLE_ENV} ${PADDLE_API_BASE}] ${res.status}:`, raw);

    // Paddle's error body carries the actual reason (e.g. forbidden vs
    // entity_not_found), which is the difference between a permission problem
    // and the customer id belonging to a different Paddle environment.
    let paddleCode: string | null = null;
    let paddleDetail: string | null = null;
    try {
      const parsed = JSON.parse(raw);
      paddleCode = parsed?.error?.code ?? null;
      paddleDetail = parsed?.error?.detail ?? null;
    } catch { /* non-JSON body */ }

    return json(
      {
        error: "portal_failed",
        paddle_status: res.status,
        paddle_env: PADDLE_ENV,
        paddle_env_recognised: PADDLE_ENV_RECOGNISED,
        paddle_code: paddleCode,
        paddle_detail: paddleDetail,
        // Confirms which account/environment the stored ids came from.
        customer_id: sub.paddle_customer_id,
      },
      502,
    );
  }

  const { data } = await res.json();
  return json({ url: data?.urls?.general?.overview ?? null });
});
