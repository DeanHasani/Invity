-- 0007_rsvp_note.sql  (non-breaking — safe to apply while live)
--
-- Guests can leave an optional note with their RSVP ("bringing a plus one",
-- "running late, save me a slice"). Nullable with no default: an absent note
-- and an empty one are the same thing, and the host's email simply omits the
-- section when there isn't one.
--
-- No RLS change needed. The column rides along on the existing rsvps policy
-- ("host reads rsvps of own invitations"), and writes stay service-role only
-- through the notify-rsvp edge function.

alter table public.rsvps add column if not exists note text;
