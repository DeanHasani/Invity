import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Hard ceiling per invitation. viewer_token is chosen by the caller, so dedupe
// alone can't stop one person minting fake guests (and host emails) forever.
// Generous enough for a big wedding.
const MAX_RSVPS_PER_INVITATION = 500;

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

/**
 * Guest-supplied strings land in an HTML email body, so they have to be
 * escaped. The note is free text and by far the likeliest to contain markup,
 * but the name and the event title go through the same path and were being
 * interpolated raw.
 */
const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const invitation_id = typeof body.invitation_id === "string" ? body.invitation_id.slice(0, 40) : "";
  // Control characters stripped so the name can't break the email subject or the CSV export
  const name = typeof body.name === "string" ? body.name.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 80) : "";
  const status = body.status === "accepted" || body.status === "declined" ? body.status : "";
  const viewer_token =
    typeof body.viewer_token === "string" ? body.viewer_token.trim().slice(0, 80) : "";
  // Optional, guests can skip it. Empty string and absent mean the same thing.
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  // viewer_token is required: without it there is no row and no dedupe, so
  // every request would be a free email to the host.
  if (!invitation_id || !name || !status || !viewer_token) {
    return json({ error: "missing_fields" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, title, user_email, expires_at")
    .eq("id", invitation_id)
    .single();

  if (error || !invitation) {
    return json({ error: "not_found" }, 404);
  }

  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
    return json({ error: "expired" }, 410);
  }

  // shortcut: count-then-insert can overshoot the cap by a few under concurrency; fine for an abuse ceiling.
  const { count } = await supabase
    .from("rsvps")
    .select("id", { count: "exact", head: true })
    .eq("invitation_id", invitation_id);
  if ((count ?? 0) >= MAX_RSVPS_PER_INVITATION) {
    return json({ error: "too_many_rsvps" }, 429);
  }

  const { error: insertError } = await supabase
    .from("rsvps")
    .insert({ invitation_id, name, status, viewer_token, note: note || null });

  if (insertError) {
    // 23505 = unique violation → this device already responded; don't re-email
    if (insertError.code === "23505") {
      return json({ ok: true, duplicate: true });
    }
    console.error("rsvp insert failed:", insertError);
    return json({ error: "rsvp_failed" }, 500);
  }

  if (!invitation.user_email) {
    // Legacy anonymous invitation: RSVP recorded, nobody to notify
    return json({ ok: true });
  }

  const { title, user_email } = invitation;
  const emoji = status === "accepted" ? "🎉" : "😔";
  const statusWord = status === "accepted" ? "accepted" : "declined";
  const heading =
    status === "accepted"
      ? `Looks like somebody is in for the <em>${esc(title)}</em> event!`
      : `Somebody can't make it to the <em>${esc(title)}</em> event.`;

  const noteBlock = note
    ? `
          <p style="font-size:14px;margin:16px 0 6px;color:#666;">They left a note:</p>
          <blockquote style="margin:0;padding:12px 16px;background:#faf7f5;border-left:3px solid #F05A28;font-size:15px;line-height:1.5;color:#333;">
            ${esc(note)}
          </blockquote>`
    : "";

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
          <h2 style="color:#F05A28;margin:0 0 16px;">${emoji} ${heading}</h2>
          <p style="font-size:16px;margin:0 0 8px;">
            <strong>${esc(name)}</strong> has <strong>${statusWord}</strong> your invitation.
          </p>${noteBlock}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="color:#999;font-size:12px;margin:0;">
            Sent by <a href="https://www.invity.cards" style="color:#F05A28;">Invity</a>
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
    // RSVP row is already stored, so don't fail the guest's action over email
    return json({ ok: true, email_sent: false });
  }

  return json({ ok: true });
});
