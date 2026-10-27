import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paddleConfigured, paddleFetch } from "../_shared/paddle.ts";

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
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user || user.is_anonymous || !user.email) {
    return new Response("Unauthorized", { status: 401, headers: CORS });
  }

  // Pro follows the email (see 0006), and Google and email-code sign-ins can be
  // different auth users for one address, so match the row on either key.
  const ownSubs = `user_id.eq.${user.id},user_email.eq."${user.email}"`;

  // Cancel every active Paddle subscription BEFORE deleting anything, because a
  // deleted account must never keep getting charged.
  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("paddle_subscription_id, status")
    .or(ownSubs);
  if (subsError) {
    console.error("delete-account: subscription lookup failed:", subsError);
    return json({ error: "delete_failed" }, 500);
  }

  for (const sub of subs ?? []) {
    if (sub.status === "canceled") continue;
    if (!paddleConfigured()) {
      console.error("delete-account: subscription exists but Paddle is not configured");
      return json({ error: "subscription_cancel_failed" }, 502);
    }
    const res = await paddleFetch(`/subscriptions/${sub.paddle_subscription_id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ effective_from: "immediately" }),
    });
    // 404 = already gone on Paddle's side; anything else must abort the deletion
    if (!res.ok && res.status !== 404) {
      console.error("delete-account: paddle cancel failed:", res.status, await res.text());
      return json({ error: "subscription_cancel_failed" }, 502);
    }
  }

  const results = await Promise.all([
    supabase.from("invitations").delete().eq("user_email", user.email),
    supabase.from("creation_log").delete().eq("user_email", user.email),
    supabase.from("subscriptions").delete().or(ownSubs),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("delete-account: row delete failed:", failed.error);
    return json({ error: "delete_failed" }, 500);
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("delete-account: auth delete failed:", deleteUserError);
    return json({ error: "delete_failed" }, 500);
  }

  return json({ ok: true });
});
