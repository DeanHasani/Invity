import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { nanoid } from "https://esm.sh/nanoid@5";
import {
  ALL_DESIGN_IDS, ALL_EFFECT_IDS, PRO_DESIGN_IDS, PRO_EFFECT_IDS,
  FREE_DAILY_LIMIT, PRO_DAILY_ABUSE_CAP, FREE_EXPIRY_MS,
  isProStatus, resolveExpiryMs,
} from "../_shared/premium.ts";
import { paddleConfigured, paddleFetch } from "../_shared/paddle.ts";
import { isDisposableEmail } from "../_shared/disposableEmail.ts";

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
  // Anonymous sessions carry valid JWTs, but creation requires a real account
  if (authError || !user || user.is_anonymous || !user.email) {
    return json({ error: "unauthorized" }, 401);
  }
  const userEmail = user.email;

  // The client blocks these at sign-up too, but that check is bypassable,
  // this is the one that counts. Email codes made throwaway inboxes a cheap
  // way to reset the daily cap; Google sign-in never had that problem.
  if (isDisposableEmail(userEmail)) {
    return json({ error: "disposable_email" }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_input" }, 400); }

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const title     = str(body.title, 100);
  const message   = str(body.message, 1000);
  const designId  = str(body.designId, 40);
  const effectId  = str(body.effectId, 40);
  const fontId    = str(body.fontId, 40) || null;
  const fontColor = str(body.fontColor, 20) || null;
  const date      = str(body.date, 60) || null;
  const location  = str(body.location, 200) || null;
  const creatorId = str(body.creatorId, 80) || null;
  const expiryId  = str(body.expiryId, 10) || null;

  if (
    !title || !message ||
    !(ALL_DESIGN_IDS as readonly string[]).includes(designId) ||
    !(ALL_EFFECT_IDS as readonly string[]).includes(effectId)
  ) {
    return json({ error: "invalid_input" }, 400);
  }

  // ── Resolve plan ────────────────────────────────────────────────────────────
  // Keyed on email, not user_id, because Google and email-code sign-ins for the same
  // address can land on different auth.users rows, and a paying customer must
  // not lose Pro by switching method. Mirrors useSubscription on the client.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_email", userEmail)
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  let isPro = isProStatus(sub?.status);

  // Self-heal: if the row claims Pro but the billing period ended >3 days ago,
  // a terminal webhook may have been missed, so re-check with Paddle directly.
  if (
    isPro && paddleConfigured() && sub?.current_period_end &&
    new Date(sub.current_period_end).getTime() < Date.now() - 3 * 24 * 3_600_000
  ) {
    try {
      const res = await paddleFetch(`/subscriptions/${sub.paddle_subscription_id}`);
      if (res.ok) {
        const { data } = await res.json();
        await supabase
          .from("subscriptions")
          .update({
            status: data.status,
            current_period_end: data.current_billing_period?.ends_at ?? null,
            scheduled_change: data.scheduled_change ?? null,
          })
          .eq("user_id", sub.user_id);
        isPro = isProStatus(data.status);
      }
    } catch (e) {
      console.error("paddle self-heal failed:", e);
      // fail open: the stored status stands
    }
  }

  // ── Premium gating ──────────────────────────────────────────────────────────
  if (!isPro && (PRO_DESIGN_IDS.includes(designId) || PRO_EFFECT_IDS.includes(effectId))) {
    return json({ error: "premium_required" }, 403);
  }

  // ── Rate limit (same three counts the client used to run, now trusted) ──────
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const limit = isPro ? PRO_DAILY_ABUSE_CAP : FREE_DAILY_LIMIT;

  const counts = await Promise.all([
    supabase.from("creation_log").select("id", { count: "exact", head: true })
      .eq("user_email", userEmail).gte("created_at", since24h),
    supabase.from("invitations").select("id", { count: "exact", head: true })
      .eq("user_email", userEmail).gte("created_at", since24h),
    creatorId
      ? supabase.from("creation_log").select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId).gte("created_at", since24h)
      : Promise.resolve({ count: 0 }),
  ]);
  // Device count only limits free users, since a Pro user shares no cap with other
  // accounts on the same device beyond the abuse cap on their own email.
  const emailCount = Math.max(counts[0].count ?? 0, counts[1].count ?? 0);
  const deviceCount = counts[2].count ?? 0;
  if (emailCount >= limit || (!isPro && deviceCount >= FREE_DAILY_LIMIT)) {
    return json({ error: "rate_limited" }, 429);
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  const id = nanoid(10);
  // The builder's dropdown is UI only. resolveExpiryMs clamps to what the plan
  // allows, so a free account sending "30d" still gets the free lifetime.
  const expiresAt = new Date(Date.now() + resolveExpiryMs(expiryId, isPro)).toISOString();

  const { data: row, error: insertError } = await supabase
    .from("invitations")
    .insert({
      id,
      title,
      message,
      design_id:  designId,
      effect_id:  effectId,
      font_id:    fontId,
      font_color: fontColor,
      date,
      location,
      creator_id: creatorId,
      user_email: userEmail,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError || !row) {
    console.error("insert failed:", insertError);
    return json({ error: "create_failed" }, 500);
  }

  // was_pro is recorded here so the nightly rollup can split free/pro accurately.
  // Joining to subscriptions later would report today's plan, not this one.
  await supabase.from("creation_log").insert({
    user_email: userEmail,
    creator_id: creatorId,
    was_pro:    isPro,
  });

  return json({
    invitation: {
      id:        row.id,
      title:     row.title,
      message:   row.message,
      designId:  row.design_id,
      effectId:  row.effect_id,
      fontId:    row.font_id    ?? undefined,
      fontColor: row.font_color ?? undefined,
      date:      row.date       ?? undefined,
      location:  row.location   ?? undefined,
    },
    expiresAt,
    plan: isPro ? "pro" : "free",
  });
});
