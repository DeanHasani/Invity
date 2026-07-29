// Lets a host delete one of their own invitation links immediately, from the
// guest-list page. Writes are service-role only (see 0003_rls_lockdown.sql), and
// rsvps has no FK to invitations, so a client-side delete would both be blocked
// by RLS and strand the RSVP rows. Hence an edge function.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (authError || !user?.email || user.is_anonymous) return json({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_input" }, 400); }

  const id = typeof body?.id === "string" ? body.id.trim().slice(0, 40) : "";
  if (!id) return json({ error: "invalid_input" }, 400);

  // Ownership check against the caller's own email — the service-role client
  // bypasses RLS, so this is the only thing standing between a user and someone
  // else's invitation.
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, user_email")
    .eq("id", id)
    .maybeSingle();

  if (!invitation) return json({ error: "not_found" }, 404);
  if (invitation.user_email !== user.email) return json({ error: "forbidden" }, 403);

  // RSVPs first: there's no FK cascade, so deleting the invitation first would
  // leave these rows permanently orphaned.
  const { error: rsvpError } = await supabase.from("rsvps").delete().eq("invitation_id", id);
  if (rsvpError) {
    console.error("delete-invitation: rsvp delete failed:", rsvpError);
    return json({ error: "delete_failed" }, 500);
  }

  const { error: invError } = await supabase.from("invitations").delete().eq("id", id);
  if (invError) {
    console.error("delete-invitation: invitation delete failed:", invError);
    return json({ error: "delete_failed" }, 500);
  }

  return json({ ok: true, id });
});
