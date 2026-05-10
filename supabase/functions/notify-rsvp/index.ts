import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  const { invitation_id, name, status } = await req.json();

  if (!invitation_id || !name || !status) {
    return new Response("Missing fields", { status: 400, headers: CORS });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("title, user_email")
    .eq("id", invitation_id)
    .single();

  if (error || !invitation?.user_email) {
    return new Response("Invitation not found", { status: 404, headers: CORS });
  }

  const { title, user_email } = invitation;
  const emoji = status === "accepted" ? "🎉" : "😔";
  const statusWord = status === "accepted" ? "accepted" : "declined";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invity <notifications@invity.cards>",
      to: [user_email],
      subject: `${emoji} ${name} ${statusWord} your invitation`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;">
          <h2 style="color:#FF4D00;margin:0 0 16px;">${emoji} New RSVP on <em>${title}</em></h2>
          <p style="font-size:16px;margin:0 0 8px;">
            <strong>${name}</strong> has <strong>${statusWord}</strong> your invitation.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;margin:0;">
            Sent by <a href="https://www.invity.cards" style="color:#FF4D00;">Invity</a>
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return new Response("Email send failed", { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
